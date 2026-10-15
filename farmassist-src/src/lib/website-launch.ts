export const LAUNCH_KEY = "joita-fa-launch-question";
export type WebsiteQuestion = { id: string; question: string; language: "Auto" | "Hindi" | "English"; createdAt: number };
export function parseWebsiteQuestion(raw: string | null, now = Date.now()): WebsiteQuestion | null {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || typeof value.id !== "string" || !value.id || typeof value.question !== "string" || !value.question.trim() || value.question.length > 1000 || !["Auto", "Hindi", "English"].includes(value.language) || typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt) || now < value.createdAt || now - value.createdAt > 300000) return null;
    return value;
  } catch { return null; }
}
export function readWebsiteQuestion() {
  try { return parseWebsiteQuestion(sessionStorage.getItem(LAUNCH_KEY)); } catch { return null; }
}
