import {
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
  type SelectHTMLAttributes,
} from "react";
import ReactMarkdown from "react-markdown";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { cropGuides } from "../data/agriculture";
import type { ChatResult } from "../lib/network";
export const safetyNotice =
  "AI-assisted advisory. Confirm pesticide/fertilizer use with local label, KVK, or agriculture expert.";
export const privacyNotice =
  "Do not upload personal documents or private information. JOITAFA is for crop advisory support only.";
export function Title({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <label className="form-field" htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            id,
            "aria-labelledby": `${id}-label`,
          })
        : children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}
export function CropSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Crop">
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose crop</option>
        {cropGuides.map((crop) => (
          <option key={crop.crop}>{crop.crop}</option>
        ))}
      </Select>
    </Field>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <Info size={18} aria-hidden />
      <div>{children}</div>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}
export function Busy({ label = "Loading" }: { label?: string }) {
  return (
    <div className="busy" role="status">
      <Loader2 size={20} className="animate-spin" />
      {label}
    </div>
  );
}
export function Source({ source }: { source: ChatResult["source"] }) {
  return (
    <span className={`source source-${source}`}>
      <CheckCircle2 size={15} />
      {sourceLabel(source)}
    </span>
  );
}
export function sourceLabel(source: ChatResult["source"]) {
  return source === "offline_kb" ? "Offline KB" : source === "joita_rules" ? "JOITA safety guidance" : "JOITA Live AI";
}
export function Answer({
  result,
  language = "en-IN",
  rtl = false,
}: {
  result: ChatResult;
  language?: string;
  rtl?: boolean;
}) {
  return (
    <div className="advisory-result" aria-live="polite">
      <Source source={result.source} />
      {result.source === "offline_kb" && result.failureReason && (
        <Notice>
          {language.startsWith("hi") ? "लाइव सलाह उपलब्ध नहीं है। ऑफलाइन मार्गदर्शिका से जवाब दिया गया है।" : "Live advisory is unavailable. Offline KB answered instead. Service details are in Settings."}
        </Notice>
      )}
      {result.imageAnalyzed && (
        <span className="source">{language.startsWith("hi") ? "फोटो पर आधारित शुरुआती जांच" : "Photo included in AI analysis"}</span>
      )}
      <div className="answer-copy" lang={language} dir={rtl ? "rtl" : "ltr"}>
        <ReactMarkdown>{result.answer}</ReactMarkdown>
      </div>
      <p className="safety-note">{language.startsWith("hi") ? "AI की सहायता से दी गई सलाह। दवा या खाद के उपयोग से पहले स्वीकृत लेबल और स्थानीय KVK या कृषि विशेषज्ञ से पुष्टि करें।" : safetyNotice}</p>
    </div>
  );
}
