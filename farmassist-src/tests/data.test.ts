import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchWeather } from "../src/lib/weather";
import { fetchGbifContext, fetchMandiPrices } from "../src/services/publicApis";
const originalFetch = globalThis.fetch;
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: () => true } });
});
afterEach(() => { globalThis.fetch = originalFetch; });
test("cached weather retains its original observation time and coordinates", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ current: { temperature_2m: 27, time: "2026-09-14T07:00" } }));
  const live = await fetchWeather(29, 76); assert.equal(live.status, "live");
  globalThis.fetch = async () => { throw new Error("Offline"); };
  const cached = await fetchWeather(29, 76); assert.equal(cached.status, "cached"); assert.equal(cached.observedAt, live.observedAt); assert.equal(cached.temperature, 27);
  const elsewhere = await fetchWeather(30, 78); assert.equal(elsewhere.status, "unavailable"); assert.equal(elsewhere.temperature, undefined);
});
test("GBIF query uses coordinate ranges and absent cache is unavailable", async () => {
  let requested = "";
  globalThis.fetch = async (url) => { requested = String(url); throw new Error("Offline"); };
  const result = await fetchGbifContext(29, 76); assert.equal(result.status, "unavailable"); assert.equal(result.data, null);
  const url = new URL(requested); assert.equal(url.searchParams.has("radius"), false); assert.match(url.searchParams.get("decimalLatitude")!, /,/);
});
test("market errors cannot fall back to fabricated prices", async () => {
  globalThis.fetch = async () => { throw new Error("Offline"); };
  const result = await fetchMandiPrices({ commodity: "Onion", state: "Haryana", district: "", market: "", date: "" });
  assert.equal(result.status, "unavailable"); assert.deepEqual(result.records, []);
});
test("market caches actual records and original publication dates for the same filters only", async () => {
  const filters={commodity:"Banana - Green",state:"Tripura",district:"Dhalai",market:"Kulai APMC",date:"2026-09-16"};
  const records=[{commodity:filters.commodity,state:filters.state,district:filters.district,market:filters.market,arrival_date:"16/09/2026",min_price:1500,modal_price:1800,max_price:2000}];
  globalThis.fetch=async(url)=>{
    const query=new URL(String(url),"https://www.joitabioseedai.com").searchParams;
    assert.equal(query.get("arrival_date"),"16/09/2026"); assert.equal(query.has("api-key"),false);
    return new Response(JSON.stringify({status:"live",source:"AGMARKNET / Data.gov.in",records,total:1,retrievedAt:"2026-09-16T08:00:00Z",sourceUpdatedAt:"2026-09-16T00:00:28Z"}));
  };
  const live=await fetchMandiPrices(filters); assert.deepEqual(live.records,records);
  globalThis.fetch=async()=>{throw new Error("Offline");};
  const cached=await fetchMandiPrices(filters);
  assert.equal(cached.status,"cached"); assert.equal(cached.sourceUpdatedAt,live.sourceUpdatedAt); assert.deepEqual(cached.records,records);
  assert.equal((await fetchMandiPrices({...filters,state:"Haryana"})).status,"unavailable");
});
