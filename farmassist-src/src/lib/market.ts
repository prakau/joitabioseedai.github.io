import { compareSales, type Offer } from "./sale-planner";
import { isDay, localDay } from "./planning";

export type MarketFilters = { commodity: string; state: string; district: string; market: string; date: string };
export type MarketRow = { commodity: string; state: string; district: string; market: string; arrival_date: string; modal_price: string | number; min_price: string | number; max_price: string | number; variety?: string };
export type MarketResult = { status: "live" | "cached" | "unavailable"; source: string; records: MarketRow[]; message?: string; retrievedAt?: string; sourceUpdatedAt?: string; total?: number; excluded?: number };
export type MarketSearch = { id: string; name: string; filters: MarketFilters };
export const MARKET_SEARCH_KEY = "joita-fa-market-searches-v1";
export const MARKET_DRAFT_KEY = "joita-fa-market-sale-draft-v1";
export const defaultMarketFilters: MarketFilters = { commodity: "", state: "Haryana", district: "", market: "", date: "" };
export function canonicalMarketFilters(filters: MarketFilters): MarketFilters {
  const crops: Record<string, string> = { "प्याज":"Onion", "प्याज़":"Onion", "टमाटर":"Tomato", "गेहूं":"Wheat", "गेहूँ":"Wheat", "सरसों":"Mustard", "आलू":"Potato", "धान":"Paddy(Dhan)(Common)" };
  const states: Record<string, string> = { "हरियाणा":"Haryana", "पंजाब":"Punjab", "राजस्थान":"Rajasthan", "उत्तर प्रदेश":"Uttar Pradesh", "मध्य प्रदेश":"Madhya Pradesh", "महाराष्ट्र":"Maharashtra", "बिहार":"Bihar", "गुजरात":"Gujarat" };
  return { commodity: crops[filters.commodity.trim()] || filters.commodity.trim(), state: states[filters.state.trim()] || filters.state.trim(), district: filters.district.trim(), market: filters.market.trim(), date: filters.date };
}
const text = (value: unknown, max = 120): value is string => typeof value === "string" && value.length <= max;
export function validMarketFilters(value: unknown): value is MarketFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as MarketFilters;
  return [row.commodity, row.state, row.district, row.market].every(v => text(v, 100)) && text(row.date, 10) && (row.date === "" || isDay(row.date));
}
export function validMarketSearch(value: unknown): value is MarketSearch {
  const row = value as MarketSearch;
  return Boolean(row && text(row.id, 100) && row.id && text(row.name, 50) && row.name.trim() && validMarketFilters(row.filters));
}
export function normaliseMarketRows(value: unknown): MarketRow[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error("Invalid market records.");
  const seen = new Set<string>();
  return value.flatMap((row): MarketRow[] => {
    if (!row || typeof row !== "object" || Array.isArray(row) || !["commodity", "state", "district", "market", "arrival_date"].every(k => text(row[k])) || !row.commodity.trim() || !row.market.trim()) return [];
    const price = (v: unknown) => (typeof v === "string" && v.length <= 30) || (typeof v === "number" && Number.isFinite(v));
    if (![row.min_price, row.modal_price, row.max_price].every(price) || (row.variety !== undefined && !text(row.variety))) return [];
    const clean: MarketRow = { commodity: row.commodity, state: row.state, district: row.district, market: row.market, arrival_date: row.arrival_date, min_price: row.min_price, modal_price: row.modal_price, max_price: row.max_price, ...(row.variety === undefined ? {} : { variety: row.variety }) };
    const id = marketRowId(clean); if (seen.has(id)) return []; seen.add(id);
    return [clean];
  });
}
export function normaliseMarketResult(value: unknown): MarketResult {
  const raw = value as MarketResult;
  if (!raw || !["live", "cached"].includes(raw.status) || !text(raw.source) || !raw.source.trim()) throw new Error("Invalid market response.");
  const rows = normaliseMarketRows(raw.records);
  const date = (v: unknown) => typeof v === "string" && v.length <= 64 && Number.isFinite(Date.parse(v)) ? v : undefined;
  return { status: raw.status, source: raw.source, records: rows, retrievedAt: date(raw.retrievedAt), sourceUpdatedAt: date(raw.sourceUpdatedAt), ...(typeof raw.total === "number" && Number.isFinite(raw.total) && raw.total >= 0 ? { total: raw.total } : {}), excluded: Math.min(200, (Number.isInteger(raw.excluded) && raw.excluded! >= 0 ? raw.excluded! : 0) + raw.records.length - rows.length) };
}
export function marketPrice(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const raw = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const result = Number(raw);
  return Number.isFinite(result) && result > 0 && result <= 10000000 ? result : null;
}
export function marketDay(value: string): string | null {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const day = parts && `${parts[3]}-${parts[2]}-${parts[1]}`;
  return day && isDay(day) ? day : null;
}
export function priceAge(row: MarketRow, today = localDay()): number | null {
  const day = marketDay(row.arrival_date);
  return day ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86400000) : null;
}
export function comparablePrice(row: MarketRow, today = localDay()): number | null {
  const price = marketPrice(row.modal_price), min = marketPrice(row.min_price), max = marketPrice(row.max_price), age = priceAge(row, today);
  return age === null || age < 0 || price === null || (min !== null && price < min) || (max !== null && price > max) ? null : price;
}
export function marketRowId(row: MarketRow) {
  return JSON.stringify([row.commodity, row.variety || "", row.state, row.district, row.market, row.arrival_date, row.min_price, row.modal_price, row.max_price]);
}
export function quantityKg(value: string, unit: "kg" | "quintal"): string {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) throw new Error("quantity");
  const kg = Number(value) * (unit === "quintal" ? 100 : 1);
  if (!Number.isFinite(kg) || kg <= 0 || kg > 10000000) throw new Error("quantity");
  return String(Math.round(kg * 100) / 100);
}
export function harvestValue(row: MarketRow, kg: string, today = localDay()): number | null {
  const price = comparablePrice(row, today);
  if (price === null || !kg) return null;
  try { return Math.round(Number(quantityKg(kg, "kg")) * price) / 100; } catch { return null; }
}
export function viewMarketRows(rows: MarketRow[], search: string, recent: boolean, sort: string, today = localDay()) {
  const term = search.trim().toLocaleLowerCase();
  return rows.filter(row => (!term || [row.commodity, row.variety, row.market, row.district, row.state].join(" ").toLocaleLowerCase().includes(term)) && (!recent || (priceAge(row, today) !== null && priceAge(row, today)! >= 0 && priceAge(row, today)! < 7))).sort((a, b) => {
    if (sort === "market") return a.market.localeCompare(b.market);
    if (sort === "high" || sort === "low") {
      const pa = comparablePrice(a, today), pb = comparablePrice(b, today);
      if (pa === null) return pb === null ? 0 : 1;
      if (pb === null) return -1;
      return sort === "high" ? pb - pa : pa - pb;
    }
    return (marketDay(b.arrival_date) || "").localeCompare(marketDay(a.arrival_date) || "");
  });
}
type MarketDraft = { version: 1; createdAt: string; crop: string; quantity: string; offers: Offer[] };
export function marketSaleDraft(rows: MarketRow[], quantity = "", now = new Date().toISOString()): MarketDraft {
  if (rows.length < 2 || rows.length > 5 || new Set(rows.map(marketRowId)).size !== rows.length) throw new Error("selection");
  if (new Set(rows.map(row => row.commodity.trim().toLowerCase())).size !== 1 || new Set(rows.map(row => (row.variety || "").trim().toLowerCase())).size !== 1) throw new Error("matching_crop");
  const offers = rows.map(row => {
    const price = comparablePrice(row, localDay(new Date(now)));
    if (price === null) throw new Error("price_date");
    return { buyer: `AGMARKNET ${row.market.slice(0, 54)} ${row.arrival_date}`, price: String(price), unit: "quintal" as const, transport: "", fees: "", commission: "" };
  });
  compareSales(quantity || "1", offers);
  return { version: 1, createdAt: now, crop: [rows[0].commodity, rows[0].variety].filter(Boolean).join(" / ").slice(0, 80), quantity, offers };
}
export function parseMarketDraft(raw: string, now = Date.now()): MarketDraft {
  if (raw.length > 12000) throw new Error("draft");
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || !text(value.createdAt, 40) || !text(value.crop, 80) || !value.crop.trim() || !text(value.quantity, 30) || !Array.isArray(value.offers) || value.offers.length < 2 || value.offers.length > 5) throw new Error("draft");
  const age = now - Date.parse(value.createdAt);
  if (!Number.isFinite(age) || age < -5000 || age > 600000) throw new Error("draft");
  const offers: Offer[] = value.offers.map((row: Offer) => {
    if (!row || !["buyer", "price", "unit", "transport", "fees", "commission"].every(k => text(row[k as keyof Offer], k === "buyer" ? 80 : 30))) throw new Error("draft");
    return { buyer: row.buyer, price: row.price, unit: row.unit, transport: row.transport, fees: row.fees, commission: row.commission };
  });
  compareSales(value.quantity || "1", offers);
  return { version: 1, createdAt: value.createdAt, crop: value.crop, quantity: value.quantity, offers };
}
export function marketCsv(rows: MarketRow[], result: MarketResult) {
  const cell = (value: unknown) => { const raw = String(value ?? ""); return `"${(/^[\s]*[=+\-@]/.test(raw) ? "'" : "") + raw.replace(/"/g, '""')}"`; };
  const table = [["Source", "Feed status", "Arrival date", "Retrieved at", "Commodity", "Variety", "Mandi", "District", "State", "Min INR/quintal", "Modal INR/quintal", "Max INR/quintal", "Price/date check"], ...rows.map(row => [result.source, result.status, row.arrival_date, result.retrievedAt || "", row.commodity, row.variety || "", row.market, row.district, row.state, marketPrice(row.min_price) ?? "", marketPrice(row.modal_price) ?? "", marketPrice(row.max_price) ?? "", comparablePrice(row) === null ? "Needs confirmation" : "Dated reference"])];
  return "\uFEFF" + table.map(row => row.map(cell).join(",")).join("\r\n");
}
