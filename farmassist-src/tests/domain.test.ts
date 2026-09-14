import { test } from "node:test";
import assert from "node:assert/strict";
import { answerFarmQuestion } from "../src/lib/farm-ai";
import { inferCrop, searchCrops } from "../src/services/semanticSearch";
import { analyzeSoil, emptySoil } from "../src/lib/soil";
import { validateLayout, defaultLayout } from "../src/lib/plot";
import { analyzeAudio } from "../src/lib/audio";
import { filterMarketRows } from "../src/services/publicApis";
import { answerLanguages, answerLanguage, matchingVoice, speechChunks } from "../src/lib/languages";
test("all 14 answer languages have distinct names and usable locales", () => {
  assert.equal(answerLanguages.length, 14);
  assert.equal(new Set(answerLanguages.map(language => language.name)).size, 14);
  for (const language of answerLanguages) {
    assert.doesNotThrow(() => new Intl.Locale(language.locale));
    assert.equal(answerLanguage(language.name), language);
  }
  assert.equal(answerLanguage("invalid").name, "English");
});
test("native crop search keeps vowel marks and does not match unrelated words", () => {
  for (const word of ["टमाटर", "ਟਮਾਟਰ", "ટામેટા", "টমেটো", "தக்காளி", "టమాటా", "ಟೊಮೇಟೊ", "തക്കാളി", "ٹماٹر"]) {
    assert.equal(searchCrops(word)[0]?.crop, "Tomato", word);
    assert.equal(inferCrop(`${word} ?`, "Mustard"), "Tomato", word);
  }
  assert.equal(inferCrop("सरसों में क्या देखें?"), "Mustard");
  assert.equal(searchCrops("கணினி").length, 0);
});
test("speech selects matching language only and uses local voices when offline", () => {
  const voices = [{lang:"en-US", localService:true}, {lang:"hi-IN",localService:false}];
  assert.equal(matchingVoice(voices, "en-IN"), voices[0]);
  assert.equal(matchingVoice(voices, "hi-IN"), voices[1]);
  assert.equal(matchingVoice(voices, "pa-IN"), undefined);
  assert.equal(matchingVoice(voices, "hi-IN", true), undefined);
});
test("speech chunking preserves native-language text and avoids long utterances", () => {
  const text = "टमाटर की पत्तियों की जांच करें। ".repeat(40).trim();
  const chunks = speechChunks(text);
  assert.equal(chunks.join(" "), text);
  assert(chunks.every(chunk => chunk.length < 170));
  assert.deepEqual(speechChunks(""), []);
});
test("question crop overrides unrelated selected crop", () => {
  assert.equal(inferCrop("Tomato leaves are yellowing and curling", "Mustard"), "Tomato");
  const answer = answerFarmQuestion("Tomato leaves are yellowing and curling", "Mustard");
  assert.match(answer, /whiteflies/); assert.doesNotMatch(answer, /sow |harvest/);
});
test("offline answers match the requested topic and do not invent prices", () => {
  assert.match(answerFarmQuestion("How to irrigate wheat at grain filling?"), /crown root initiation/i);
  assert.match(answerFarmQuestion("When to sow mustard?"), /October/);
  assert.match(answerFarmQuestion("What is today's onion price?"), /cannot quote/);
  assert.match(answerFarmQuestion("What is tomorrow's weather?"), /cannot tell/);
  assert.match(answerFarmQuestion("Hi"), /Hello/);
  assert.match(answerFarmQuestion("How do I repair my tractor transmission?"), /do not have a reliable/);
});
test("search ranks crop aliases and rejects no-match queries", () => {
  assert.equal(searchCrops("sarson")[0].crop, "Mustard");
  assert.equal(searchCrops("onion irrigation")[0].crop, "Onion");
  assert.equal(searchCrops("zzzzzzz").length, 0);
  assert.equal(inferCrop("bottle gourd"), "Bottle gourd");
});
test("plot dimensions cannot be zero, negative, NaN, or fractional rows", () => {
  assert.equal(validateLayout(defaultLayout), "");
  for (const bad of [{ length: 0 }, { width: -3 }, { rows: 2.5 }, { rows: 101 }, { length: NaN }]) assert.notEqual(validateLayout({ ...defaultLayout, ...bad }), "");
});
test("soil preserves missing readings and validates entered units/ranges", () => {
  assert.throws(() => analyzeSoil(emptySoil), /at least one/);
  assert.throws(() => analyzeSoil({ ...emptySoil, ph: "15" }), /between/);
  assert.throws(() => analyzeSoil({ ...emptySoil, n: "-1" }), /between/);
  const report = analyzeSoil({ ...emptySoil, ph: "8.2", oc: "0.4" });
  assert.equal(report.length, 2); assert.match(report[0].interpretation, /Alkaline/); assert.match(report[1].interpretation, /Low/);
});
test("silent audio is zero activity and short recordings are rejected", () => {
  const silence = analyzeAudio(new Float32Array(16000 * 4), 16000);
  assert.equal(silence.activity, 0); assert.equal(silence.silence, 100);
  const tone = Float32Array.from({ length: 64000 }, (_, i) => 0.2 * Math.sin(2 * Math.PI * 440 * i / 16000));
  assert.equal(analyzeAudio(tone, 16000).activity, 100);
  assert.throws(() => analyzeAudio(new Float32Array(100), 16000), /3 and 120/);
});
test("all market filters apply including market and arrival date", () => {
  const row = { commodity: "Onion", state: "Haryana", district: "Hisar", market: "Hisar", arrival_date: "14/09/2026", modal_price: "1000", min_price: "900", max_price: "1100" };
  const filters = { commodity: "onion", state: "haryana", district: "Hisar", market: "Hisar", date: "2026-09-14" };
  assert.equal(filterMarketRows([row], filters).length, 1);
  assert.equal(filterMarketRows([row], { ...filters, market: "Karnal" }).length, 0);
  assert.equal(filterMarketRows([row], { ...filters, date: "2026-09-13" }).length, 0);
});
