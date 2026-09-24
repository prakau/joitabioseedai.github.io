import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ArrowUpRight, Camera, MessageSquare, Store, CloudSun, Send } from "lucide-react";
import { Textarea } from "./ui/input";
import { Button } from "./ui/button";
import { useInterface } from "../lib/interface";

export function DashboardStart() {
  const { t } = useInterface();
  const [question, setQuestion] = useState("");
  const desk = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  return (
    <section className="field-desk" aria-label={t("Your JOITA field desk")}>
      <div className="field-desk-main" ref={desk}>
        <div className="field-desk-label"><span className="field-line" />{t("YOUR JOITA FIELD DESK")}</div>
        <h3>{t("One question. A clearer next step.")}</h3>
        <form onSubmit={event => {
          event.preventDefault();
          if (!question.trim()) { desk.current?.querySelector("textarea")?.focus(); return; }
          navigate("/ask", { state: { submittedQuestion: question.trim(), submissionId: crypto.randomUUID() } });
        }}>
          <label htmlFor="field-question">{t("What would you like to check today?")}</label>
          <Textarea id="field-question" value={question} maxLength={1000} rows={3}
            placeholder={t("My tomato leaves are curling. What should I check?")}
            onChange={event => setQuestion(event.target.value)} />
          <div className="field-question-actions">
            <span>{t("Crop advisory support only")}</span>
            <Button type="submit"><Send size={18} />{t("Ask JOITAFA")}</Button>
          </div>
        </form>
        <div className="question-starters" aria-label={t("Start a question")}>
          {[
            ["Leaf symptoms", "My tomato leaves are curling. What should I check?"],
            ["Irrigation", "What should I check before irrigating my crop?"],
            ["Crop planning", "What information do you need to help me plan my next crop?"],
          ].map(([label, prompt]) => <button key={label} type="button" onClick={() => {setQuestion(t(prompt)); desk.current?.querySelector("textarea")?.focus();}}>{t(label)}<ArrowUpRight size={14}/></button>)}
        </div>
      </div>
      <div className="field-shortcuts">
        <span className="eyebrow">{t("OUT IN THE FIELD")}</span>
        {[
          { to: "/diagnose", icon: Camera, title: "Check a crop photo", detail: "Symptoms & practical checks", tone: "sage" },
          { to: "/weather", icon: CloudSun, title: "Plan around the weather", detail: "Local forecast & rain outlook", tone: "blue" },
          { to: "/market", icon: Store, title: "Compare mandi prices", detail: "Dated AGMARKNET records", tone: "gold" },
        ].map(({to, icon: Icon, title, detail, tone}) => (
          <NavLink to={to} className={`field-shortcut ${tone}`} key={to}>
            <span className="shortcut-icon"><Icon size={23} /></span><span><strong>{t(title)}</strong><small>{t(detail)}</small></span><ArrowUpRight size={18} />
          </NavLink>
        ))}
        <NavLink to="/ask" className="field-continue"><MessageSquare size={16} />{t("Your saved conversations")}<ArrowUpRight size={16} /></NavLink>
      </div>
    </section>
  );
}
