import { Languages } from "lucide-react";
import { useInterface } from "../lib/interface";

export function InterfaceLanguage() {
  const { language, setLanguage, t } = useInterface();
  return (
    <div className="interface-language" role="group" aria-label={t("Dashboard language")}>
      <Languages size={18} aria-hidden="true" />
      <span>{t("Dashboard language")}</span>
      <div className="interface-options">
        <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
        <button type="button" lang="hi" aria-pressed={language === "hi"} onClick={() => setLanguage("hi")}>हिन्दी</button>
      </div>
    </div>
  );
}
