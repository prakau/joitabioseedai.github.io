import { createParser } from "eventsource-parser";
import { backendUrl } from "./platform";

export async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl(url), {
      ...options,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        data?.error ||
          data?.failureReason ||
          `Request failed (HTTP ${response.status}).`,
      );
    if (data === null)
      throw new Error("The service returned an unreadable response.");
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("The service took too long to reply. Please retry.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
export function apiUrl(path: string) {
  return backendUrl(path);
}
export type ChatContext = {
  crop: string;
  location: string;
  stage: string;
  language: string;
  problemType: string;
};
export type ChatResult = {
  ok: boolean;
  answer: string;
  source: "gemini" | "openrouter" | "offline_kb" | "joita_rules";
  model: string;
  mode?: string;
  failureReason?: string;
  imageAnalyzed?: boolean;
  language?: string;
  responseTimeMs?: number;
};
export type ChatProgress =
  | {
      type: "status" | "reset";
      provider: "gemini" | "openrouter";
      message: string;
    }
  | { type: "delta"; text: string };

function checkedChatResult(data: ChatResult): ChatResult {
  if (
    !data ||
    typeof data.answer !== "string" ||
    !data.answer.trim() ||
    data.answer.length > 16000 ||
    !["gemini", "openrouter", "offline_kb", "joita_rules"].includes(data.source) ||
    (data.source !== "offline_kb" && data.ok !== true)
  )
    throw new Error("The advisory service returned an invalid answer.");
  return data;
}

export async function readChatStream(
  response: Response,
  onProgress: (event: ChatProgress) => void,
): Promise<ChatResult> {
  if (!response.body) throw new Error("The answer stream is unavailable.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result: ChatResult | null = null;
  let characters = 0;
  const parser = createParser({
    maxBufferSize: 128 * 1024,
    onError(error) {
      if (error.type === "max-buffer-size-exceeded")
        throw new Error("The answer stream exceeded its size limit.");
    },
    onEvent(event) {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        throw new Error("The answer stream was interrupted. Please retry.");
      }
      if (event.event === "complete") {
        result = checkedChatResult(data);
        return;
      }
      if (event.event === "delta" && typeof data.text === "string") {
        characters += data.text.length;
        if (characters > 16000)
          throw new Error("The answer exceeded its size limit.");
        onProgress({ type: "delta", text: data.text });
      }
      if (
        (event.event === "status" || event.event === "reset") &&
        ["gemini", "openrouter"].includes(data.provider)
      ) {
        if (event.event === "reset") characters = 0;
        onProgress({
          type: event.event,
          provider: data.provider,
          message: String(data.message || "").slice(0, 200),
        });
      }
    },
  });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    parser.feed(decoder.decode());
    if (!result)
      throw new Error(
        "The live answer was interrupted before it finished. Please retry.",
      );
    return result;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export type Health = {
  ok: boolean;
  hasGeminiKey: boolean;
  hasOpenRouterKey: boolean;
  service: string;
  timestamp: string;
  environment: string;
  hasMarketKey?: boolean;
  hasSpeechKey?: boolean;
};
export async function requestSpeech(text: string, language: string, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 25000);
  try {
    const response = await fetch(apiUrl("/api/farmassist-speech"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok)
      throw new Error(data?.error || "Google speech is temporarily unavailable.");
    if (data.source !== "google_tts" || data.contentType !== "audio/mpeg" ||
        !Array.isArray(data.audioParts) || !data.audioParts.length || data.audioParts.length > 6 ||
        !data.audioParts.every((part: unknown) => typeof part === "string" && part.length < 2000000 && /^[A-Za-z0-9+/]+={0,2}$/.test(part)))
      throw new Error("Google speech returned unreadable audio.");
    return data.audioParts as string[];
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}
export async function sendQuestion(
  message: string,
  context: ChatContext,
  imageUrl = "",
  history: { question: string; answer: string }[] = [],
  onProgress?: (event: ChatProgress) => void,
  signal?: AbortSignal,
) {
  if (!message.trim()) throw new Error("Enter a crop question first.");
  if (message.length > 1000)
    throw new Error("Keep your question within 1000 characters.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 55000);
  try {
    const response = await fetch(apiUrl("/api/farmassist-chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: onProgress ? "text/event-stream" : "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        message: message.trim(),
        ...context,
        imageUrl,
        history: history.slice(-3),
      }),
    });
    if (
      response.ok &&
      response.headers.get("content-type")?.includes("text/event-stream")
    )
      return await readChatStream(response, onProgress || (() => {}));
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        data?.error ||
          data?.failureReason ||
          `Live advisory failed (HTTP ${response.status}).`,
      );
    return checkedChatResult(data);
  } catch (error) {
    if (signal?.aborted)
      throw new DOMException("Request stopped", "AbortError");
    if (controller.signal.aborted)
      throw new Error(
        "The live advisory took too long to finish. Please retry.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export async function cropPhoto(file: File): Promise<string> {
  if (file.type && !/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type))
    throw new Error("Choose a crop photo, not a document. / फसल की फोटो चुनें, दस्तावेज़ नहीं।");
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error("Choose a photo under 20 MB. / 20 MB से छोटी फोटो चुनें।");
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("This photo could not be opened. Try JPEG/PNG or take a new photo. / फोटो नहीं खुली। JPEG/PNG चुनें या नई फोटो लें।"));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
  const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image preview is unavailable in this browser.");
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  let result = canvas.toDataURL("image/jpeg", 0.85);
  for (const quality of [0.7, 0.55, 0.4]) {
    if (result.length < 2 * 1024 * 1024) break;
    result = canvas.toDataURL("image/jpeg", quality);
  }
  if (!result.startsWith("data:image/jpeg;base64,") || result.length >= 2 * 1024 * 1024)
    throw new Error("Photo is too complex to upload. Take a closer crop photo. / पास से फसल की फोटो लें।");
  return result;
}
export function track(
  event: string,
  props: Record<string, string | boolean> = {},
) {
  try {
    const target = window as Window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    target.gtag?.("event", event, props);
    target.dataLayer?.push({ event, ...props });
  } catch {
    /* Analytics cannot interrupt advisory. */
  }
}
