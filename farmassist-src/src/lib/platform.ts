import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Clipboard } from "@capacitor/clipboard";
import { Geolocation } from "@capacitor/geolocation";

export const nativeApp = Capacitor.isNativePlatform();
export const productionApi = "https://www.joitabioseedai.com";
export function backendUrl(path: string, native = nativeApp) {
  return native && path.startsWith("/api/") ? `${productionApi}${path}` : path;
}
export async function exportNativeFile(name: string, text: string) {
  const { uri } = await Filesystem.writeFile({
    path: name.replace(/[^a-zA-Z0-9_.-]/g, "_"),
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({ title: name, files: [uri], dialogTitle: "Save or share your farm record" });
}
export async function copyText(text: string) {
  if (nativeApp) await Clipboard.write({ string: text });
  else await navigator.clipboard.writeText(text);
}
export async function shareText(title: string, text: string) {
  if (nativeApp) await Share.share({ title, text, dialogTitle: "Share JOITA advisory" });
  else if (navigator.share) await navigator.share({ title, text });
  else return false;
  return true;
}
export async function currentPosition() {
  if (nativeApp) return Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Location access is unavailable.")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });
}
export function reportPlatformError(message: string) {
  window.dispatchEvent(new CustomEvent("storage-warning", { detail: message }));
}
