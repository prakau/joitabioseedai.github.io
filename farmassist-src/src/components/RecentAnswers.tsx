import { NavLink } from "react-router-dom";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { useStored } from "../lib/storage";
import { useInterface } from "../lib/interface";
import type { SavedAdvisory } from "./Advisory";

export function RecentAnswers() {
  const { t, language } = useInterface();
  const [records] = useStored<SavedAdvisory[]>("joita-fa-questions", []);
  const recent = records.filter(record => record && typeof record.id === "string" && typeof record.question === "string" && typeof record.answer === "string").slice(0, 3);
  if (!recent.length) return null;
  return <section className="recent-answers" aria-labelledby="recent-answers-title">
    <div className="tools-heading"><div><h3 id="recent-answers-title">{t("Continue from your saved answers")}</h3><p>{t("Saved on this device. Open an answer without sending it again.")}</p></div>
      <NavLink to="/ask">{t("View all")}<ArrowUpRight size={16} /></NavLink>
    </div>
    <div className="recent-answer-list">{recent.map(record => <NavLink key={record.id} to="/ask" state={{ savedQuestionId: record.id }}>
      <MessageSquare size={20} aria-hidden="true" /><span><strong dir="auto">{record.question}</strong>
        <small>{Number.isNaN(Date.parse(record.date)) ? t("Saved answer") : new Date(record.date).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
      </span><ArrowUpRight size={18} aria-hidden="true" />
    </NavLink>)}</div>
  </section>;
}
