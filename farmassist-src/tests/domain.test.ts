import { test } from "node:test";
import assert from "node:assert/strict";
import { answerFarmQuestion } from "../src/lib/farm-ai";
import { inferCrop, searchCrops } from "../src/services/semanticSearch";
import { analyzeSoil, emptySoil } from "../src/lib/soil";
import { validateLayout, defaultLayout } from "../src/lib/plot";
import { analyzeAudio } from "../src/lib/audio";
import { filterMarketRows } from "../src/services/publicApis";
import { canonicalMarketFilters, normaliseMarketRows, marketPrice, marketDay, comparablePrice, quantityKg, harvestValue, viewMarketRows, marketSaleDraft, parseMarketDraft, marketCsv, validMarketSearch, type MarketRow } from "../src/lib/market";
const marketFixture: MarketRow = { commodity: "Onion", variety: "Local", state: "Haryana", district: "Hisar", market: "Hisar", arrival_date: "20/10/2026", min_price: "1500", modal_price: "1800", max_price: "2200" };
test("common Hindi crop/state searches map to feed names without guessing unknown places", () => {
  assert.deepEqual(canonicalMarketFilters({commodity:" प्याज ",state:"हरियाणा",district:" Hisar ",market:"",date:""}),{commodity:"Onion",state:"Haryana",district:"Hisar",market:"",date:""});
  assert.equal(canonicalMarketFilters({commodity:"My local crop",state:"My state",district:"",market:"",date:""}).commodity,"My local crop");
});
test("market records are bounded, deduplicated and stripped of unknown payload fields", () => {
  assert.deepEqual(normaliseMarketRows([{...marketFixture, secret:"not-retained"}, marketFixture, null, {...marketFixture, market:{}}, {...marketFixture, modal_price:[]}]), [marketFixture]);
  assert.throws(()=>normaliseMarketRows(Array(201).fill(marketFixture)));
  assert.throws(()=>normaliseMarketRows({records:[]}));
  for (const value of ["", "0", "-1", "Infinity", "1e3", {}, "1.001"]) assert.equal(marketPrice(value), null);
  assert.equal(marketPrice("1800.50"),1800.5);
});
test("market dates and inconsistent prices cannot silently become usable sale references", () => {
  assert.equal(marketDay("31/02/2026"),null); assert.equal(marketDay("29/02/2024"),"2024-02-29");
  assert.equal(comparablePrice(marketFixture,"2026-10-26"),1800);
  assert.equal(comparablePrice(marketFixture,"2026-10-19"),null);
  assert.equal(comparablePrice({...marketFixture,modal_price:"3000"},"2026-10-26"),null);
});
test("harvest values preserve kilogram/quintal units and reject missing or invalid quantities", () => {
  assert.equal(quantityKg("2.50","quintal"),"250"); assert.equal(quantityKg("0.01","quintal"),"1");
  assert.equal(harvestValue(marketFixture,"250","2026-10-26"),4500);
  for (const value of ["0", "-1", "1e3", "abc", "", "1.001", "10000001"]) assert.throws(()=>quantityKg(value,"kg"));
  assert.equal(harvestValue(marketFixture,""),null);
});
test("market sorting and recent-date filtering use publication dates, not retrieval times", () => {
  const recent={...marketFixture,market:"Recent",arrival_date:"26/10/2026",modal_price:2000};
  const old={...marketFixture,market:"Old",arrival_date:"01/10/2026"};
  const unknown={...marketFixture,market:"Unknown",arrival_date:"bad"};
  assert.deepEqual(viewMarketRows([old,unknown,recent],"",true,"latest","2026-10-26"),[recent]);
  assert.equal(viewMarketRows([{...recent,arrival_date:"19/10/2026"}],"",true,"latest","2026-10-26").length,0);
  assert.equal(viewMarketRows([old,recent],"",false,"high","2026-10-26")[0].market,"Recent");
  assert.equal(viewMarketRows([old,recent],"recent",false,"low","2026-10-26").length,1);
});
test("market-to-sale handoffs require comparable crops, dates, valid amounts and recent payloads", () => {
  const other={...marketFixture,market:"Hansi",modal_price:1900};
  const now="2026-10-26T04:00:00Z", payload=marketSaleDraft([marketFixture,other],"250",now);
  assert.equal(payload.offers[0].price,"1800");assert.match(payload.offers[0].buyer,/20\/10\/2026/);
  assert.deepEqual(parseMarketDraft(JSON.stringify(payload),Date.parse(now)),payload);
  assert.throws(()=>parseMarketDraft(JSON.stringify(payload),Date.parse(now)+600001));
  assert.throws(()=>parseMarketDraft(JSON.stringify({...payload,offers:[{...payload.offers[0],unit:"tonne"},payload.offers[1]]}),Date.parse(now)));
  assert.throws(()=>marketSaleDraft([marketFixture,{...other,commodity:"Wheat"}]));
  assert.throws(()=>marketSaleDraft([marketFixture,{...other,variety:"Other"}]));
  assert.throws(()=>marketSaleDraft([marketFixture,marketFixture]));
  assert.throws(()=>marketSaleDraft([marketFixture,{...other,arrival_date:"bad"}]));
});
test("market CSV preserves provenance and neutralizes spreadsheet formulas and quotes", () => {
  const csv=marketCsv([{...marketFixture,market:'=HYPERLINK("https://invalid.test")'}],{status:"cached",source:"AGMARKNET",records:[],retrievedAt:"2026-10-20T08:00:00Z"});
  assert.ok(csv.startsWith("\uFEFF"));assert.match(csv,/'=HYPERLINK\(""https:/);assert.match(csv,/"cached"/);assert.match(csv,/20\/10\/2026/);assert.match(csv,/INR\/quintal/);
});
test("saved market preferences reject malformed filters without accepting storage instructions", () => {
  assert.equal(validMarketSearch({id:"1",name:"Hisar onions",filters:{commodity:"Onion",state:"Haryana",district:"Hisar",market:"",date:""}}),true);
  assert.equal(validMarketSearch({id:"1",name:"",filters:{}}),false);
  assert.equal(validMarketSearch({id:"1",name:"Bad",filters:{commodity:"",state:"",district:"",market:"",date:{toString:1}}}),false);
});
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
import { parseWebsiteQuestion } from "../src/lib/website-launch";
test("homepage handoffs accept only recent validated questions", () => {
  const pending={id:"test",question:"tamatar ke patte peele hain",language:"Auto",createdAt:1000};
  assert.deepEqual(parseWebsiteQuestion(JSON.stringify(pending),2000),pending);
  for(const patch of [{id:""},{question:" "},{question:"x".repeat(1001)},{language:"unknown"},{createdAt:999999},{createdAt:"1000"}]) assert.equal(parseWebsiteQuestion(JSON.stringify({...pending,...patch}),2000),null);
  assert.equal(parseWebsiteQuestion(JSON.stringify(pending),301001),null);
  assert.equal(parseWebsiteQuestion("bad json"),null);
});
import { validateObservation, incidence, observationTrend, fieldReport, observationRecheck } from "../src/lib/field-diary";
import { compareSales } from "../src/lib/sale-planner";
test("field observations validate sample counts and avoid invalid or future dates", () => {
  const draft = { crop:"Tomato", plot:"North", date:"2026-09-01", symptoms:"Yellow leaves", action:"", checked:"20", affected:"3" };
  const value = validateObservation(draft, "2026-10-04");
  assert.equal(incidence(value), 15);
  assert.equal(incidence(validateObservation({...draft, checked:"", affected:""})), null);
  for (const change of [{checked:"0"},{affected:"21"},{affected:"-1"},{affected:"1.5"},{checked:"NaN"},{checked:""},{date:"2026-02-30"},{date:"2100-01-01"},{symptoms:" "},{plot:""}]) assert.throws(()=>validateObservation({...draft,...change}, "2026-10-04"));
  const first={...value,id:"a"}; const last={...value,id:"b",date:"2026-09-03",affected:1};
  assert.equal(observationTrend([first,last])?.change, -10);
  assert.equal(observationTrend([first,{...last,plot:"South"}]), null);
  assert.equal(observationTrend([first,{...last,date:first.date}]), null);
  assert.match(fieldReport([last,first]), /3\/20 \(15.0%\)/);
  assert.match(fieldReport([last],true), /पुष्टि किया हुआ निदान नहीं/);
  assert.equal(observationRecheck(first, localDay()).id, "diary-a");
  assert.throws(()=>observationRecheck(first, "1900-01-01"));
});
test("sale comparison normalizes quintals and kg and deducts only entered costs", () => {
  const a={buyer:"Local",price:"2000",unit:"quintal" as const,transport:"100",fees:"50",commission:"2"};
  const b={...a,buyer:"Distant",price:"21",unit:"kg" as const,transport:"300",fees:"",commission:""};
  const rows=compareSales("100",[a,b]);
  assert.deepEqual(rows[0], {buyer:"Local",gross:2000,deductions:190,net:1810,netPerKg:18.1});
  assert.equal(rows[1].net,1800);
  for(const qty of ["0","-1","NaN","","0.001"]) assert.throws(()=>compareSales(qty,[a,b]));
  for(const change of [{commission:"101"},{price:"0"},{fees:"-2"},{buyer:""}]) assert.throws(()=>compareSales("100",[{...a,...change},b]));
  assert.equal(compareSales("1",[{...a,transport:"2000"},b]).some(r=>r.net<0),true);
});
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
