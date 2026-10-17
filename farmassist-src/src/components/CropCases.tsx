import { NavLink } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowUpRight, Camera, CheckCircle2, ClipboardPlus, RotateCcw } from "lucide-react";
import { DIARY_KEY, incidence, type Observation } from "../lib/field-diary";
import { useStored } from "../lib/storage";
import { readDiary } from "../lib/record-backup";
import { useState } from "react";
import { useInterface } from "../lib/interface";
import { answerLanguage } from "../lib/languages";
import { Button } from "./ui/button";
import { Empty, Notice } from "./workspace";

export function CropCases({ selected = "" }: { selected?: string }) {
  const { language } = useInterface(); const hi = language === "hi";
  const l = (en: string, hindi: string) => hi ? hindi : en;
  const [entries, saveEntries] = useStored<Observation[]>(DIARY_KEY, []);
  const [error, setError] = useState("");
  const roots = entries.filter(entry => entry.caseInfo);
  const root = roots.find(entry => entry.id === selected);
  const timeline = root ? entries.filter(entry => entry.id === root.id || entry.caseId === root.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  return <section className="crop-cases section-divider" aria-labelledby="crop-cases-title">
    <div className="section-row"><h3 id="crop-cases-title">{l("Your crop cases", "आपकी फसल के मामले")}</h3><NavLink className="text-link" to="/diagnose"><Camera size={17} />{l("New crop check", "फसल की नई जांच")}</NavLink></div>
    {!roots.length && <Empty>{l("A saved crop case connects an advisory with your observations and rechecks.", "सहेजा हुआ मामला सलाह, आपके निरीक्षण और दोबारा जांच को साथ रखता है।")}</Empty>}
    {selected && !root && <Notice error>{l("This crop case is not on this device. Open all observations or restore your backup.", "यह मामला इस डिवाइस पर नहीं है। सभी निरीक्षण खोलें या अपना बैकअप वापस लाएं।")} <NavLink to="/diary">{l("All observations", "सभी निरीक्षण")}</NavLink></Notice>}
    {!selected && <div className="crop-case-list">{roots.map(entry => <NavLink key={entry.id} to={`/diary?case=${encodeURIComponent(entry.id)}`}>
      <span><strong>{entry.crop} / {entry.plot}</strong><small>{entry.date} · {entries.filter(row => row.id === entry.id || row.caseId === entry.id).length} {l("observations", "निरीक्षण")}</small></span>
      <span className="case-status">{entry.caseInfo?.status === "closed" ? l("Closed by farmer", "किसान ने बंद किया") : l("Monitoring", "निगरानी जारी")}</span><ArrowUpRight size={18} />
    </NavLink>)}</div>}
    {root && <>
      <div className="case-overview">
        <div><span className="eyebrow">{l("CROP CASE", "फसल का मामला")}</span><h3>{root.crop} / {root.plot}</h3><p>{root.caseInfo?.location} · {root.caseInfo?.stage}</p></div>
        <span className="case-status">{root.caseInfo?.status === "closed" ? l("Closed by farmer", "किसान ने बंद किया") : l("Monitoring", "निगरानी जारी")}</span>
      </div>
      <div className="actions">
        {root.caseInfo?.status !== "closed" && <>
          <NavLink className="primary-link" to={`/diagnose?case=${encodeURIComponent(root.id)}`}><Camera size={18} />{l("Add a photo follow-up", "फोटो से दोबारा जांच करें")}</NavLink>
          <Button variant="secondary" onClick={() => { const form = document.getElementById("diary-observation-form"); form?.scrollIntoView({ block: "start" }); form?.querySelector("textarea")?.focus({ preventScroll: true }); }}><ClipboardPlus size={18} />{l("Add a field observation", "खेत का निरीक्षण जोड़ें")}</Button>
        </>}
        <Button variant="ghost" onClick={() => {
          setError("");
          try {
            const current = readDiary(localStorage);
            saveEntries(current.map(entry => entry.id === root.id && entry.caseInfo ? { ...entry, caseInfo: { ...entry.caseInfo, status: entry.caseInfo.status === "closed" ? "monitoring" : "closed" } } : entry));
          } catch { setError(l("Diary data could not be read. Use Settings recovery before changing this case.", "डायरी का डेटा नहीं पढ़ा गया। मामला बदलने से पहले सेटिंग्स में रिकॉर्ड वापस लाएं।")); }
        }}>{root.caseInfo?.status === "closed" ? <RotateCcw size={17} /> : <CheckCircle2 size={17} />}{root.caseInfo?.status === "closed" ? l("Reopen case", "मामला फिर खोलें") : l("Close case", "मामला बंद करें")}</Button>
        <NavLink className="text-link" to="/diary">{l("All crop cases", "फसल के सभी मामले")}</NavLink>
      </div>
      {error && <Notice error>{error}</Notice>}
      {root.caseInfo?.status === "closed" && <p className="muted">{l("You closed this case. Review any remaining recheck tasks in Calendar.", "आपने यह मामला बंद किया है। कैलेंडर में बाकी जांच के काम देखें।")} <NavLink to="/calendar">{l("Calendar", "कैलेंडर")}</NavLink></p>}
      <ol className="case-timeline">{timeline.map(entry => <li key={entry.id}>
        <div className="section-row"><time dateTime={entry.date}>{entry.date}</time><strong>{entry.id === root.id ? l("First observation", "पहला निरीक्षण") : l("Follow-up observation", "दोबारा निरीक्षण")}</strong></div>
        <p>{entry.symptoms}</p>{entry.action && <p><strong>{l("Action taken", "किया गया काम")}: </strong>{entry.action}</p>}
        {incidence(entry) !== null && <p>{entry.affected}/{entry.checked} · {incidence(entry)!.toFixed(1)}% {l("of sampled plants with symptoms", "जांचे गए पौधों में लक्षण")}</p>}
        {entry.advisory && <details className="case-advisory"><summary>{l("Read the saved advisory", "सहेजी गई सलाह पढ़ें")} · {entry.advisory.source === "offline_kb" ? "Offline KB" : "JOITA Live AI"}</summary>
          <div lang={answerLanguage(entry.advisory.language).locale} dir={entry.advisory.language === "Urdu" ? "rtl" : "ltr"}><ReactMarkdown>{entry.advisory.answer}</ReactMarkdown></div>
          <small>{l("Captured at the time of this check. Confirm treatment decisions with a local expert.", "इस जांच के समय सहेजी गई सलाह। उपचार का निर्णय स्थानीय विशेषज्ञ से पुष्टि करके लें।")}</small>
        </details>}
      </li>)}</ol>
    </>}
  </section>;
}
