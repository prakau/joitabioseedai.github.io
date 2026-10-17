import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { ClipboardList, Save } from "lucide-react";
import { caseObservation, DIARY_KEY, observationRecheck, type AdvisorySnapshot, type Observation } from "../lib/field-diary";
import { localDay, PLAN_KEY, type Plan } from "../lib/planning";
import { readStored, uid, useStored } from "../lib/storage";
import { readDiary } from "../lib/record-backup";
import { useInterface } from "../lib/interface";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Field, Notice } from "./workspace";

export function SaveCropCase({ advisory, crop, plot, stage, location, action, caseId }: {
  advisory: AdvisorySnapshot; crop: string; plot: string; stage: string; location: string; action: string; caseId?: string;
}) {
  const { language } = useInterface(); const hi = language === "hi";
  const l = (en: string, hindi: string) => hi ? hindi : en;
  const [entries, saveEntries] = useStored<Observation[]>(DIARY_KEY, []);
  const [plans, savePlans] = useStored<Plan[]>(PLAN_KEY, []);
  const root = caseId ? entries.find(entry => entry.id === caseId && entry.caseInfo) : undefined;
  const existing = entries.find(entry => entry.advisory?.questionId === advisory.questionId && (caseId ? entry.caseId === caseId : Boolean(entry.caseInfo)));
  const id = useRef(uid());
  const [draft, setDraft] = useState({ crop: root?.crop || crop, plot: root?.plot || plot, date: Number.isFinite(Date.parse(advisory.date)) ? localDay(new Date(advisory.date)) : localDay(), symptoms: advisory.question.slice(0, 800), action, checked: "", affected: "" });
  const [due, setDue] = useState(() => { const day = new Date(); day.setDate(day.getDate() + 2); return localDay(day); });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const scheduled = existing && plans.some(plan => plan.id === `diary-${existing.id}`);
  const errors: Record<string, string> = {
    identity: l("Enter a crop and plot name, up to 80 characters each.", "फसल और खेत का नाम लिखें, प्रत्येक अधिकतम 80 अक्षर।"),
    notes: l("Describe the observed symptoms before saving.", "सहेजने से पहले देखे गए लक्षण लिखें।"),
    date: l("Use today's date or an earlier observation date.", "निरीक्षण की तारीख आज या उससे पहले की रखें।"),
    followup: l("Choose today or a future recheck date.", "दोबारा जांच की तारीख आज या भविष्य की चुनें।"),
    case_missing: l("This crop case was removed. Open the diary before continuing.", "यह मामला हटा दिया गया है। पहले डायरी खोलें।"),
    case_closed: l("Reopen this case in Crop Diary before adding a follow-up.", "दोबारा निरीक्षण जोड़ने से पहले फसल डायरी में मामला खोलें।"),
    case_identity: l("Keep the crop and plot of the original case.", "मूल मामले की फसल और खेत का नाम ही रखें।"),
    case_limit: l("Export and remove older observations before adding more.", "नए रिकॉर्ड से पहले पुराने निरीक्षण निर्यात करके हटाएं।"),
  };
  function save() {
    setError(""); setMessage("");
    try {
      const current = readDiary(localStorage);
      const entry = caseObservation({ id: id.current, draft, advisory, stage, location, caseId }, current);
      if ((entry.caseInfo || current.find(row => row.id === entry.caseId)?.caseInfo)?.status === "closed") throw new Error("case_closed");
      const task = observationRecheck(entry, due, hi);
      if (!current.some(row => row.id === entry.id) && !saveEntries([entry, ...current])) return;
      const tasks = readStored<Plan[]>(PLAN_KEY, []);
      if (!tasks.some(row => row.id === task.id)) {
        if (tasks.length >= 1000 || !savePlans([task, ...tasks])) {
          setError(l("Case saved. The calendar recheck could not be saved; retry after freeing space.", "मामला सहेजा गया। कैलेंडर जांच नहीं सहेजी गई; जगह खाली करके फिर प्रयास करें।")); return;
        }
      }
      setMessage(l("Case and calendar recheck saved on this device.", "मामला और कैलेंडर में जांच इस डिवाइस पर सहेजे गए।"));
    } catch (e) { setError(errors[(e as Error).message] || l("The crop case could not be saved. Check the fields and try again.", "मामला नहीं सहेजा गया। जानकारी जांचें और फिर प्रयास करें।")); }
  }
  return <details className="save-crop-case" open={caseId ? true : undefined}>
    <summary><ClipboardList size={19} />{l(caseId ? "Record this follow-up" : "Save a crop case & recheck", caseId ? "यह दोबारा निरीक्षण दर्ज करें" : "फसल का मामला और दोबारा जांच सहेजें")}</summary>
    <p>{l("Keep the observations and this advisory together in Crop Diary. Photos are not stored in the case.", "अवलोकन और यह सलाह फसल डायरी में साथ रखें। मामले में फोटो नहीं सहेजी जातीं।")}</p>
    <form onSubmit={event => { event.preventDefault(); save(); }}>
      <div className="fields fields-2">
        <Field label={l("Case crop", "मामले की फसल")}><Input required maxLength={80} readOnly={Boolean(root)} value={draft.crop} onChange={e => setDraft({ ...draft, crop: e.target.value })} /></Field>
        <Field label={l("Case plot", "मामले का खेत")}><Input required maxLength={80} readOnly={Boolean(root)} value={draft.plot} onChange={e => setDraft({ ...draft, plot: e.target.value })} /></Field>
        <Field label={l("Case observation date", "मामले के निरीक्षण की तारीख")}><Input required type="date" max={localDay()} value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></Field>
        <Field label={l("Case recheck date", "मामले की दोबारा जांच की तारीख")}><Input required type="date" min={localDay()} value={due} onChange={e => setDue(e.target.value)} /></Field>
      </div>
      <Field label={l("Observed symptoms for the case", "मामले में देखे गए लक्षण")}><Textarea required maxLength={800} value={draft.symptoms} onChange={e => setDraft({ ...draft, symptoms: e.target.value })} /></Field>
      <Field label={l("Action already taken for this case (optional)", "मामले में पहले किया गया काम (वैकल्पिक)")}><Textarea maxLength={500} value={draft.action} onChange={e => setDraft({ ...draft, action: e.target.value })} /></Field>
      <Button type="submit" disabled={Boolean(scheduled)}><Save size={18} />{l(scheduled ? "Case already saved" : "Save case & recheck", scheduled ? "मामला सहेजा जा चुका है" : "मामला और दोबारा जांच सहेजें")}</Button>
    </form>
    {message && <Notice>{message}</Notice>}{error && <Notice error>{error}</Notice>}
    {existing && <NavLink className="text-link" to={`/diary?case=${encodeURIComponent(existing.caseId || existing.id)}`}>{l("Open this crop case", "फसल का यह मामला खोलें")}</NavLink>}
    <small>{l("Rechecks appear in JOITAFA Calendar. Export the task for phone-calendar reminders.", "दोबारा जांच JOITAFA कैलेंडर में दिखेगी। फोन के कैलेंडर में याद दिलाने के लिए काम निर्यात करें।")}</small>
  </details>;
}
