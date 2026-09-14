import { requestJson } from "./network";
import { readStored, writeStored } from "./storage";
export type Place = { lat: number; lon: number; label: string };
export const defaultPlace: Place = {
  lat: 29.9695,
  lon: 76.8783,
  label: "Kurukshetra, Haryana (default)",
};
export type ForecastDay = {
  date: string;
  high: number;
  low: number;
  rain: number;
  chance: number;
};
export type WeatherReport = {
  status: "live" | "cached" | "unavailable";
  source: string;
  observedAt?: string;
  retrievedAt?: string;
  temperature?: number;
  humidity?: number;
  wind?: number;
  rain?: number;
  forecast: ForecastDay[];
  note: string;
};
export async function fetchWeather(
  lat: number,
  lon: number,
): Promise<WeatherReport> {
  const key = `joita-fa-weather-v3:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
    forecast_days: "7",
    timezone: "Asia/Kolkata",
  }).toString();
  try {
    const data = await requestJson<any>(url.toString());
    if (!Number.isFinite(data.current?.temperature_2m))
      throw new Error("Weather reading missing");
    const report: WeatherReport = {
      status: "live",
      source: "Open-Meteo",
      observedAt: `${data.current.time}+05:30`,
      retrievedAt: new Date().toISOString(),
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      wind: data.current.wind_speed_10m,
      rain: data.current.precipitation,
      forecast: (data.daily?.time || []).map((date: string, i: number) => ({
        date,
        high: data.daily.temperature_2m_max[i],
        low: data.daily.temperature_2m_min[i],
        rain: data.daily.precipitation_sum[i],
        chance: data.daily.precipitation_probability_max[i],
      })),
      note: "Forecast grid estimate for the selected location. Check conditions in your field before acting.",
    };
    writeStored(key, report);
    return report;
  } catch {
    const cached = readStored<WeatherReport | null>(key, null);
    return cached
      ? {
          ...cached,
          status: "cached",
          note: "Saved weather for this location. It may be out of date; this is not a current forecast.",
        }
      : {
          status: "unavailable",
          source: "Open-Meteo",
          forecast: [],
          note: "Current weather is unavailable and no forecast has been saved for this location. Seasonal climate is not a substitute for current weather.",
        };
  }
}
export async function searchPlaces(search: string): Promise<Place[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: search,
    count: "8",
    language: "en",
    format: "json",
    countryCode: "IN",
  }).toString();
  const data = await requestJson<any>(url.toString());
  return (data.results || []).map((item: any) => ({
    lat: item.latitude,
    lon: item.longitude,
    label: `${item.name}, ${item.admin1 || item.country}`,
  }));
}
export function weatherAdvice(report?: WeatherReport) {
  if (!report || report.status !== "live")
    return "Check local rain, wind, and root-zone moisture. Cached or seasonal data cannot confirm a spray window.";
  if (
    (report.wind || 0) > 15 ||
    (report.forecast[0]?.chance || 0) > 40 ||
    (report.rain || 0) > 0
  )
    return "Rain or wind may interfere with spraying. Recheck the field and product label before scheduling an application.";
  if ((report.temperature || 0) >= 35)
    return "Hot conditions: inspect root-zone moisture and crop stress. Avoid spraying in strong heat; use your local crop and label guidance.";
  return "Check soil moisture before irrigation. Weather alone does not establish a disease diagnosis or approve a spray application.";
}
