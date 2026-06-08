import { seasonalWeatherFallback } from "./farm-ai";

export type WeatherReport = {
  source: "Open-Meteo" | "Offline seasonal India data";
  temperature: number;
  rain: number;
  wind: number;
  humidity?: number;
  rainfallChance?: number;
  sprayDecision: string;
  irrigationUrgency: number;
  heatStress: string;
  diseaseRisk: number;
  note: string;
};

export async function fetchWeather(lat: number, lon: number): Promise<WeatherReport> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather API unavailable");
    const data = await response.json();
    const temperature = Math.round(data.current.temperature_2m);
    const humidity = Math.round(data.current.relative_humidity_2m ?? 0);
    const wind = Math.round(data.current.wind_speed_10m ?? 0);
    const rain = Number(data.current.precipitation ?? data.current.rain ?? 0);
    const rainfallChance = Number(data.daily?.precipitation_probability_max?.[0] ?? 0);
    const diseaseRisk = Math.min(100, Math.round((humidity > 75 ? 35 : 12) + (rainfallChance > 40 ? 30 : 8) + (temperature > 30 ? 12 : 4)));
    return {
      source: "Open-Meteo",
      temperature,
      rain,
      wind,
      humidity,
      rainfallChance,
      sprayDecision: wind > 18 || rainfallChance > 35 ? "No-spray: wind or rain risk is high." : "Spray window may be suitable; confirm label and local expert advice.",
      irrigationUrgency: Math.min(100, Math.max(5, Math.round((temperature - 18) * 3 + (60 - humidity) + (rainfallChance < 20 ? 20 : 0)))),
      heatStress: temperature >= 38 ? "Severe heat-stress risk" : temperature >= 34 ? "Moderate heat-stress risk" : "Low heat-stress risk",
      diseaseRisk,
      note: "Live Open-Meteo no-key API data. Cached by React Query and localStorage for weak connectivity."
    };
  } catch {
    const fallback = seasonalWeatherFallback();
    return {
      source: "Offline seasonal India data",
      temperature: fallback.temp,
      rain: fallback.rain,
      wind: 12,
      humidity: 58,
      rainfallChance: fallback.rain > 80 ? 55 : 15,
      sprayDecision: fallback.rain > 80 ? "No-spray likely during monsoon fallback." : "Check local wind and rainfall before spraying.",
      irrigationUrgency: fallback.temp > 32 ? 78 : 42,
      heatStress: fallback.temp > 32 ? "Moderate heat-stress risk" : "Low heat-stress risk",
      diseaseRisk: fallback.rain > 80 ? 72 : 35,
      note: fallback.note
    };
  }
}
