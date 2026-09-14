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
};
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
) {
  if (!message.trim()) throw new Error("Enter a crop question first.");
  if (message.length > 1000)
    throw new Error("Keep your question within 1000 characters.");
  return requestJson<ChatResult>(
    apiUrl("/api/farmassist-chat"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message.trim(),
        ...context,
        imageUrl,
        history: history.slice(-3),
      }),
    },
    28000,
  );
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
