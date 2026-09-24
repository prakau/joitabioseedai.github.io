import { test } from "node:test";
import assert from "node:assert/strict";
import { answerFarmQuestion } from "../src/lib/farm-ai";
import { inferCrop, searchCrops } from "../src/services/semanticSearch";
import { analyzeSoil, emptySoil } from "../src/lib/soil";
import { validateLayout, defaultLayout } from "../src/lib/plot";
import { analyzeAudio } from "../src/lib/audio";
import { filterMarketRows } from "../src/services/publicApis";
import { answerLanguages, answerLanguage, matchingVoice, speechChunks, resolveAnswerLanguage } from "../src/lib/languages";
test("Roman Hindi overrides a stale English preference without changing other languages", () => {
  for (const question of ["tamatar ke patte peele ho rahe hain kya karu", "pani kab dena chahiye", "hindi me batao"]) {
    assert.equal(resolveAnswerLanguage("English", question), "Hindi");
  }
  assert.equal(resolveAnswerLanguage("English", "When should I water tomatoes?"), "English");
  assert.equal(resolveAnswerLanguage("Punjabi", "pani kab dena chahiye"), "Punjabi");
  assert.equal(resolveAnswerLanguage("Hindi", "Please reply in English"), "English");
});
import { areaInMetres, calculateWater, calculateSeed, parseMoney, ledgerTotals } from "../src/lib/farm-tools";
import { calendarFile, isDay, localDay, planStatus, upcomingPlans, validatePlan, type Plan } from "../src/lib/planning";
import ICAL from "ical.js";
test("area and seed calculations convert units without prescribing a rate", () => {
  assert.equal(areaInMetres("1", "Hectares"), 10000);
  assert.equal(areaInMetres("1", "Acres"), 4046.8564224);
  assert.equal(calculateSeed(areaInMetres("2", "Acres"), "20", "kg/acre"), 40);
  assert.equal(calculateSeed(5000, "100", "kg/ha"), 50);
  for (const value of ["", "0", "-3", "NaN", "Infinity"]) assert.throws(() => areaInMetres(value, "Acres"));
  assert.throws(() => calculateSeed(5000, "", "kg/ha"));
});
test("water volume and pump duration preserve millimetres and litres units", () => {
  assert.deepEqual(calculateWater(10000, "25", "500"), {litres:250000, minutes:500});
  assert.deepEqual(calculateWater(1000, "10", ""), {litres:10000, minutes:null});
  for (const flow of ["0", "-2", "NaN"]) assert.throws(() => calculateWater(1000, "10", flow));
  assert.throws(() => calculateWater(1000, "1001", ""));
});
test("ledger arithmetic uses integer paise and rejects invalid money", () => {
  assert.equal(parseMoney("0.10") + parseMoney("0.20"), 30);
  assert.equal(parseMoney(".50"), 50);
  for (const value of ["", "0", "-3", "0.001", "100000001", "1e6", "NaN"]) assert.throws(() => parseMoney(value));
  const base={id:"1",date:"2026-09-15",crop:"Wheat",note:"",category:"Seed"};
  assert.deepEqual(ledgerTotals([{...base,type:"income",amountPaise:20000},{...base,id:"2",type:"expense",amountPaise:12550}]),{income:20000,expenses:12550,net:7450});
});
test("task date handling respects local dates, leap years, and overdue states", () => {
  assert.equal(localDay(new Date(2026,8,15,0,1)), "2026-09-15");
  assert.equal(isDay("2026-02-30"),false); assert.equal(isDay("2028-02-29"),true);
  const base: Plan={id:"1",crop:"Wheat",task:"Inspect irrigation",sowing:"",due:"2026-09-15",done:false};
  assert.equal(planStatus(base,"2026-09-15"),"Today");
  assert.equal(planStatus({...base,due:"2026-09-14"},"2026-09-15"),"Overdue");
  assert.equal(planStatus({...base,done:true},"2026-09-16"),"Completed");
  assert.equal(upcomingPlans([{...base,id:"2",due:"2026-10-01"},base,{...base,id:"3",done:true}])[0].id,"1");
  assert.throws(()=>validatePlan({...base,task:"   "}));
  assert.throws(()=>validatePlan({...base,due:"2026-02-30"}));
});
test("calendar files round-trip native titles, unique IDs, and all-day year boundaries", () => {
  const base: Plan={id:"record-1",crop:"Mustard",task:"सरसों के खेत की जांच करें",sowing:"",due:"2028-02-29",done:false};
  const calendar = new ICAL.Component(ICAL.parse(calendarFile([base,{...base,id:"record-2",due:"2026-12-31",task:"Inspect; \nBEGIN:VEVENT\n rows"}])));
  const events=calendar.getAllSubcomponents("vevent");
  assert.equal(events.length,2);
  assert.equal(events[0].getFirstPropertyValue("summary"),`Mustard: ${base.task}`);
  assert.equal(String(events[0].getFirstPropertyValue("dtstart")),"2028-02-29");
  assert.equal(String(events[0].getFirstPropertyValue("dtend")),"2028-03-01");
  assert.equal(String(events[1].getFirstPropertyValue("dtend")),"2027-01-01");
  assert.equal(events[0].getFirstPropertyValue("uid"),"record-1@farmassist.joitabioseedai.com");
  assert.equal(events[0].getFirstPropertyValue("class"),"PRIVATE");
  assert.throws(()=>calendarFile([]));
});
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
