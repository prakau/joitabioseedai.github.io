import { isDay, validatePlan, type Plan } from "./planning";

export const SEASON_KEY = "joita-fa-crop-seasons-v1";
export const ACTIVE_SEASON_KEY = "joita-fa-active-season-v1";
export const seasonStages = ["not sure", "planned", "sowing", "seedling", "vegetative", "flowering", "fruiting", "grain filling", "harvest"] as const;
export const irrigationTypes = ["not sure", "rainfed", "drip", "furrow", "sprinkler"] as const;
export type CropSeason = {
  id: string; plot: string; crop: string; district: string; state: string;
  sowing: string; stage: string; area: string; areaUnit: "acre" | "ha" | "m2";
  irrigation: string; notes: string; status: "active" | "completed";
  createdAt: string; updatedAt: string;
};
const bounded = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
export function validSeason(value: unknown): value is CropSeason {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as CropSeason;
  return bounded(row.id, 100) && /^[a-zA-Z0-9_-]+$/.test(row.id)
    && bounded(row.plot, 60) && Boolean(row.plot.trim()) && bounded(row.crop, 60) && Boolean(row.crop.trim())
    && bounded(row.district, 80) && bounded(row.state, 80)
    && [row.district, row.state].filter(Boolean).join(", ").length <= 120
    && bounded(row.sowing, 10) && (!row.sowing || isDay(row.sowing))
    && seasonStages.includes(row.stage as typeof seasonStages[number])
    && bounded(row.area, 12) && (!row.area || (/^\d+(\.\d{1,4})?$/.test(row.area) && Number(row.area) > 0 && Number(row.area) <= 100000))
    && ["acre", "ha", "m2"].includes(row.areaUnit)
    && irrigationTypes.includes(row.irrigation as typeof irrigationTypes[number])
    && bounded(row.notes, 300) && ["active", "completed"].includes(row.status)
    && [row.createdAt, row.updatedAt].every(date => bounded(date, 40) && Number.isFinite(Date.parse(date)))
    && Date.parse(row.updatedAt) >= Date.parse(row.createdAt);
}
export function parseSeasons(raw: string | null): CropSeason[] {
  const rows: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length > 30 || !rows.every(validSeason) || new Set(rows.map(row => row.id)).size !== rows.length)
    throw new Error("season_records");
  return rows;
}
export function readSeasons(store: Pick<Storage, "getItem">) { return parseSeasons(store.getItem(SEASON_KEY)); }
export function duplicateSeason(season: CropSeason, rows: CropSeason[]) {
  const normalize = (text: string) => text.trim().toLocaleLowerCase();
  return rows.some(row => row.id !== season.id && normalize(row.plot) === normalize(season.plot) && normalize(row.crop) === normalize(season.crop) && row.sowing === season.sowing && row.status === season.status);
}
export function daysAfterSowing(season: CropSeason, today: string): number | null {
  if (!season.sowing || !isDay(season.sowing) || !isDay(today)) return null;
  return Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${season.sowing}T12:00:00Z`)) / 86400000);
}
// Only explicitly recorded field facts travel to advisory; private notes never do.
export function seasonProfile(season: CropSeason) {
  if (!validSeason(season) || season.status !== "active") return "";
  return JSON.stringify({ plot: season.plot, crop: season.crop, sowing: season.sowing || "not recorded", area: season.area ? `${season.area} ${season.areaUnit}` : "not recorded", irrigation: season.irrigation });
}
export function seasonTask(season: CropSeason, due: string, hindi: boolean): Plan {
  if (!validSeason(season) || season.status !== "active") throw new Error("season_invalid");
  const plan: Plan = { id: `season-${season.id}-${due}`, crop: season.crop, sowing: season.sowing, task: `${season.plot}: ${hindi ? "खेत में फसल और नमी की जांच" : "Field scouting and moisture check"}`, due, done: false };
  validatePlan(plan);
  return plan;
}
export function readSeasonPlans(store: Pick<Storage, "getItem">): Plan[] {
  const raw = store.getItem("joita-fa-plans-v3");
  const rows: unknown = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length > 1000 || !rows.every(row => row && typeof row === "object" && typeof row.id === "string" && row.id.length <= 200 && row.id.trim() && typeof row.task === "string" && row.task.length <= 160 && typeof row.crop === "string" && typeof row.done === "boolean" && typeof row.sowing === "string" && (!row.sowing || isDay(row.sowing)) && typeof row.due === "string" && isDay(row.due)) || new Set(rows.map(row => row.id)).size !== rows.length)
    throw new Error("plan_records");
  return rows;
}
