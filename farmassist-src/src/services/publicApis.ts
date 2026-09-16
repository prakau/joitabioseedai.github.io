import { requestJson } from "../lib/network";
import { readStored, writeStored } from "../lib/storage";
export type ApiData<T> = {
  source: string;
  status: "live" | "cached" | "unavailable";
  data: T | null;
  retrievedAt?: string;
};
async function cachedFetch<T>(
  url: string,
  source: string,
  key: string,
): Promise<ApiData<T>> {
  try {
    const data = await requestJson<T>(url, {}, 12000);
    const result: ApiData<T> = {
      source,
      status: "live",
      data,
      retrievedAt: new Date().toISOString(),
    };
    writeStored(key, result);
    return result;
  } catch {
    const cached = readStored<ApiData<T> | null>(key, null);
    return cached
      ? { ...cached, status: "cached" }
      : { source, status: "unavailable", data: null };
  }
}
export type Climate = {
  properties?: { parameter?: Record<string, Record<string, number>> };
};
export function fetchNasaClimatology(lat: number, lon: number) {
  const url = new URL(
    "https://power.larc.nasa.gov/api/temporal/climatology/point",
  );
  url.search = new URLSearchParams({
    parameters: "T2M,PRECTOTCORR",
    community: "AG",
    longitude: String(lon),
    latitude: String(lat),
    format: "JSON",
  }).toString();
  return cachedFetch<Climate>(
    url.toString(),
    "NASA POWER climatology",
    `joita-fa-climate-v3:${lat.toFixed(3)},${lon.toFixed(3)}`,
  );
}
export type Occurrence = {
  key?: number;
  id?: number;
  species?: string;
  scientificName?: string;
  eventDate?: string;
  observed_on?: string;
  taxon?: { name?: string; preferred_common_name?: string };
};
export function fetchGbifContext(lat: number, lon: number) {
  // GBIF uses bounding boxes/ranges, not a radius parameter.
  const dy = 10 / 111.32,
    dx = 10 / (111.32 * Math.cos((lat * Math.PI) / 180));
  const url = new URL("https://api.gbif.org/v1/occurrence/search");
  url.search = new URLSearchParams({
    decimalLatitude: `${lat - dy},${lat + dy}`,
    decimalLongitude: `${lon - dx},${lon + dx}`,
    hasCoordinate: "true",
    limit: "20",
  }).toString();
  return cachedFetch<{ results: Occurrence[] }>(
    url.toString(),
    "GBIF",
    `joita-fa-gbif-v3:${lat.toFixed(3)},${lon.toFixed(3)}`,
  );
}
export function fetchINaturalistContext(lat: number, lon: number) {
  const url = new URL("https://api.inaturalist.org/v1/observations");
  url.search = new URLSearchParams({
    lat: String(lat),
    lng: String(lon),
    radius: "10",
    quality_grade: "research",
    per_page: "20",
  }).toString();
  return cachedFetch<{ results: Occurrence[] }>(
    url.toString(),
    "iNaturalist",
    `joita-fa-inat-v3:${lat.toFixed(3)},${lon.toFixed(3)}`,
  );
}
export type MarketFilters = {
  commodity: string;
  state: string;
  district: string;
  market: string;
  date: string;
};
export type MarketRow = {
  commodity: string;
  state: string;
  district: string;
  market: string;
  arrival_date: string;
  modal_price: string | number;
  min_price: string | number;
  max_price: string | number;
  variety?: string;
};
export type MarketResult = {
  status: "live" | "cached" | "unavailable";
  source: string;
  records: MarketRow[];
  message?: string;
  retrievedAt?: string;
  sourceUpdatedAt?: string;
  total?: number;
};
export function filterMarketRows(rows: MarketRow[], filters: MarketFilters) {
  return rows.filter(
    (row) =>
      ["commodity", "state", "district", "market"].every((field) =>
        String(row[field as keyof MarketRow] || "")
          .toLowerCase()
          .includes(filters[field as keyof MarketFilters].trim().toLowerCase()),
      ) &&
      (!filters.date ||
        row.arrival_date === filters.date.split("-").reverse().join("/")),
  );
}
export async function fetchMandiPrices(
  filters: MarketFilters,
): Promise<MarketResult> {
  const params = new URLSearchParams();
  for (const field of ["state", "district", "commodity", "market"] as const)
    if (filters[field].trim()) params.set(field, filters[field].trim());
  if (filters.date)
    params.set("arrival_date", filters.date.split("-").reverse().join("/"));
  const key = `joita-fa-market-v3:${params.toString()}`;
  try {
    const result = await requestJson<MarketResult>(
      `/api/market?${params}`,
      {},
      14000,
    );
    if (result.status === "unavailable") throw new Error(result.message);
    result.records = filterMarketRows(result.records, filters);
    writeStored(key, result);
    return result;
  } catch (error) {
    const cached = readStored<MarketResult | null>(key, null);
    return cached
      ? {
          ...cached,
          status: "cached",
          message:
            "Saved prices for these filters; check the arrival date before using them.",
        }
      : {
          status: "unavailable",
          source: "AGMARKNET / Data.gov.in",
          records: [],
          message:
            error instanceof Error ? error.message : "Market unavailable.",
        };
  }
}
