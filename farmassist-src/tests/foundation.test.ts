import { test } from "node:test";
import assert from "node:assert/strict";
import ICAL from "ical.js";
import {
  calendarFile,
  planStatus,
  validatePlan,
  type Plan,
} from "../src/lib/planning";
import {
  captureBackup,
  parseBackup,
  mergeBackups,
  restoreBackup,
  recordKeys,
  MAX_BACKUP_BYTES,
  rawRecoveryFile,
  readDiary,
  type Backup,
} from "../src/lib/record-backup";
import { defaultLayout } from "../src/lib/plot";
import { analyzeSoil, emptySoil } from "../src/lib/soil";
import { compareSales } from "../src/lib/sale-planner";
import { caseObservation, validCaseData, fieldReport, type Observation } from "../src/lib/field-diary";
import { SEASON_KEY, daysAfterSowing, duplicateSeason, parseSeasons, readSeasonPlans, seasonProfile, seasonTask, validSeason, type CropSeason } from "../src/lib/crop-seasons";

const savedSeason: CropSeason = { id: "season-1", plot: "North field", crop: "Mustard", district: "Kurukshetra", state: "Haryana", sowing: "2026-10-15", stage: "vegetative", area: "1.5", areaUnit: "acre", irrigation: "drip", notes: "Private notes are not advisory context", status: "active", createdAt: "2026-10-29T10:00:00Z", updatedAt: "2026-10-29T10:00:00Z" };
test("crop seasons validate actual dates, units, limits and optional unknowns without inferring stage", () => {
  assert.equal(validSeason(savedSeason), true);
  assert.equal(validSeason({ ...savedSeason, sowing: "", area: "" }), true);
  for (const patch of [{ sowing: "2026-02-30" }, { plot: " " }, { area: "-1" }, { area: "0" }, { area: "1e5" }, { area: "1,000" }, { areaUnit: "bigha" }, { stage: "automatically healthy" }, { notes: "x".repeat(301) }, { updatedAt: "2025-10-29T10:00:00Z" }, { id: "bad/id" }, { district: "x".repeat(80), state: "y".repeat(80) }])
    assert.equal(validSeason({ ...savedSeason, ...patch }), false);
  assert.equal(daysAfterSowing(savedSeason, "2026-10-29"), 14);
  assert.equal(daysAfterSowing(savedSeason, "2026-10-14"), -1);
  assert.equal(daysAfterSowing({ ...savedSeason, sowing: "" }, "2026-10-29"), null);
  assert.equal(daysAfterSowing({ ...savedSeason, sowing: "2024-02-28" }, "2024-03-01"), 2);
  assert.equal(duplicateSeason({ ...savedSeason, id: "new", plot: "  NORTH FIELD  " }, [savedSeason]), true);
  assert.equal(duplicateSeason({ ...savedSeason, id: "new", sowing: "2026-10-16" }, [savedSeason]), false);
});
test("season reader refuses damaged or duplicate data and profile excludes private notes", () => {
  assert.deepEqual(parseSeasons(null), []);
  assert.deepEqual(parseSeasons(JSON.stringify([savedSeason])), [savedSeason]);
  for (const raw of ["{broken", "null", "{}", JSON.stringify([savedSeason, savedSeason]), JSON.stringify([{ ...savedSeason, area: "oops" }]), JSON.stringify(Array.from({ length: 31 }, (_, i) => ({ ...savedSeason, id: `s-${i}` })))]) assert.throws(() => parseSeasons(raw));
  const profile = JSON.parse(seasonProfile(savedSeason));
  assert.equal(profile.area, "1.5 acre"); assert.equal(profile.sowing, savedSeason.sowing);
  assert.equal(profile.notes, undefined); assert.equal(profile.createdAt, undefined);
  assert.equal(seasonProfile({ ...savedSeason, status: "completed" }), "");
});
test("season checks have stable per-date IDs, cannot precede sowing and preserve existing calendar records", () => {
  const plan = seasonTask(savedSeason, "2026-10-30", true);
  assert.match(plan.task, /North field.*जांच/);
  assert.equal(plan.sowing, savedSeason.sowing);
  assert.equal(seasonTask(savedSeason, "2026-10-30", false).id, plan.id);
  assert.notEqual(seasonTask(savedSeason, "2026-10-31", false).id, plan.id);
  assert.throws(() => seasonTask(savedSeason, "2026-10-14", false), /before sowing/);
  assert.throws(() => seasonTask({ ...savedSeason, status: "completed" }, "2026-10-30", false), /season_invalid/);
  assert.deepEqual(readSeasonPlans({ getItem: () => JSON.stringify([plan]) }), [plan]);
  assert.throws(() => readSeasonPlans({ getItem: () => "{broken" }));
  assert.throws(() => readSeasonPlans({ getItem: () => JSON.stringify([plan, plan]) }), /plan_records/);
});
test("version 6 backups round-trip seasons, merge safely and retain legacy exports", () => {
  const file = { version: 6, app: "JOITAFA", exportedAt: savedSeason.updatedAt, records: { [SEASON_KEY]: [savedSeason] } };
  const imported = parseBackup(JSON.stringify(file));
  assert.equal(imported.version, 6); assert.deepEqual(imported.records[SEASON_KEY], [savedSeason]);
  const captured = captureBackup({ getItem: key => key === SEASON_KEY ? JSON.stringify([savedSeason]) : null });
  assert.equal(captured.version, 6);
  assert.equal(mergeBackups(captured, imported).duplicates, 1);
  assert.equal(mergeBackups(captured, parseBackup(JSON.stringify({ ...file, records: { [SEASON_KEY]: [{ ...savedSeason, notes: "Changed" }] } }))).conflicts, 1);
  for (const version of [3, 4, 5]) assert.equal(parseBackup(JSON.stringify({ ...file, version, records: {} })).version, 4);
  assert.throws(() => parseBackup(JSON.stringify({ ...file, records: { [SEASON_KEY]: [{ ...savedSeason, areaUnit: "unknown" }] } })), /records/);
  assert.throws(() => parseBackup(JSON.stringify({ ...file, records: { [SEASON_KEY]: Array.from({ length: 31 }, (_, i) => ({ ...savedSeason, id: `s-${i}` })) } })), /limit/);
  assert.throws(() => captureBackup({ getItem: key => key === SEASON_KEY ? "{broken" : null }), /current/);
});

const caseInput = {
  id: "case-root", draft: { crop: "Mustard", plot: "North", date: "2026-10-14", symptoms: "Yellow leaves", action: "Observed soil", checked: "10", affected: "2" },
  advisory: { questionId: "answer-1", question: "My mustard leaves are yellow. What should I check?", answer: "Inspect moisture and compare affected plants before selecting any treatment.", source: "gemini" as const, language: "English", date: "2026-10-14T10:00:00Z" },
  stage: "vegetative", location: "Haryana",
};
test("crop cases extend diary records, preserve advice, deduplicate retries and require a live root for follow-ups", () => {
  const root = caseObservation(caseInput, [], "2026-10-14T10:00:00Z");
  assert.equal(root.caseId, root.id); assert.equal(root.caseInfo?.status, "monitoring");
  assert.equal(root.checked, 10); assert.equal(root.affected, 2);
  assert.equal(caseObservation({ ...caseInput, id: "retry" }, [root]).id, root.id);
  const next = caseObservation({ ...caseInput, id: "followup", caseId: root.id, advisory: { ...caseInput.advisory, questionId: "answer-2" } }, [root]);
  assert.equal(next.caseId, root.id); assert.equal(next.caseInfo, undefined);
  assert.throws(() => caseObservation({ ...caseInput, caseId: "missing", advisory: { ...caseInput.advisory, questionId: "new" } }, [root]), /case_missing/);
  assert.throws(() => caseObservation({ ...caseInput, caseId: root.id, draft: { ...caseInput.draft, crop: "Wheat" }, advisory: { ...caseInput.advisory, questionId: "new" } }, [root]), /case_identity/);
  assert.throws(() => caseObservation({ ...caseInput, caseId: root.id, advisory: { ...caseInput.advisory, questionId: "new" } }, [{ ...root, caseInfo: { ...root.caseInfo!, status: "closed" } }]), /case_closed/);
  assert.match(fieldReport([root, next]), /not an independent expert verification/);
});
test("case metadata round-trips backups and rejects orphaned or inconsistent evidence", () => {
  const root = caseObservation(caseInput, []);
  const next = caseObservation({ ...caseInput, id: "next", caseId: root.id, advisory: { ...caseInput.advisory, questionId: "new" } }, [root]);
  const data = { version: 4, app: "JOITAFA", exportedAt: "2026-10-14T10:00:00Z", records: { "joita-fa-diary-v1": [root, next] } };
  assert.deepEqual(parseBackup(JSON.stringify(data)).records["joita-fa-diary-v1"], [root, next]);
  assert.equal(parseBackup(JSON.stringify(data)).version, 5);
  assert.throws(() => parseBackup(JSON.stringify({ ...data, records: { "joita-fa-diary-v1": [next] } })), /records/);
  assert.throws(() => parseBackup(JSON.stringify({ ...data, records: { "joita-fa-diary-v1": [root, { ...next, crop: "Wheat" }] } })), /records/);
  assert.equal(validCaseData({ ...root, caseInfo: { ...root.caseInfo, status: "verified" } }), false);
  assert.equal(validCaseData({ ...root, advisory: { ...root.advisory, answer: "x".repeat(16001) } }), false);
  const original = { getItem: () => "{broken" };
  assert.throws(() => readDiary(original));
  const changed = { ...root, crop: "Wheat" };
  const incoming = parseBackup(JSON.stringify(data));
  const current = parseBackup(JSON.stringify({ ...data, records: { "joita-fa-diary-v1": [changed] } }));
  assert.throws(() => mergeBackups(current, incoming), /case_links/);
});

const plan: Plan = {
  id: "task-1",
  crop: "Wheat",
  sowing: "2026-11-10",
  task: "Field scouting",
  due: "2026-09-16",
  done: false,
};
test("future planting cannot create overdue alerts; legacy contradictions need review", () => {
  assert.throws(() => validatePlan(plan), /before sowing/);
  assert.equal(planStatus(plan, "2026-10-14"), "Needs review");
  assert.equal(planStatus(plan, "2026-12-14"), "Needs review");
  assert.throws(() => calendarFile([plan]), /before sowing/);
  const valid = { ...plan, due: "2026-11-11" };
  validatePlan(valid);
  assert.equal(planStatus(valid, "2026-10-14"), "Upcoming");
  assert.equal(planStatus(valid, "2026-11-11"), "Today");
  assert.equal(planStatus(valid, "2026-11-12"), "Overdue");
});
test("explicit supported pre-plant tasks are valid; missing or reversed planting dates are rejected", () => {
  const before: Plan = {
    ...plan,
    task: "Prepare field",
    preplantActivity: "Land preparation",
  };
  validatePlan(before);
  assert.equal(planStatus(before, "2026-10-14"), "Overdue");
  const event = new ICAL.Component(
    ICAL.parse(calendarFile([before])),
  ).getFirstSubcomponent("vevent");
  assert.match(
    String(event?.getFirstPropertyValue("description")),
    /Pre-plant activity: Land preparation/,
  );
  for (const patch of [
    { sowing: "" },
    { sowing: "2026-02-30" },
    { sowing: before.due },
    { preplantActivity: "Arbitrary excuse" },
  ])
    assert.throws(() => validatePlan({ ...before, ...patch } as Plan));
  assert.equal(
    planStatus({ ...plan, due: "invalid" }, "2026-10-14"),
    "Needs review",
  );
  validatePlan({ ...plan, sowing: "" });
  validatePlan({ ...plan, sowing: plan.due });
});
const day = "2026-10-14T10:00:00.000Z";
const backup = (records: Backup["records"]): Backup => ({
  version: 4,
  app: "JOITAFA",
  exportedAt: day,
  records,
});
function store(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}
test("all existing record collections round-trip without changing IDs or upgrading evidence claims", () => {
  const values = { ...emptySoil, ph: "7" };
  const offers = ["A", "B"].map((buyer) => ({
    buyer,
    price: "20",
    unit: "kg" as const,
    transport: "",
    fees: "",
    commission: "",
  }));
  const rows: Backup["records"] = {
    "joita-fa-plans-v3": [plan],
    "joita-fa-diary-v1": [
      {
        id: "diary",
        crop: "Wheat",
        plot: "North",
        date: "2026-10-14",
        symptoms: "Leaf spots",
        action: "Checked",
        checked: 10,
        affected: 2,
      },
    ],
    "joita-fa-ledger-v1": [
      {
        id: "ledger",
        date: "2026-10-14",
        crop: "Wheat",
        type: "expense",
        category: "Seed",
        amountPaise: 100,
        note: "Sample",
      },
    ],
    "joita-fa-questions": [
      {
        id: "question",
        question: "पत्ते पीले हैं",
        answer: "नमी जांचें",
        date: day,
        source: "gemini",
        context: {
          crop: "Wheat",
          location: "Haryana",
          stage: "flowering",
          language: "Hindi",
          problemType: "general",
        },
      },
    ],
    "joita-fa-layouts": [{ id: "plot", date: day, ...defaultLayout }],
    "joita-fa-soils-v3": [
      {
        id: "soil",
        date: day,
        crop: "Wheat",
        sampleDate: "2026-10-14",
        lab: "Lab",
        values,
        result: analyzeSoil(values),
      },
    ],
    "joita-fa-soils": [{ id: "old-soil", value: 20 }],
    "joita-fa-sound-v3": [
      {
        id: "sound",
        date: day,
        location: "Haryana",
        duration: 60,
        activity: 20,
        silence: 80,
        rmsDb: -60,
        clipping: 0,
        zeroCrossingsPerSecond: 100,
        waveform: [0.1],
      },
    ],
    "joita-fa-ehi": [{ id: "old-ehi", score: 12 }],
    "joita-fa-posts": [
      {
        id: "post",
        date: day,
        name: "",
        village: "",
        crop: "Wheat",
        issue: "Question",
        text: "Need field check",
      },
    ],
    "joita-fa-sale-comparisons-v1": [
      {
        id: "sale",
        date: day,
        crop: "Wheat",
        quantity: "100",
        offers,
        results: compareSales("100", offers),
      },
    ],
  };
  assert.equal(Object.keys(rows).length, recordKeys.filter(key => key !== SEASON_KEY).length);
  const original = backup(rows);
  assert.deepEqual(parseBackup(JSON.stringify(original)), original);
  assert.deepEqual(
    parseBackup(JSON.stringify({ ...original, version: 3, app: undefined })),
    original,
  );
  const s = store();
  restoreBackup(s, original, {});
  assert.deepEqual(captureBackup(s, day), original);
});
test("backup validation rejects arbitrary keys, malformed content, units, duplicate IDs and oversize files", () => {
  const good = backup({ "joita-fa-plans-v3": [plan] });
  for (const bad of [
    "not JSON",
    JSON.stringify({ ...good, version: 99 }),
    JSON.stringify({ ...good, app: "other" }),
    JSON.stringify({ ...good, exportedAt: "bad" }),
    JSON.stringify({ ...good, records: { "api-key": [] } }),
    JSON.stringify({ ...good, records: { "joita-fa-plans-v3": [plan, plan] } }),
    JSON.stringify({
      ...good,
      records: { "joita-fa-ledger-v1": [{ id: "x", amountPaise: "100" }] },
    }),
    '{"version":3,"exportedAt":"2026-10-14","records":{},"__proto__":{}}',
    "x".repeat(MAX_BACKUP_BYTES + 1),
  ])
    assert.throws(() => parseBackup(bad));
});
test("restore is idempotent and keeps device versions of same-ID conflicts", () => {
  const s = store({ "joita-fa-plans-v3": JSON.stringify([plan]) });
  const before = captureBackup(s);
  const incoming = backup({
    "joita-fa-plans-v3": [
      { ...plan, task: "Changed" },
      { ...plan, id: "new" },
    ],
  });
  const result = restoreBackup(s, incoming, before.records);
  assert.equal(result.added, 1);
  assert.equal(result.conflicts, 1);
  assert.equal(
    captureBackup(s).records["joita-fa-plans-v3"]?.find((r) => r.id === plan.id)
      ?.task,
    plan.task,
  );
  const repeat = restoreBackup(s, incoming, captureBackup(s).records);
  assert.equal(repeat.added, 0);
  assert.equal(repeat.duplicates, 1);
  assert.equal(repeat.conflicts, 1);
  const reordered = {
    done: plan.done,
    due: plan.due,
    task: plan.task,
    sowing: plan.sowing,
    crop: plan.crop,
    id: plan.id,
  };
  assert.equal(
    mergeBackups(before, backup({ "joita-fa-plans-v3": [reordered] }))
      .duplicates,
    1,
  );
});
test("restore detects changes after preview and rolls back partial writes on quota failure", () => {
  const s = store({ "joita-fa-plans-v3": JSON.stringify([plan]) });
  const before = captureBackup(s);
  s.setItem(
    "joita-fa-plans-v3",
    JSON.stringify([{ ...plan, task: "Edited elsewhere" }]),
  );
  assert.throws(() => restoreBackup(s, before, before.records), /changed/);
  const empty = store();
  let calls = 0;
  const broken = {
    ...empty,
    setItem: (k: string, v: string) => {
      if (++calls === 2) throw new Error("quota");
      empty.setItem(k, v);
    },
  };
  const incoming = backup({
    "joita-fa-posts": [
      {
        id: "p",
        date: day,
        name: "",
        village: "",
        crop: "",
        issue: "Question",
        text: "Note",
      },
    ],
    "joita-fa-plans-v3": [plan],
  });
  assert.throws(() => restoreBackup(broken, incoming, {}), /quota/);
  assert.deepEqual(captureBackup(empty).records, {});
});
test("restore never turns corrupt current data into an empty store or exceeds tool retention limits", () => {
  const s = store({ "joita-fa-plans-v3": "corrupt" });
  assert.throws(() => captureBackup(s), /current/);
  assert.equal(s.getItem("joita-fa-plans-v3"), "corrupt");
  assert.equal(rawRecoveryFile(s).records["joita-fa-plans-v3"], "corrupt");
  assert.throws(
    () =>
      mergeBackups(
        backup({}),
        backup({
          "joita-fa-plans-v3": Array.from({ length: 1001 }, (_, i) => ({
            ...plan,
            id: String(i),
          })),
        }),
      ),
    /limit/,
  );
});
