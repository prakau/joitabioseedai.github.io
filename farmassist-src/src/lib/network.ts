import { createParser } from "eventsource-parser";

export async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
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
  return path;
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
  source: "gemini" | "openrouter" | "offline_kb";
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
    !["gemini", "openrouter", "offline_kb"].includes(data.source) ||
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
};
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
  const timer = setTimeout(abort, 30000);
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
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error("Choose a JPEG, PNG, or WebP crop photo.");
  if (file.size > 4 * 1024 * 1024)
    throw new Error("Choose a crop photo smaller than 4 MB.");
  // Keep base64 requests below the hosting limit while preserving the original photo.
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Image preview is unavailable in this browser.");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
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
