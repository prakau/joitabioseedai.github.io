import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Archive, CalendarPlus, Check, Pencil, RotateCcw, Save, Sprout, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Empty, Field, Notice, Select, Title } from "./workspace";
import { useInterface } from "../lib/interface";
import { timestamp, uid, useStored, writeStored } from "../lib/storage";
import { localDay, PLAN_KEY } from "../lib/planning";
import { ACTIVE_SEASON_KEY, SEASON_KEY, daysAfterSowing, duplicateSeason, irrigationTypes, readSeasonPlans, readSeasons, seasonStages, seasonTask, validSeason, type CropSeason } from "../lib/crop-seasons";
import { cropGuides } from "../data/agriculture";

const stageHindi: Record<string, string> = { "not sure": "पता नहीं", planned: "बुवाई की योजना", sowing: "बुवाई", seedling: "अंकुर", vegetative: "बढ़वार", flowering: "फूल", fruiting: "फल", "grain filling": "दाना भरना", harvest: "कटाई" };
const irrigationHindi: Record<string, string> = { "not sure": "दर्ज नहीं", rainfed: "वर्षा आधारित", drip: "ड्रिप", furrow: "नाली", sprinkler: "फव्वारा" };
function blank(): CropSeason { const now = timestamp(); return { id: uid(), plot: "", crop: "", district: "", state: "", sowing: "", stage: "not sure", area: "", areaUnit: "acre", irrigation: "not sure", notes: "", status: "active", createdAt: now, updatedAt: now }; }

export function CropSeasons() {
  const { language } = useInterface();
  const hindi = language === "hi", l = (en: string, hi: string) => hindi ? hi : en;
  const [, saveRows] = useStored<CropSeason[]>(SEASON_KEY, []);
  const [activeId, saveActive] = useStored(ACTIVE_SEASON_KEY, "");
  const [draft, setDraft] = useState<CropSeason>(() => blank());
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [due, setDue] = useState(localDay());
  let rows: CropSeason[] = [], damaged = false;
  try { rows = readSeasons(localStorage); } catch { damaged = true; }
  const update = <K extends keyof CropSeason>(key: K, value: CropSeason[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  function fail(en: string, hi: string) { setError(l(en, hi)); setNotice(""); }
  function save() {
    setError(""); setNotice("");
    const next = { ...draft, plot: draft.plot.trim(), crop: draft.crop.trim(), district: draft.district.trim(), state: draft.state.trim(), notes: draft.notes.trim(), updatedAt: timestamp() };
    if (!validSeason(next)) { fail("Enter a field and crop. Check dates, keep district and state within 120 characters together, and enter a positive area or leave it empty.", "खेत और फसल भरें। तारीख जांचें, जिला और राज्य मिलाकर 120 अक्षर तक रखें। सही क्षेत्रफल भरें या खाली रखें।"); return; }
    let current: CropSeason[];
    try { current = readSeasons(localStorage); } catch { fail("Saved crop records need recovery in Settings. Nothing was overwritten.", "सहेजे फसल रिकॉर्ड को सेटिंग्स में सुधारें। कोई रिकॉर्ड नहीं बदला गया।"); return; }
    if (editing && !current.some(row => row.id === next.id && row.updatedAt === draft.updatedAt)) { fail("This record changed in another tab. Reload before editing.", "रिकॉर्ड दूसरे टैब में बदला है। दोबारा खोलें।"); return; }
    if (!editing && current.length >= 30) { fail("The device limit is 30 crop seasons. Export your records in Settings.", "इस डिवाइस पर 30 फसल सीज़न की सीमा है। सेटिंग्स में बैकअप निकालें।"); return; }
    if (duplicateSeason(next, current)) { fail("This field, crop and sowing date are already saved.", "यह खेत, फसल और बुवाई तारीख पहले से सहेजे हैं।"); return; }
    if (!saveRows(editing ? current.map(row => row.id === next.id ? next : row) : [next, ...current])) { fail("Crop season could not be saved. Check device storage.", "फसल सीज़न सहेजा नहीं गया। डिवाइस स्टोरेज जांचें।"); return; }
    setNotice(l("Crop season saved on this device. Select it for new questions.", "फसल सीज़न इस डिवाइस पर सहेजा गया। नए सवाल के लिए इसे चुनें।"));
    setDraft(blank()); setEditing(false);
  }
  function changeStatus(id: string) {
    try {
      const current = readSeasons(localStorage), row = current.find(item => item.id === id);
      if (!row) throw new Error();
      const status = row.status === "active" ? "completed" : "active";
      if (duplicateSeason({ ...row, status }, current)) { fail("A matching active season exists. Edit that record instead.", "मिलता हुआ सीज़न मौजूद है। उसी रिकॉर्ड को बदलें।"); return; }
      if (!saveRows(current.map(item => item.id === id ? { ...item, status, updatedAt: timestamp() } : item))) throw new Error();
      if (activeId === id && status === "completed") saveActive("");
      if (draft.id === id) { setDraft(blank()); setEditing(false); }
      setError(""); setNotice(l("Status saved. Existing calendar tasks keep their original dates; review them in Calendar.", "स्थिति सहेजी। पुराने कैलेंडर काम अपनी तारीख पर रहेंगे; कैलेंडर में उनकी समीक्षा करें।"));
    } catch { fail("The status could not be saved. Check records and device storage.", "स्थिति सहेजी नहीं गई। रिकॉर्ड और स्टोरेज जांचें।"); }
  }
  function addTask(id: string) {
    try {
      const row = readSeasons(localStorage).find(item => item.id === id);
      if (!row) throw new Error("season_invalid");
      const plans = readSeasonPlans(localStorage), plan = seasonTask(row, due, hindi);
      if (plans.some(item => item.id === plan.id)) { setError(""); setNotice(l("A check for this field and date is already in Calendar.", "इस खेत और तारीख की जांच कैलेंडर में पहले से है।")); return; }
      if (plans.length >= 1000) throw new Error("plan_limit");
      if (!writeStored(PLAN_KEY, [plan, ...plans])) throw new Error("storage");
      setError(""); setNotice(l("Field check saved in Calendar. No background notification is scheduled.", "खेत की जांच कैलेंडर में सहेजी। बैकग्राउंड सूचना तय नहीं हुई है।"));
    } catch { fail("Check the due date: it must not be before sowing. If dates are correct, review Calendar records and device storage. No existing task was overwritten.", "जांच की तारीख बुवाई से पहले नहीं हो सकती। तारीख सही हो तो कैलेंडर रिकॉर्ड और स्टोरेज जांचें। पुराना काम नहीं बदला गया।"); }
  }
  const displayed = rows.filter(row => showCompleted || row.status === "active");
  return <>
    <Title title={l("My Crops", "मेरी फसलें")} description={l("Your fields, sowing dates and follow-up checks. Saved on this device, not synced to an account.", "आपके खेत, बुवाई तारीख और अगली जांच। इसी डिवाइस पर सहेजे जाते हैं, खाते में सिंक नहीं होते।")} />
    {damaged && <Notice error>{l("Saved crop records need recovery. Do not clear device data.", "सहेजे फसल रिकॉर्ड को सुधारने की जरूरत है। डिवाइस डेटा न मिटाएं।")} <NavLink to="/settings">{l("Open Settings", "सेटिंग्स खोलें")}</NavLink></Notice>}
    {error && <Notice error>{error}</Notice>}{notice && <Notice>{notice}</Notice>}
    <form className="season-form" onSubmit={event => { event.preventDefault(); save(); }}>
      <div className="section-heading-row"><h3>{editing ? l("Edit crop season", "फसल सीज़न बदलें") : l("Add a crop season", "फसल सीज़न जोड़ें")}</h3><Sprout size={22} aria-hidden="true" /></div>
      <div className="form-grid">
        <Field label={l("Field name", "खेत का नाम")}><Input value={draft.plot} onChange={e => update("plot", e.target.value)} required maxLength={60} /></Field>
        <Field label={l("Crop name", "फसल का नाम")}><Input list="season-crop-options" value={draft.crop} onChange={e => update("crop", e.target.value)} required maxLength={60} /></Field>
        <datalist id="season-crop-options">{cropGuides.map(guide => <option key={guide.crop} value={guide.crop} />)}</datalist>
        <Field label={l("District (optional)", "जिला (वैकल्पिक)")}><Input value={draft.district} onChange={e => update("district", e.target.value)} maxLength={80} /></Field>
        <Field label={l("State (optional)", "राज्य (वैकल्पिक)")}><Input value={draft.state} onChange={e => update("state", e.target.value)} maxLength={80} /></Field>
        <Field label={l("Sowing date (optional)", "बुवाई तारीख (वैकल्पिक)")}><Input type="date" min="1900-01-01" max="2100-12-31" value={draft.sowing} onChange={e => update("sowing", e.target.value)} /></Field>
        <Field label={l("Observed crop stage", "देखी गई फसल अवस्था")}><Select value={draft.stage} onChange={e => update("stage", e.target.value)}>{seasonStages.map(stage => <option key={stage} value={stage}>{hindi ? stageHindi[stage] : stage}</option>)}</Select></Field>
        <Field label={l("Area (optional)", "क्षेत्रफल (वैकल्पिक)")}><Input inputMode="decimal" value={draft.area} onChange={e => update("area", e.target.value)} maxLength={12} /></Field>
        <Field label={l("Area unit", "क्षेत्रफल इकाई")}><Select value={draft.areaUnit} onChange={e => update("areaUnit", e.target.value as CropSeason["areaUnit"])}><option value="acre">{l("Acres", "एकड़")}</option><option value="ha">{l("Hectares", "हेक्टेयर")}</option><option value="m2">{l("Square metres", "वर्ग मीटर")}</option></Select></Field>
        <Field label={l("Irrigation method", "सिंचाई का तरीका")}><Select value={draft.irrigation} onChange={e => update("irrigation", e.target.value)}>{irrigationTypes.map(method => <option key={method} value={method}>{hindi ? irrigationHindi[method] : method}</option>)}</Select></Field>
        <Field label={l("Private notes (optional)", "निजी नोट (वैकल्पिक)")} hint={l("Notes stay in records and are not sent with AI questions.", "नोट रिकॉर्ड में रहेंगे, AI सवाल के साथ नहीं भेजे जाएंगे।")}><Textarea value={draft.notes} onChange={e => update("notes", e.target.value)} maxLength={300} rows={2} /></Field>
      </div>
      <div className="actions"><Button disabled={damaged} type="submit"><Save size={17} />{l("Save crop season", "फसल सीज़न सहेजें")}</Button>{editing && <Button type="button" variant="secondary" onClick={() => { setDraft(blank()); setEditing(false); }}><X size={17} />{l("Cancel edit", "बदलाव रद्द करें")}</Button>}</div>
    </form>
    <section className="season-records" aria-labelledby="season-records-title">
      <div className="section-heading-row"><h3 id="season-records-title">{l("Saved crop seasons", "सहेजे फसल सीज़न")} <small>({displayed.length})</small></h3><label className="check-row"><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />{l("Include completed", "पूरे हुए भी दिखाएं")}</label></div>
      <div className="season-task-date"><Field label={l("Next field check date", "अगली खेत जांच की तारीख")}><Input type="date" min="1900-01-01" max="2100-12-31" value={due} onChange={e => setDue(e.target.value)} /></Field><NavLink to="/calendar">{l("Open Calendar", "कैलेंडर खोलें")}</NavLink></div>
      {!displayed.length && !damaged && <Empty>{l("No crop seasons saved yet. Add your first field above.", "अभी कोई फसल सीज़न नहीं है। ऊपर अपना पहला खेत जोड़ें।")}</Empty>}
      <div className="season-list">{displayed.map(row => { const days = daysAfterSowing(row, localDay()); return <article className={`season-row ${activeId === row.id && row.status === "active" ? "season-selected" : ""}`} key={row.id}>
        <div className="season-summary"><span>{row.status === "completed" ? l("Completed", "पूरा हुआ") : l("Active season", "चालू सीज़न")}</span><h4>{row.plot}</h4><strong>{row.crop}</strong><p>{[row.district, row.state].filter(Boolean).join(", ") || l("Location not recorded", "स्थान दर्ज नहीं")}</p></div>
        <dl><div><dt>{l("Sowing", "बुवाई")}</dt><dd>{row.sowing || l("Not recorded", "दर्ज नहीं")}{days !== null && <small>{days < 0 ? `${-days} ${l("days until sowing", "दिन बुवाई तक")}` : `${days} ${l("days after sowing", "दिन बुवाई के बाद")}`}</small>}</dd></div><div><dt>{l("Stage · farmer-reported", "अवस्था · किसान द्वारा दर्ज")}</dt><dd>{hindi ? stageHindi[row.stage] : row.stage}</dd></div><div><dt>{l("Area / irrigation", "क्षेत्रफल / सिंचाई")}</dt><dd>{row.area ? `${row.area} ${l(row.areaUnit, row.areaUnit === "acre" ? "एकड़" : row.areaUnit === "ha" ? "हेक्टेयर" : "वर्ग मीटर")}` : l("Area not recorded", "क्षेत्रफल दर्ज नहीं")} · {hindi ? irrigationHindi[row.irrigation] : row.irrigation}</dd></div></dl>
        {row.notes && <p className="season-notes">{row.notes}</p>}
        <div className="actions">
          {row.status === "active" && <><Button type="button" variant={activeId === row.id ? "primary" : "secondary"} aria-pressed={activeId === row.id} onClick={() => { if (saveActive(row.id)) { setError(""); setNotice(l("Selected for new crop questions. Existing conversations are unchanged.", "नए फसल सवाल के लिए चुना। पुरानी बातचीत नहीं बदली।")); } }}><Check size={17} />{activeId === row.id ? l("Selected for advice", "सलाह के लिए चुना") : l("Use for new questions", "नए सवाल के लिए चुनें")}</Button><Button type="button" variant="secondary" onClick={() => addTask(row.id)}><CalendarPlus size={17} />{l("Schedule field check", "खेत जांच तय करें")}</Button></>}
          <Button type="button" variant="ghost" onClick={() => { setDraft({ ...row }); setEditing(true); setError(""); setNotice(""); document.querySelector(".season-form")?.scrollIntoView({ block: "start", behavior: "instant" }); }}><Pencil size={17} />{l("Edit", "बदलें")}</Button>
          <Button type="button" variant="ghost" onClick={() => changeStatus(row.id)}>{row.status === "active" ? <Archive size={17} /> : <RotateCcw size={17} />}{row.status === "active" ? l("Complete season", "सीज़न पूरा करें") : l("Reopen season", "सीज़न फिर खोलें")}</Button>
        </div>
      </article>; })}</div>
    </section>
    <p className="pilot-note">{l("Crop stage is your observation, not a prediction from sowing date. Tasks are field checks, not pesticide or fertilizer prescriptions. Editing a season does not rewrite earlier advice or tasks.", "फसल अवस्था आपका अवलोकन है, बुवाई तारीख से अनुमान नहीं। काम खेत की जांच हैं, दवा या खाद की सिफारिश नहीं। सीज़न बदलने से पुरानी सलाह या काम नहीं बदलेंगे।")}</p>
  </>;
}
