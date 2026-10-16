import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Activity, ArrowUpRight, Calculator, CalendarDays, Camera, ClipboardList, CloudSun, Leaf, Map, MessageSquare, Save, Scale, Search, Store, TestTube2, Wallet, X } from "lucide-react";
import { useInterface } from "../lib/interface";

const tools = [
  { id: "diary", icon: ClipboardList, title: "Track crop symptoms", text: "Field observations, rechecks, and expert reports.", terms: "diary records symptoms photo history डायरी रिकॉर्ड लक्षण" },
  { id: "sales", icon: Scale, title: "Compare buyer offers", text: "Sale value after transport, fees, and commission.", terms: "sale sell buyer price profit selling बिक्री भाव खरीदार" },
  { id: "diagnose", icon: Camera, title: "Check a crop photo", text: "Visible symptoms and the next field checks.", terms: "photo camera disease pest insect तस्वीर फोटो रोग कीट" },
  { id: "visualizer", icon: Map, title: "Plan your field", text: "layouts saved. Dimensions, rows, and irrigation.", terms: "3d map layout drainage plot खेत नक्शा कतार" },
  { id: "weather", icon: CloudSun, title: "Check local weather", text: "Location-specific forecast with dated observations.", terms: "rain temperature forecast weather बारिश मौसम तापमान" },
  { id: "soil", icon: TestTube2, title: "Read your soil test", text: "Measured values, explicit units, and soil context.", terms: "soil ph salinity nutrients test मिट्टी जांच पोषक" },
  { id: "calendar", icon: CalendarDays, title: "Plan crop tasks", text: "Search growing windows and save dated tasks.", terms: "calendar tasks sow harvest planting reminders कैलेंडर बुवाई काम" },
  { id: "sound", icon: Activity, title: "Record field sound", text: "Measure sound activity and review nearby records.", terms: "ehi audio recording microphone biodiversity आवाज ध्वनि" },
  { id: "calculators", icon: Calculator, title: "Calculate field quantities", text: "Area, seed quantity, water volume and pump time.", terms: "calculator area seed irrigation pump water acre hectare गणना बीज पानी सिंचाई" },
  { id: "ledger", icon: Wallet, title: "Track income & costs", text: "Your crop transactions and recorded balance.", terms: "ledger income cost expense profit money आय खर्च हिसाब लागत" },
  { id: "ask", icon: MessageSquare, title: "Ask a crop question", text: "Live advisory and saved offline crop guides.", terms: "ask answer voice speech language hindi advice पूछें सवाल सलाह भाषा हिंदी" },
  { id: "market", icon: Store, title: "Compare mandi prices", text: "Dated AGMARKNET records", terms: "market mandi commodity price rate sale selling बाजार मंडी भाव दाम" },
  { id: "community", icon: Leaf, title: "Keep private field notes", text: "On-device notes with explicit sharing.", terms: "community notes share sharing email समुदाय नोट लिखें साझा" },
  { id: "settings", icon: Save, title: "Protect your farm records", text: "Backups, recovery copies, and offline status.", terms: "settings backup restore recovery export import offline download language बैकअप रिकॉर्ड सेटिंग्स सहेजें ऑफलाइन" },
];

export function FarmTools({ layouts }: { layouts: number }) {
  const { t } = useInterface();
  const [query, setQuery] = useState("");
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = tools.filter(tool => words.every(word =>
    `${tool.title} ${t(tool.title)} ${tool.text} ${t(tool.text)} ${tool.terms}`.toLocaleLowerCase().includes(word)));
  return <section className="farm-tools" aria-labelledby="farm-tools-title">
    <div className="tools-heading">
      <h3 id="farm-tools-title" className="section-heading">{t("Your farm tools")}</h3>
      <div className="tool-search"><Search size={18} aria-hidden="true" />
        <input type="search" aria-label={t("Find a farm tool")} placeholder={t("Search tools, e.g. water or costs")} value={query} maxLength={100} onChange={event => setQuery(event.target.value)} />
        {query && <button type="button" title={t("Clear search")} aria-label={t("Clear search")} onClick={() => setQuery("")}><X size={18} /></button>}
      </div>
    </div>
    <p className="tool-results" aria-live="polite">{matches.length} / {tools.length} {t("tools")}</p>
    {!matches.length && <p className="tool-empty">{t("No matching tools. Try crop, water, soil, or costs.")}</p>}
    <div className="tool-grid">
      {matches.map(tool => <NavLink className="tool-item" key={tool.id} to={`/${tool.id}`}>
        <tool.icon size={24} /><h4>{t(tool.title)}</h4>
        <p>{tool.id === "visualizer" ? `${layouts} ${t(tool.text)}` : t(tool.text)}</p>
        <ArrowUpRight className="tool-arrow" size={20} aria-hidden="true" />
      </NavLink>)}
    </div>
  </section>;
}
