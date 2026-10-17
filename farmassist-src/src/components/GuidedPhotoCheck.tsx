import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { CropPhotoInput } from "./CropPhotoInput";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Field, Select } from "./workspace";
import type { CropImage, Investigation } from "../lib/network";
import { useInterface } from "../lib/interface";

export function GuidedPhotoCheck({ images, upload, remove, disabled, onError, details, onDetails }: {
  images: CropImage[]; upload: (view: CropImage["view"], file?: File) => Promise<void>; remove: (view: CropImage["view"]) => void;
  disabled: boolean; onError: (message: string) => void; details: Investigation; onDetails: (value: Investigation) => void;
}) {
  const { language } = useInterface();
  const hi = language === "hi";
  const l = (en: string, hindi: string) => hi ? hindi : en;
  const [small, setSmall] = useState<Record<string, boolean>>({});
  const photo = (view: CropImage["view"], label: string, help: string, inputLabel: string) => {
    const image = images.find(image => image.view === view);
    return <section className="investigation-photo" aria-label={label}>
      <div className="section-row"><h4>{label}</h4>{image && <Check size={18} aria-label={l("Photo added", "फोटो जोड़ी गई")} />}</div>
      <p>{help}</p>
      <CropPhotoInput inputLabel={inputLabel} upload={file => upload(view, file)} disabled={disabled} onError={onError} />
      {image && <div className="photo-preview"><img src={image.dataUrl} alt={view === "whole_plant" ? "Crop photo to be analyzed" : `${label} crop photo to be analyzed`} onLoad={event => { const isSmall = Math.min(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight) < 320; setSmall(previous => ({ ...previous, [view]: isSmall })); }} />
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => remove(view)}><Trash2 size={17} />{l("Remove photo", "फोटो हटाएं")}</Button>
        {small[view] && <p className="photo-quality-note">{l("This image is small. A sharper, closer photo may show more detail.", "यह फोटो छोटी है। साफ और पास से ली हुई फोटो में ज्यादा विवरण दिख सकता है।")}</p>}
      </div>}
    </section>;
  };
  return <div className="guided-check">
    <div className="investigation-heading"><span>01</span><div><h3>{l("Show the crop clearly", "फसल को साफ दिखाएं")}</h3><p>{l("One useful photo is enough to start. Add other views when available.", "शुरू करने के लिए एक साफ फोटो काफी है। उपलब्ध हों तो दूसरी तरफ की फोटो भी जोड़ें।")}</p></div></div>
    {photo("whole_plant", l("Whole plant or affected leaf", "पूरा पौधा या प्रभावित पत्ती"), l("Use daylight, keep the crop in focus, and avoid filters.", "दिन की रोशनी में साफ फोटो लें। फिल्टर का उपयोग न करें।"), "Crop photo (optional)")}
    <details className="additional-views"><summary>{l("Add leaf underside and field views", "पत्ती के नीचे और खेत की फोटो जोड़ें")} · {images.filter(image => image.view !== "whole_plant").length}/2</summary>
      <div className="investigation-photo-grid">
        {photo("leaf_underside", l("Leaf underside", "पत्ती के नीचे की तरफ"), l("Show visible insects, eggs, spots, or webbing without disturbing them.", "दिख रहे कीट, अंडे, धब्बे या जाले को बिना छेड़े फोटो लें।"), "Leaf underside photo")}
        {photo("field_view", l("Field view", "खेत का दृश्य"), l("Show whether symptoms occur in patches or across the field.", "दिखाएं कि लक्षण कुछ जगह हैं या पूरे खेत में।"), "Field view photo")}
      </div>
    </details>
    <div className="investigation-heading"><span>02</span><div><h3>{l("Tell us what changed", "क्या बदला है, बताएं")}</h3><p>{l("These details help narrow the next field checks.", "इस जानकारी से खेत में अगली जांच चुनने में मदद मिलती है।")}</p></div></div>
    <div className="fields fields-2">
      <Field label={l("Plot name (optional)", "खेत का नाम (वैकल्पिक)")}><Input maxLength={80} value={details.plot} onChange={e => onDetails({ ...details, plot: e.target.value })} /></Field>
      <Field label={l("When did symptoms start?", "लक्षण कब शुरू हुए?")}><Select value={details.duration} onChange={e => onDetails({ ...details, duration: e.target.value })}>
        {[["not sure", "Not sure", "पता नहीं"], ["today", "Today", "आज"], ["2-3 days", "2–3 days ago", "2–3 दिन पहले"], ["4-7 days", "4–7 days ago", "4–7 दिन पहले"], ["over a week", "More than a week ago", "एक सप्ताह से ज्यादा"]].map(([value, en, hn]) => <option key={value} value={value}>{l(en, hn)}</option>)}
      </Select></Field>
      <Field label={l("Where do you see symptoms?", "लक्षण कहां दिख रहे हैं?")}><Select value={details.spread} onChange={e => onDetails({ ...details, spread: e.target.value })}>
        {[["not sure", "Not sure", "पता नहीं"], ["a few plants", "A few plants", "कुछ पौधों पर"], ["patches", "In patches", "कुछ हिस्सों में"], ["scattered", "Scattered across the plot", "खेत में अलग-अलग जगह"], ["most of the plot", "Most of the plot", "खेत के ज्यादातर हिस्से में"]].map(([value, en, hn]) => <option key={value} value={value}>{l(en, hn)}</option>)}
      </Select></Field>
      <Field label={l("Recent irrigation, spray or other action (optional)", "हाल की सिंचाई, छिड़काव या दूसरा काम (वैकल्पिक)")}><Textarea maxLength={300} rows={2} value={details.recentAction} onChange={e => onDetails({ ...details, recentAction: e.target.value })} /></Field>
    </div>
  </div>;
}
