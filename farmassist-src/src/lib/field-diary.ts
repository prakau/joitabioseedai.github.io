import { isDay, localDay, type Plan } from "./planning";

export const DIARY_KEY = "joita-fa-diary-v1";
export type AdvisorySnapshot = { questionId: string; question: string; answer: string; source: "gemini" | "openrouter" | "offline_kb" | "joita_rules"; language: string; date: string };
export type CaseInfo = { status: "monitoring" | "closed"; stage: string; location: string; createdAt: string };
export type Observation = {
  id: string;
  crop: string;
  plot: string;
  date: string;
  symptoms: string;
  action: string;
  checked: number | null;
  affected: number | null;
  caseId?: string;
  caseInfo?: CaseInfo;
  advisory?: AdvisorySnapshot;
};
export function validCaseData(row: Record<string, unknown>) {
  const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
  if (row.caseId !== undefined && (!text(row.caseId, 200) || !row.caseId)) return false;
  if (row.caseInfo !== undefined) {
    const c = row.caseInfo as CaseInfo;
    if (!c || typeof c !== "object" || Array.isArray(c) || row.caseId !== row.id || !["monitoring", "closed"].includes(c.status) || !text(c.stage, 160) || !text(c.location, 160) || !text(c.createdAt, 40) || !Number.isFinite(Date.parse(c.createdAt))) return false;
  }
  if (row.advisory !== undefined) {
    const a = row.advisory as AdvisorySnapshot;
    if (!a || typeof a !== "object" || Array.isArray(a) || !text(a.questionId, 200) || !a.questionId || !text(a.question, 1000) || !text(a.answer, 16000) || !a.answer.trim() || !["gemini", "openrouter", "offline_kb", "joita_rules"].includes(a.source) || !text(a.language, 50) || !text(a.date, 40) || !Number.isFinite(Date.parse(a.date))) return false;
  }
  return true;
}

export function caseObservation(input: { id: string; draft: ObservationDraft; advisory: AdvisorySnapshot; stage: string; location: string; caseId?: string }, entries: Observation[], now = new Date().toISOString()): Observation {
  const existing = entries.find(entry => entry.advisory?.questionId === input.advisory.questionId && (input.caseId ? entry.caseId === input.caseId : Boolean(entry.caseInfo)));
  if (existing) return existing;
  if (input.advisory.source === "joita_rules") throw new Error("case_rules");
  if (entries.length >= 300) throw new Error("case_limit");
  const data = validateObservation(input.draft);
  const root = input.caseId ? entries.find(entry => entry.id === input.caseId && entry.caseInfo) : undefined;
  if (input.caseId && !root) throw new Error("case_missing");
  if (root?.caseInfo?.status === "closed") throw new Error("case_closed");
  if (root && (data.crop !== root.crop || data.plot !== root.plot)) throw new Error("case_identity");
  const result: Observation = {
    ...data, id: input.id, caseId: root?.id || input.id, advisory: input.advisory,
    ...(!root ? { caseInfo: { status: "monitoring" as const, stage: input.stage, location: input.location, createdAt: now } } : {}),
  };
  if (!validCaseData(result as unknown as Record<string, unknown>)) throw new Error("case_data");
  return result;
}
export type ObservationDraft = Omit<
  Observation,
  "id" | "checked" | "affected"
> & { checked: string; affected: string };
export function validateObservation(
  draft: ObservationDraft,
  today = localDay(),
): Omit<Observation, "id"> {
  if (
    !draft.crop.trim() ||
    !draft.plot.trim() ||
    draft.crop.length > 80 ||
    draft.plot.length > 80
  )
    throw new Error("identity");
  if (!isDay(draft.date) || draft.date > today) throw new Error("date");
  if (
    !draft.symptoms.trim() ||
    draft.symptoms.length > 800 ||
    draft.action.length > 500
  )
    throw new Error("notes");
  const checked = draft.checked === "" ? null : Number(draft.checked);
  const affected = draft.affected === "" ? null : Number(draft.affected);
  if (
    (checked === null) !== (affected === null) ||
    (checked !== null &&
      (!Number.isInteger(checked) ||
        checked < 1 ||
        checked > 10000 ||
        !Number.isInteger(affected) ||
        affected! < 0 ||
        affected! > checked))
  )
    throw new Error("counts");
  return {
    crop: draft.crop.trim(),
    plot: draft.plot.trim(),
    date: draft.date,
    symptoms: draft.symptoms.trim(),
    action: draft.action.trim(),
    checked,
    affected,
  };
}
export function incidence(entry: Pick<Observation, "checked" | "affected">) {
  return entry.checked && entry.affected !== null
    ? (entry.affected / entry.checked) * 100
    : null;
}
export function observationTrend(entries: Observation[]) {
  if (new Set(entries.map((e) => JSON.stringify([e.crop, e.plot]))).size !== 1)
    return null;
  const measured = entries
    .filter((e) => incidence(e) !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const last = measured[0];
  const previous = measured.find((e) => e.date < last?.date);
  if (!last || !previous) return null;
  return {
    latest: incidence(last)!,
    previous: incidence(previous)!,
    change: incidence(last)! - incidence(previous)!,
    latestDate: last.date,
    previousDate: previous.date,
  };
}
export function observationRecheck(
  entry: Observation,
  due: string,
  hindi = false,
): Plan {
  if (!isDay(due) || due < localDay()) throw new Error("followup");
  return {
    id: `diary-${entry.id}`,
    crop: entry.crop,
    sowing: "",
    task: `${hindi ? "लक्षण दोबारा देखें" : "Recheck symptoms"}: ${entry.plot}`,
    due,
    done: false,
  };
}
export function fieldReport(entries: Observation[], hindi = false) {
  const lines = [
    hindi
      ? "JOITAFA - खेत की निरीक्षण रिपोर्ट"
      : "JOITAFA - field observation report",
    hindi
      ? "किसान के दर्ज किए हुए अवलोकन। पुष्टि किया हुआ निदान नहीं।"
      : "Farmer-recorded observations, not a confirmed diagnosis.",
    "",
  ];
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    lines.push(
      `${e.date} | ${e.crop} | ${e.plot}`,
      `${hindi ? "लक्षण" : "Symptoms"}: ${e.symptoms}`,
      `${hindi ? "किया गया काम" : "Action taken"}: ${e.action || "-"}`,
      e.checked === null
        ? hindi
          ? "पौधों की गिनती दर्ज नहीं है।"
          : "Plant counts not recorded."
        : `${e.affected}/${e.checked} (${incidence(e)!.toFixed(1)}%) ${hindi ? "जांचे गए पौधों में लक्षण" : "sampled plants affected"}`,
      "",
    );
    if (e.caseInfo) lines.push(`${hindi ? "मामले की स्थिति" : "Case status"}: ${e.caseInfo.status === "closed" ? (hindi ? "किसान ने बंद किया" : "Closed by farmer") : (hindi ? "निगरानी जारी" : "Monitoring")}`);
    if (e.advisory) lines.push(
      `${hindi ? "सहेजी गई AI सलाह" : "Saved AI advisory"} (${e.advisory.date}; ${e.advisory.source === "offline_kb" ? "Offline KB" : "JOITA Live AI"}):`, e.advisory.answer,
      hindi ? "यह स्वतंत्र विशेषज्ञ की पुष्टि नहीं है।" : "This is not an independent expert verification.", "",
    );
  }
  lines.push(
    hindi
      ? "ये गिनती केवल जांचे गए पौधों की है, पूरे खेत या उपचार की सफलता का प्रमाण नहीं। इलाज से पहले स्थानीय KVK या कृषि विशेषज्ञ से पुष्टि करें।"
      : "Counts describe the inspected sample, not the whole field or proof that a treatment worked. Confirm treatment decisions with a local KVK or agriculture expert.",
  );
  return lines.join("\n");
}
