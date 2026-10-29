import { isDay, preplantActivities } from "./planning";
import { validateLayout, type Layout } from "./plot";
import { compareSales, type Offer } from "./sale-planner";
import { analyzeSoil, soilFields, type SoilValues } from "./soil";
import { DIARY_KEY, validCaseData, type Observation } from "./field-diary";
import { SEASON_KEY, validSeason } from "./crop-seasons";

export const recordKeys = [
  SEASON_KEY,
  "joita-fa-diary-v1",
  "joita-fa-sale-comparisons-v1",
  "joita-fa-ledger-v1",
  "joita-fa-questions",
  "joita-fa-layouts",
  "joita-fa-soils-v3",
  "joita-fa-soils",
  "joita-fa-sound-v3",
  "joita-fa-ehi",
  "joita-fa-posts",
  "joita-fa-plans-v3",
] as const;
export type RecordKey = (typeof recordKeys)[number];
type Row = Record<string, unknown> & { id: string };
export type Backup = {
  version: 4 | 5 | 6;
  app: "JOITAFA";
  exportedAt: string;
  records: Partial<Record<RecordKey, Row[]>>;
};
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const recordLimits: Partial<Record<RecordKey, number>> = {
  [SEASON_KEY]: 30,
  "joita-fa-questions": 50,
  "joita-fa-layouts": 30,
  "joita-fa-soils-v3": 50,
  "joita-fa-sound-v3": 30,
  "joita-fa-posts": 100,
  "joita-fa-plans-v3": 1000,
  "joita-fa-diary-v1": 300,
  "joita-fa-sale-comparisons-v1": 100,
};
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const object = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 2000): v is string =>
  typeof v === "string" && v.length <= max;
const number = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const date = (v: unknown) => text(v, 40) && Number.isFinite(Date.parse(v));
const fields = (r: Record<string, unknown>, names: string[], max = 2000) =>
  names.every((k) => text(r[k], max));
const fail = (code: string): never => {
  throw new Error(code);
};
function validCaseLinks(rows: Row[]) {
  return rows.every(row => {
    if (!row.caseId) return true;
    const root = rows.find(entry => entry.id === row.caseId && entry.caseInfo);
    return root && root.crop === row.crop && root.plot === row.plot;
  });
}

// Imports are data, never storage instructions. Bound depth/size and reject prototype keys.
function safeTree(v: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (v === null || typeof v === "boolean" || number(v)) return true;
  if (typeof v === "string") return v.length <= 60000;
  if (Array.isArray(v))
    return v.length <= 10000 && v.every((x) => safeTree(x, depth + 1));
  return (
    object(v) &&
    Object.keys(v).length <= 100 &&
    Object.entries(v).every(
      ([k, x]) =>
        !["__proto__", "prototype", "constructor"].includes(k) &&
        safeTree(x, depth + 1),
    )
  );
}
function validRow(key: RecordKey, r: Record<string, unknown>): boolean {
  if (!text(r.id, 200) || !r.id.trim()) return false;
  switch (key) {
    case SEASON_KEY:
      return validSeason(r);
    case "joita-fa-plans-v3":
      // Accept historical date relationships so they can be repaired, not silently lost.
      return (
        fields(r, ["crop", "sowing", "task", "due"]) &&
        isDay(r.due as string) &&
        (!r.sowing || isDay(r.sowing as string)) &&
        typeof r.done === "boolean" &&
        (r.preplantActivity === undefined ||
          r.preplantActivity === "" ||
          preplantActivities.includes(r.preplantActivity as never))
      );
    case "joita-fa-diary-v1":
      return (
        validCaseData(r) &&
        fields(r, ["crop", "plot", "symptoms", "action"]) &&
        isDay(r.date as string) &&
        ((r.checked === null && r.affected === null) ||
          (number(r.checked) &&
            Number.isInteger(r.checked) &&
            r.checked > 0 &&
            r.checked <= 10000 &&
            number(r.affected) &&
            Number.isInteger(r.affected) &&
            r.affected >= 0 &&
            r.affected <= r.checked))
      );
    case "joita-fa-ledger-v1":
      return (
        fields(r, ["crop", "category", "note"]) &&
        isDay(r.date as string) &&
        ["income", "expense"].includes(r.type as string) &&
        number(r.amountPaise) &&
        Number.isSafeInteger(r.amountPaise) &&
        r.amountPaise > 0 &&
        r.amountPaise <= 1e10
      );
    case "joita-fa-questions":
      return (
        fields(r, ["question", "answer"], 60000) &&
        date(r.date) &&
        (r.source === undefined ||
          ["gemini", "openrouter", "offline_kb", "joita_rules"].includes(
            r.source as string,
          )) &&
        (r.context === undefined ||
          (object(r.context) &&
            fields(r.context, [
              "crop",
              "location",
              "stage",
              "language",
              "problemType",
            ]))) &&
        (r.imageAnalyzed === undefined ||
          typeof r.imageAnalyzed === "boolean") &&
        (r.answerLanguage === undefined || text(r.answerLanguage, 50)) &&
        (r.investigation === undefined || (object(r.investigation) &&
          fields(r.investigation, ["plot", "duration", "spread"], 80) && text(r.investigation.recentAction, 300) &&
          Object.entries(r.investigation).every(([key, value]) => ["plot", "duration", "spread", "recentAction", "previousObservations", "fieldProfile"].includes(key) && text(value, key === "previousObservations" ? 1000 : key === "fieldProfile" ? 600 : key === "recentAction" ? 300 : 80))))
      );
    case "joita-fa-layouts":
      return (
        fields(r, ["crop", "irrigation", "notes"]) &&
        date(r.date) &&
        !validateLayout(r as unknown as Layout)
      );
    case "joita-fa-soils-v3":
      return (
        fields(r, ["crop", "lab", "sampleDate"]) &&
        date(r.date) &&
        object(r.values) &&
        soilFields.every((f) =>
          text((r.values as Record<string, unknown>)[f.key], 50),
        ) &&
        Array.isArray(r.result) &&
        r.result.every(
          (x) => object(x) && fields(x, ["label", "value", "interpretation"]),
        )
      );
    case "joita-fa-sound-v3":
      return (
        fields(r, ["location"]) &&
        date(r.date) &&
        [
          "duration",
          "activity",
          "silence",
          "rmsDb",
          "clipping",
          "zeroCrossingsPerSecond",
        ].every((k) => number(r[k])) &&
        Array.isArray(r.waveform) &&
        r.waveform.length <= 80 &&
        r.waveform.every(number)
      );
    case "joita-fa-posts":
      return (
        fields(r, ["name", "village", "crop", "issue", "text"]) && date(r.date)
      );
    case "joita-fa-sale-comparisons-v1":
      if (
        !fields(r, ["crop", "quantity"]) ||
        !date(r.date) ||
        !Array.isArray(r.offers) ||
        !r.offers.every(
          (o) =>
            object(o) &&
            fields(o, [
              "buyer",
              "price",
              "unit",
              "transport",
              "fees",
              "commission",
            ]),
        )
      )
        return false;
      try {
        return (
          canonical(r.results) ===
          canonical(compareSales(r.quantity as string, r.offers as Offer[]))
        );
      } catch {
        return false;
      }
    default:
      return true; // Legacy soil/EHI are export-only; never treated as reviewed evidence.
  }
}
export function parseBackup(raw: string): Backup {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) fail("size");
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    fail("format");
  }
  if (!object(v) || !safeTree(v) || !object(v.records) || !date(v.exportedAt))
    return fail("format");
  if (
    ![3, 4, 5, 6].includes(v.version as number) ||
    ([4, 5, 6].includes(v.version as number) && v.app !== "JOITAFA")
  )
    fail("version");
  for (const [key, rows] of Object.entries(v.records)) {
    if (!recordKeys.includes(key as RecordKey)) fail("unknown");
    if (
      !Array.isArray(rows) ||
      rows.length > 10000 ||
      !rows.every((r) => object(r) && validRow(key as RecordKey, r))
    )
      fail("records");
    if (
      new Set((rows as Row[]).map((r) => r.id)).size !== (rows as Row[]).length
    )
      fail("duplicate");
    if (key === "joita-fa-soils-v3") {
      try {
        for (const r of rows as Row[]) analyzeSoil(r.values as SoilValues);
      } catch {
        fail("records");
      }
    }
    if (key === "joita-fa-diary-v1" && !validCaseLinks(rows as Row[])) fail("records");
    if (key === SEASON_KEY && (rows as Row[]).length > 30) fail("limit");
  }
  const diary = v.records[DIARY_KEY] as Row[] | undefined;
  return {
    version: (v.records[SEASON_KEY] as Row[] | undefined)?.length ? 6 : diary?.some(row => row.caseId || row.caseInfo || row.advisory) ? 5 : 4,
    app: "JOITAFA",
    exportedAt: v.exportedAt as string,
    records: v.records as Backup["records"],
  };
}
export function readDiary(store: Pick<Storage, "getItem">): Observation[] {
  const raw = store.getItem(DIARY_KEY);
  const backup = parseBackup(JSON.stringify({ version: 4, app: "JOITAFA", exportedAt: new Date().toISOString(), records: { [DIARY_KEY]: raw === null ? [] : JSON.parse(raw) } }));
  return (backup.records[DIARY_KEY] || []) as unknown as Observation[];
}
export function captureBackup(
  store: Pick<Storage, "getItem">,
  now = new Date().toISOString(),
): Backup {
  const records: Backup["records"] = {};
  for (const key of recordKeys) {
    const raw = store.getItem(key);
    if (raw !== null) {
      try {
        records[key] = JSON.parse(raw);
      } catch {
        fail("current");
      }
    }
  }
  try {
    return parseBackup(
      JSON.stringify({ version: 4, app: "JOITAFA", exportedAt: now, records }),
    );
  } catch {
    return fail("current");
  }
}
export function rawRecoveryFile(store: Pick<Storage, "getItem">) {
  return {
    format: "joitafa-raw-recovery-v1",
    exportedAt: new Date().toISOString(),
    note: "Unmodified record strings for recovery review, not an importable validated backup.",
    records: Object.fromEntries(
      recordKeys.map((key) => [key, store.getItem(key)]),
    ),
  };
}
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (object(v))
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
export function mergeBackups(current: Backup, incoming: Backup) {
  const records = { ...current.records };
  let added = 0,
    duplicates = 0,
    conflicts = 0;
  const conflictCollections: string[] = [];
  for (const key of recordKeys) {
    if (!incoming.records[key]) continue;
    const existing = current.records[key] || [];
    const index = new Map(existing.map((row) => [row.id, row]));
    const extra: Row[] = [];
    for (const row of incoming.records[key]!) {
      const previous = index.get(row.id);
      if (!previous) {
        extra.push(row);
        added++;
      } else if (canonical(previous) === canonical(row)) duplicates++;
      else {
        conflicts++;
        if (!conflictCollections.includes(key)) conflictCollections.push(key);
      }
    }
    records[key] = [...extra, ...existing];
    if (records[key]!.length > 10000) fail("size");
    if (
      records[key]!.length >
      Math.max(existing.length, recordLimits[key] || 10000)
    )
      fail("limit");
  }
  if (!validCaseLinks(records[DIARY_KEY] || [])) fail("case_links");
  return { records, added, duplicates, conflicts, conflictCollections };
}
export function restoreBackup(
  store: Store,
  incoming: Backup,
  expectedRecords: Backup["records"],
) {
  const current = captureBackup(store);
  if (canonical(current.records) !== canonical(expectedRecords))
    fail("changed");
  const merged = mergeBackups(current, incoming);
  const changed = recordKeys.filter(
    (k) => canonical(current.records[k]) !== canonical(merged.records[k]),
  );
  const before = new Map(changed.map((k) => [k, store.getItem(k)]));
  const written: RecordKey[] = [];
  try {
    for (const key of changed) {
      store.setItem(key, JSON.stringify(merged.records[key]));
      written.push(key);
    }
  } catch {
    let rollbackFailed = false;
    for (const key of written.reverse()) {
      try {
        const raw = before.get(key)!;
        if (raw === null) store.removeItem(key);
        else store.setItem(key, raw);
      } catch {
        rollbackFailed = true;
      }
    }
    fail(rollbackFailed ? "recovery" : "quota");
  }
  return merged;
}
