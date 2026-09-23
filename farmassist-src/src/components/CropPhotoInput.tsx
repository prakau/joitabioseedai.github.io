import { useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { nativeApp, nativePhoto } from "../lib/platform";
import { Button } from "./ui/button";

export function CropPhotoInput({upload, disabled, onError}: {upload: (file?: File) => Promise<void>; disabled: boolean; onError: (message: string) => void}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  async function choose(fromCamera: boolean) {
    if (!nativeApp) { (fromCamera ? camera : gallery).current?.click(); return; }
    try { await upload(await nativePhoto(fromCamera)); }
    catch { onError("Photo was not opened. Allow camera/photos access, or choose another photo. / फोटो नहीं खुली। कैमरे की अनुमति दें या दूसरी फोटो चुनें।"); }
  }
  return <div className="crop-photo-input">
    <div className="actions">
      <Button type="button" variant="secondary" disabled={disabled} onClick={() => void choose(true)}><Camera size={18}/>Take photo / फोटो लें</Button>
      <Button type="button" variant="secondary" disabled={disabled} onClick={() => void choose(false)}><ImagePlus size={18}/>Choose photo / फोटो चुनें</Button>
    </div>
    <input ref={camera} hidden type="file" aria-label="Take crop photo" accept="image/*" capture="environment" onChange={event => {const file=event.target.files?.[0]; event.target.value=""; void upload(file);}} />
    <input ref={gallery} hidden type="file" aria-label="Crop photo (optional)" accept="image/*" onChange={event => {const file=event.target.files?.[0]; event.target.value=""; void upload(file);}} />
    <small>फसल या पत्ते की साफ फोटो लें। व्यक्तिगत दस्तावेज़ नहीं। Up to 20 MB; resized privately on your device before upload.</small>
  </div>;
}
