import { apiUrl } from "./network";

export async function transcribeVoice(blob: Blob, language: string, signal: AbortSignal): Promise<string> {
  if (!blob.size || blob.size > 2 * 1024 * 1024) throw new Error("Choose a voice note under 2 MB. / 2 MB से छोटी आवाज़ की रिकॉर्डिंग चुनें।");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 28000);
  try {
    const response = await fetch(apiUrl("/api/farmassist-transcribe"), {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ audio: btoa(binary), mimeType: blob.type.split(";")[0], language }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok !== true || typeof data.transcript !== "string" || !data.transcript.trim() || data.transcript.length > 1000)
      throw new Error(data?.error || "Voice could not be transcribed. Type your question instead.");
    return data.transcript;
  } catch (error) {
    if (signal.aborted) throw new DOMException("Recording discarded", "AbortError");
    if (controller.signal.aborted) throw new Error("Voice transcription took too long. Please type your question. / आवाज़ समझने में देर हुई। सवाल लिखें।");
    throw error;
  } finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
