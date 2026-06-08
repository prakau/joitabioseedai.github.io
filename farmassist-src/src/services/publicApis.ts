import { marketPrices } from "../data/agriculture";

const cachePrefix = "joita-fa-api-cache:";

function readCache<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(cachePrefix + key) || "") as T;
  } catch {
    return fallback;
  }
}

function writeCache<T>(key: string, value: T) {
  localStorage.setItem(cachePrefix + key, JSON.stringify({ savedAt: new Date().toISOString(), value }));
}

export type SourceBadge = {
  label: string;
  status: "live" | "cached" | "offline" | "optional";
};

export async function fetchNasaPower(lat: number, lon: number) {
  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
  const fmt = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
  const url = new URL("https://power.larc.nasa.gov/api/temporal/daily/point");
  url.searchParams.set("parameters", "T2M,RH2M,PRECTOTCORR,WS2M,GWETROOT");
  url.searchParams.set("community", "AG");
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("start", fmt(start));
  url.searchParams.set("end", fmt(end));
  url.searchParams.set("format", "JSON");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("NASA POWER unavailable");
    const json = await response.json();
    writeCache("nasa-power", json);
    return { source: "NASA POWER", status: "live" as const, data: json };
  } catch {
    return { source: "NASA POWER", status: "cached" as const, data: readCache("nasa-power", null) };
  }
}

export async function fetchNasaClimatology(lat: number, lon: number) {
  const url = new URL("https://power.larc.nasa.gov/api/temporal/climatology/point");
  url.searchParams.set("parameters", "T2M,PRECTOTCORR,RH2M,WS2M");
  url.searchParams.set("community", "AG");
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("format", "JSON");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("NASA climatology unavailable");
    const json = await response.json();
    writeCache("nasa-climatology", json);
    return { source: "NASA POWER climatology", status: "live" as const, data: json };
  } catch {
    return { source: "NASA POWER climatology", status: "cached" as const, data: readCache("nasa-climatology", null) };
  }
}

export async function fetchGbifContext(lat: number, lon: number) {
  const url = new URL("https://api.gbif.org/v1/occurrence/search");
  url.searchParams.set("decimalLatitude", String(lat));
  url.searchParams.set("decimalLongitude", String(lon));
  url.searchParams.set("radius", "10");
  url.searchParams.set("country", "IN");
  url.searchParams.set("hasCoordinate", "true");
  url.searchParams.set("limit", "20");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("GBIF unavailable");
    const json = await response.json();
    writeCache("gbif", json);
    return { source: "GBIF", status: "live" as const, records: json.results ?? [] };
  } catch {
    return { source: "GBIF", status: "cached" as const, records: readCache<{ value?: { results?: unknown[] } }>("gbif", {}).value?.results ?? [] };
  }
}

export async function fetchINaturalistContext(lat: number, lon: number) {
  const url = new URL("https://api.inaturalist.org/v1/observations");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lon));
  url.searchParams.set("radius", "10");
  url.searchParams.set("quality_grade", "research");
  url.searchParams.set("photos", "true");
  url.searchParams.set("per_page", "20");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("iNaturalist unavailable");
    const json = await response.json();
    writeCache("inat", json);
    return { source: "iNaturalist", status: "live" as const, records: json.results ?? [] };
  } catch {
    return { source: "iNaturalist", status: "cached" as const, records: readCache<{ value?: { results?: unknown[] } }>("inat", {}).value?.results ?? [] };
  }
}

export async function fetchMandiPrices(filters: { apiKey?: string; state?: string; district?: string; commodity?: string }) {
  if (!filters.apiKey) {
    return { source: "Offline/sample/cached price", status: "offline" as const, records: marketPrices };
  }
  const url = new URL("https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070");
  url.searchParams.set("api-key", filters.apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "50");
  if (filters.state) url.searchParams.set("filters[state]", filters.state);
  if (filters.district) url.searchParams.set("filters[district]", filters.district);
  if (filters.commodity) url.searchParams.set("filters[commodity]", filters.commodity);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Data.gov.in unavailable");
    const json = await response.json();
    writeCache("mandi", json.records ?? []);
    return { source: "Data.gov.in/AGMARKNET", status: "live" as const, records: json.records ?? [] };
  } catch {
    const cached = readCache<{ value?: unknown[] }>("mandi", {}).value;
    return { source: cached ? "Data.gov.in cached" : "Offline/sample/cached price", status: cached ? "cached" as const : "offline" as const, records: cached ?? marketPrices };
  }
}

export async function lookupAgrovocTerm(term: string) {
  const query = `PREFIX skos:<http://www.w3.org/2004/02/skos/core#> SELECT ?label WHERE { ?s skos:prefLabel ?label . FILTER(CONTAINS(LCASE(STR(?label)), "${term.toLowerCase()}")) } LIMIT 8`;
  const url = new URL("https://agrovoc.fao.org/sparql");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "application/sparql-results+json");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("AGROVOC unavailable");
    return { source: "FAO AGROVOC", status: "live" as const, data: await response.json() };
  } catch {
    return { source: "FAO AGROVOC", status: "optional" as const, data: null };
  }
}

export async function fetchSoilGridsEstimate(lat: number, lon: number) {
  const url = new URL("https://rest.isric.org/soilgrids/v2.0/properties/query");
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("lat", String(lat));
  ["phh2o", "soc", "nitrogen", "clay", "sand"].forEach((property) => url.searchParams.append("property", property));
  ["0-5cm", "5-15cm"].forEach((depth) => url.searchParams.append("depth", depth));
  url.searchParams.set("value", "mean");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("SoilGrids unavailable");
    return { source: "SoilGrids", status: "live" as const, data: await response.json() };
  } catch {
    return { source: "SoilGrids unavailable — using entered soil-test values/offline advisory.", status: "optional" as const, data: null };
  }
}
