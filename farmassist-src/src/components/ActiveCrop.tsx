import { NavLink } from "react-router-dom";
import { ArrowUpRight, Sprout } from "lucide-react";
import { Field, Select } from "./workspace";
import { useInterface } from "../lib/interface";
import { daysAfterSowing, type CropSeason } from "../lib/crop-seasons";
import { localDay } from "../lib/planning";

export function ActiveCrop({ seasons, activeId, onSelect }: { seasons: CropSeason[]; activeId: string; onSelect: (id: string) => void }) {
  const { language } = useInterface();
  const l = (en: string, hi: string) => language === "hi" ? hi : en;
  const available = seasons.filter(row => row.status === "active");
  const active = available.find(row => row.id === activeId);
  const days = active ? daysAfterSowing(active, localDay()) : null;
  return <section className="active-crop" aria-label={l("Active crop season", "चुनी हुई फसल") }>
    <Sprout size={24} aria-hidden="true" />
    <div><strong>{active ? `${active.plot} · ${active.crop}` : l("Your crops, in one place", "आपकी फसलें, एक जगह")}</strong>
      <p>{active ? `${[active.district, active.state].filter(Boolean).join(", ") || l("Location not recorded", "स्थान दर्ज नहीं")}${days === null ? "" : days < 0 ? ` · ${l("Sowing in", "बुवाई तक")} ${-days} ${l("days", "दिन")}` : ` · ${days} ${l("days after sowing", "दिन बुवाई के बाद")}`}` : l("Save a field to reuse its details in new questions.", "खेत सहेजें, नए सवाल में विवरण दोबारा भरना नहीं पड़ेगा।")}</p></div>
    {available.length > 0 && <Field label={l("Field for new questions", "नए सवाल के लिए खेत")}><Select value={active?.id || ""} onChange={event => onSelect(event.target.value)}><option value="">{l("No field selected", "कोई खेत नहीं चुना")}</option>{available.map(row => <option key={row.id} value={row.id}>{row.plot} · {row.crop}</option>)}</Select></Field>}
    <NavLink to="/crops">{l("My Crops", "मेरी फसलें")} <ArrowUpRight size={17} aria-hidden="true" /></NavLink>
  </section>;
}
