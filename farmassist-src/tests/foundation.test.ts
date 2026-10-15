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
  type Backup,
} from "../src/lib/record-backup";
import { defaultLayout } from "../src/lib/plot";
import { analyzeSoil, emptySoil } from "../src/lib/soil";
import { compareSales } from "../src/lib/sale-planner";

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
  assert.equal(Object.keys(rows).length, recordKeys.length);
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
