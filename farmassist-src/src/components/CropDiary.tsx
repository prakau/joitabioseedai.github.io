import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  CalendarPlus,
  ClipboardList,
  Download,
  Pencil,
  Save,
  Share2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  DIARY_KEY,
  fieldReport,
  incidence,
  observationRecheck,
  observationTrend,
  validateObservation,
  type Observation,
  type ObservationDraft,
} from "../lib/field-diary";
import { useInterface } from "../lib/interface";
import { localDay, PLAN_KEY, type Plan } from "../lib/planning";
import { copyText, shareText } from "../lib/platform";
import { downloadText, readStored, uid, useStored } from "../lib/storage";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Empty, Field, Notice, Select, Title } from "./workspace";
import { CropCases } from "./CropCases";
import { readDiary } from "../lib/record-backup";

export function CropDiary() {
  const { language } = useInterface();
  const hi = language === "hi";
  const l = (en: string, hindi: string) => (hi ? hindi : en);
  const query = new URLSearchParams(useLocation().search);
  const caseId = query.get("case")?.slice(0, 200) || "";
  const blank = (): ObservationDraft => {
    const root = readStored<Observation[]>(DIARY_KEY, []).find(entry => entry.id === caseId && entry.caseInfo);
    return ({
    crop: root?.crop || query.get("crop")?.slice(0, 80) || "",
    plot: root?.plot || "",
    date: localDay(),
    symptoms: query.get("symptoms")?.slice(0, 800) || "",
    action: "",
    checked: "",
    affected: "",
  }); };
  const [entries, saveEntries] = useStored<Observation[]>(DIARY_KEY, []);
  const [plans, savePlans] = useStored<Plan[]>(PLAN_KEY, []);
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState("");
  const [deleted, setDeleted] = useState<Observation | null>(null);
  const [filter, setFilter] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [due, setDue] = useState(localDay());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const key = (entry: Observation) => JSON.stringify([entry.crop, entry.plot]);
  const groups = [...new Set(entries.map(key))].sort();
  const filtered = entries
    .filter((e) => (!filter || key(e) === filter) && (!caseId || e.id === caseId || e.caseId === caseId))
    .sort((a, b) => b.date.localeCompare(a.date));
  const trend = observationTrend(filtered);
  const report = fieldReport(filtered, hi);
  useEffect(() => { setDraft(blank()); setEditing(""); setFilter(""); }, [caseId]);
  const errors: Record<string, string> = {
    identity: l(
      "Enter a crop and plot name (up to 80 characters each).",
      "फसल और खेत का नाम लिखें (प्रत्येक अधिकतम 80 अक्षर)।",
    ),
    date: l(
      "Use the observation date, today or earlier.",
      "निरीक्षण की तारीख आज या उससे पहले की रखें।",
    ),
    notes: l(
      "Describe the symptoms in up to 800 characters; actions up to 500.",
      "लक्षण अधिकतम 800 अक्षरों में और किया गया काम 500 अक्षरों में लिखें।",
    ),
    counts: l(
      "Enter both counts or leave both blank. Affected plants cannot exceed plants checked (1–10,000).",
      "दोनों गिनती भरें या दोनों खाली छोड़ें। प्रभावित पौधे जांचे गए पौधों (1–10,000) से अधिक नहीं हो सकते।",
    ),
    followup: l(
      "Choose today or a future recheck date.",
      "दोबारा जांच की तारीख आज या भविष्य की चुनें।",
    ),
  };
  function save() {
    setError("");
    setMessage("");
    try {
      const data = validateObservation(draft);
      const current = readDiary(localStorage);
      if (editing && !current.some((e) => e.id === editing))
        throw new Error(
          l(
            "This observation was removed. Cancel the edit.",
            "यह रिकॉर्ड हटा दिया गया है। संपादन रद्द करें।",
          ),
        );
      if (!editing && current.length >= 300)
        throw new Error(
          l(
            "Export and remove older observations before adding more.",
            "नए रिकॉर्ड से पहले पुराने रिकॉर्ड निर्यात करके हटाएं।",
          ),
        );
      const linked = current.find(entry => entry.id === editing)?.caseId || caseId;
      const root = linked ? current.find(entry => entry.id === linked && entry.caseInfo) : undefined;
      if (!editing && caseId && (!root || root.caseInfo?.status === "closed")) throw new Error(l("Open an active crop case before adding an observation.", "निरीक्षण जोड़ने से पहले सक्रिय मामला खोलें।"));
      if (root && (data.crop !== root.crop || data.plot !== root.plot)) throw new Error(l("Keep the crop and plot of this case.", "मामले की फसल और खेत का नाम ही रखें।"));
      const entry = { ...current.find(e => e.id === editing), ...data, id: editing || uid(), ...(!editing && root ? { caseId: root.id } : {}) };
      if (
        saveEntries(
          editing
            ? current.map((e) => (e.id === editing ? entry : e))
            : [entry, ...current],
        )
      ) {
        setEditing("");
        setDraft({ ...blank(), crop: data.crop, plot: data.plot });
        setFilter(key(entry));
        setMessage(
          l(
            "Observation saved on this device.",
            "निरीक्षण इस डिवाइस पर सहेजा गया।",
          ),
        );
      }
    } catch (e) {
      const code = (e as Error).message;
      setError(errors[code] || code);
    }
  }
  async function share() {
    setError("");
    setMessage("");
    try {
      if (await shareText("JOITAFA field report", report))
        setMessage(l("Share request opened.", "शेयर का विकल्प खोला गया।"));
      else {
        await copyText(report);
        setMessage(
          l(
            "Report copied. Paste it into your message to an expert.",
            "रिपोर्ट कॉपी हुई। विशेषज्ञ को भेजे जाने वाले संदेश में पेस्ट करें।",
          ),
        );
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError(
          l(
            "Sharing unavailable. Download the report instead.",
            "शेयर उपलब्ध नहीं है। रिपोर्ट डाउनलोड करें।",
          ),
        );
    }
  }
  return (
    <>
      <Title
        title={l("Crop diary", "फसल डायरी")}
        description={l(
          "Field observations, rechecks, and an expert-ready record.",
          "खेत के अवलोकन, दोबारा जांच और विशेषज्ञ के लिए रिकॉर्ड।",
        )}
      />
      <div className="field-workflow-strip">
        <ClipboardList size={24} />
        <p>
          {l(
            "Your observations stay on this device. Only share a report with people you choose.",
            "अवलोकन इस डिवाइस पर रहते हैं। रिपोर्ट केवल अपनी पसंद के लोगों से साझा करें।",
          )}
        </p>
      </div>
      <CropCases selected={caseId} />
      <section className="section-divider">
        <h3>
          {editing
            ? l("Edit observation", "निरीक्षण बदलें")
            : l("Record a field check", "खेत की जांच दर्ज करें")}
        </h3>
        <form
          id="diary-observation-form"
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="fields fields-3">
            <Field label={l("Crop name", "फसल का नाम")}>
              <Input
                required
                readOnly={Boolean(caseId)}
                maxLength={80}
                value={draft.crop}
                onChange={(e) => setDraft({ ...draft, crop: e.target.value })}
              />
            </Field>
            <Field label={l("Plot name", "खेत का नाम")}>
              <Input
                required
                readOnly={Boolean(caseId)}
                maxLength={80}
                value={draft.plot}
                onChange={(e) => setDraft({ ...draft, plot: e.target.value })}
              />
            </Field>
            <Field label={l("Observation date", "निरीक्षण की तारीख")}>
              <Input
                required
                type="date"
                max={localDay()}
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
          </div>
          <div className="fields fields-2">
            <Field label={l("Symptoms observed", "देखे गए लक्षण")}>
              <Textarea
                required
                maxLength={800}
                value={draft.symptoms}
                onChange={(e) =>
                  setDraft({ ...draft, symptoms: e.target.value })
                }
              />
            </Field>
            <Field
              label={l(
                "Action already taken (optional)",
                "पहले किया गया काम (वैकल्पिक)",
              )}
            >
              <Textarea
                maxLength={500}
                value={draft.action}
                onChange={(e) => setDraft({ ...draft, action: e.target.value })}
              />
            </Field>
            <Field
              label={l("Plants checked (optional)", "जांचे गए पौधे (वैकल्पिक)")}
            >
              <Input
                type="number"
                min={1}
                max={10000}
                step={1}
                value={draft.checked}
                onChange={(e) =>
                  setDraft({ ...draft, checked: e.target.value })
                }
              />
            </Field>
            <Field
              label={l(
                "Plants with symptoms (optional)",
                "लक्षण वाले पौधे (वैकल्पिक)",
              )}
            >
              <Input
                type="number"
                min={0}
                max={10000}
                step={1}
                value={draft.affected}
                onChange={(e) =>
                  setDraft({ ...draft, affected: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="actions">
            <Button type="submit">
              <Save size={18} />
              {l("Save observation", "निरीक्षण सहेजें")}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing("");
                  setDraft(blank());
                }}
              >
                <X size={18} />
                {l("Cancel", "रद्द करें")}
              </Button>
            )}
          </div>
        </form>
      </section>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <section className="section-divider">
        <div className="section-row">
          <h3>{l("Observation history", "निरीक्षण का इतिहास")}</h3>
          <Button
            variant="secondary"
            disabled={!filtered.length}
            onClick={() => setReportOpen(!reportOpen)}
            aria-expanded={reportOpen}
          >
            <Share2 size={18} />
            {l("Expert report", "विशेषज्ञ रिपोर्ट")}
          </Button>
        </div>
        <div className="fields fields-2">
          <Field label={l("Crop and plot", "फसल और खेत")}>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">{l("All observations", "सभी अवलोकन")}</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {JSON.parse(group).join(" / ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={l("Recheck due date", "दोबारा जांच की तारीख")}>
            <Input
              type="date"
              min={localDay()}
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </Field>
        </div>
        <p className="muted">
          {l(
            "Rechecks appear in your JOITAFA calendar; no background phone alerts. Export a calendar task to use your calendar app.",
            "दोबारा जांच JOITAFA कैलेंडर में दिखेगी; फोन पर अपने आप अलर्ट नहीं आएगा। अपने कैलेंडर ऐप के लिए काम निर्यात करें।",
          )}
        </p>
        {trend && (
          <div className="field-trend">
            <strong>
              {trend.change > 0 ? "+" : ""}
              {trend.change.toFixed(1)} {l("percentage points", "प्रतिशत अंक")}
            </strong>
            <span>
              {trend.previousDate}: {trend.previous.toFixed(1)}% →{" "}
              {trend.latestDate}: {trend.latest.toFixed(1)}%
            </span>
            <p>
              {l(
                "Change in sampled plants with symptoms, not a diagnosis or proof of treatment effectiveness. Compare similar sampling locations and methods.",
                "जांचे गए पौधों में लक्षणों का बदलाव, निदान या उपचार की सफलता का प्रमाण नहीं। समान स्थान और तरीके की गिनती की तुलना करें।",
              )}
            </p>
          </div>
        )}
        {reportOpen && (
          <div className="report-preview">
            <h4>{l("Review before sharing", "साझा करने से पहले देखें")}</h4>
            <pre>{report}</pre>
            <div className="actions">
              <Button onClick={() => void share()}>
                <Share2 size={18} />
                {l("Share report", "रिपोर्ट साझा करें")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => downloadText("JOITAFA-field-report.txt", report)}
              >
                <Download size={18} />
                {l("Download report", "रिपोर्ट डाउनलोड करें")}
              </Button>
            </div>
          </div>
        )}
        {!filtered.length && (
          <Empty>
            {l(
              "No observations recorded yet.",
              "अभी कोई निरीक्षण दर्ज नहीं है।",
            )}
          </Empty>
        )}
        <div className="observation-list">
          {filtered.map((entry) => (
            <article className="observation-row" key={entry.id}>
              <div className="section-row">
                <h4>
                  {entry.crop} / {entry.plot}
                </h4>
                <time dateTime={entry.date}>{entry.date}</time>
              </div>
              <p>{entry.symptoms}</p>
              {entry.action && (
                <p>
                  <strong>{l("Action taken", "किया गया काम")}: </strong>
                  {entry.action}
                </p>
              )}
              {incidence(entry) !== null && (
                <div className="sample-measure">
                  <span>
                    {entry.affected}/{entry.checked} ·{" "}
                    {incidence(entry)!.toFixed(1)}%{" "}
                    {l(
                      "of sampled plants affected",
                      "जांचे गए पौधों में लक्षण",
                    )}
                  </span>
                  <meter
                    min={0}
                    max={100}
                    value={incidence(entry)!}
                    aria-label={l(
                      "Sample affected percentage",
                      "प्रभावित नमूने का प्रतिशत",
                    )}
                  />
                </div>
              )}
              <div className="actions">
                <Button
                  variant="secondary"
                  disabled={plans.some((p) => p.id === `diary-${entry.id}`)}
                  onClick={() => {
                    setError("");
                    setMessage("");
                    try {
                      const task = observationRecheck(entry, due, hi);
                      const current = readStored<Plan[]>(PLAN_KEY, []);
                      if (current.some((p) => p.id === task.id)) return;
                      if (current.length >= 1000)
                        throw new Error(
                          l(
                            "Export and remove older calendar tasks first.",
                            "पहले पुराने कैलेंडर काम निर्यात करके हटाएं।",
                          ),
                        );
                      if (savePlans([task, ...current]))
                        setMessage(
                          l(
                            "Recheck saved in Calendar.",
                            "दोबारा जांच कैलेंडर में सहेजी गई।",
                          ),
                        );
                    } catch (e) {
                      setError(
                        errors[(e as Error).message] || (e as Error).message,
                      );
                    }
                  }}
                >
                  <CalendarPlus size={17} />
                  {plans.some((p) => p.id === `diary-${entry.id}`)
                    ? l("Recheck scheduled", "जांच तय है")
                    : l("Schedule recheck", "दोबारा जांच तय करें")}
                </Button>
                <NavLink className="text-link" to="/calendar">
                  {l("Calendar", "कैलेंडर")}
                </NavLink>
                <button
                  className="icon-action"
                  title={l("Edit observation", "निरीक्षण बदलें")}
                  aria-label={l("Edit observation", "निरीक्षण बदलें")}
                  onClick={() => {
                    setEditing(entry.id);
                    setDraft({
                      ...entry,
                      checked: entry.checked?.toString() || "",
                      affected: entry.affected?.toString() ?? "",
                    });
                    form.current?.scrollIntoView({ block: "center" });
                    form.current
                      ?.querySelector("input")
                      ?.focus({ preventScroll: true });
                  }}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-action"
                  title={l("Delete observation", "निरीक्षण हटाएं")}
                  aria-label={l("Delete observation", "निरीक्षण हटाएं")}
                  disabled={Boolean(entry.caseInfo && entries.some(row => row.caseId === entry.id && row.id !== entry.id))}
                  onClick={() => {
                    if (
                      saveEntries(
                        readStored<Observation[]>(DIARY_KEY, []).filter(
                          (e) => e.id !== entry.id,
                        ),
                      )
                    ) {
                      setDeleted(entry);
                      setFilter("");
                      setMessage(
                        l(
                          "Observation removed. Any calendar recheck remains until you remove it in Calendar.",
                          "निरीक्षण हटाया गया। तय जांच हटाने के लिए कैलेंडर खोलें।",
                        ),
                      );
                    }
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
        {deleted && (
          <Button
            variant="ghost"
            onClick={() => {
              const current = readStored<Observation[]>(DIARY_KEY, []);
              if (
                current.some((e) => e.id === deleted.id) ||
                saveEntries([deleted, ...current])
              )
                setDeleted(null);
            }}
          >
            <Undo2 size={18} />
            {l("Undo deletion", "हटाना वापस लें")}
          </Button>
        )}
      </section>
    </>
  );
}
