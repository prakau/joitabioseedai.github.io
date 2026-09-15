import { useEffect, useState } from "react";

export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (value === null || (Array.isArray(fallback) && !Array.isArray(value)))
      return fallback;
    if (
      typeof fallback === "object" &&
      fallback !== null &&
      !Array.isArray(fallback)
    ) {
      if (typeof value !== "object" || Array.isArray(value)) return fallback;
      for (const field of Object.keys(fallback)) {
        if (
          typeof value[field] !==
          typeof (fallback as Record<string, unknown>)[field]
        )
          return fallback;
      }
    }
    return value as T;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("records-changed", { detail: key }));
    return true;
  } catch {
    window.dispatchEvent(
      new CustomEvent("storage-warning", {
        detail:
          "Device storage is full or disabled. This change could not be saved. Export your records in Settings.",
      }),
    );
    return false;
  }
}
export function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStored(key, fallback));
  useEffect(() => {
    const changed = (event: Event) => {
      const changedKey =
        event instanceof StorageEvent
          ? event.key
          : (event as CustomEvent<string>).detail;
      if (!changedKey || changedKey === key)
        setValue(readStored(key, fallback));
    };
    window.addEventListener("storage", changed);
    window.addEventListener("records-changed", changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("records-changed", changed);
    };
  }, [key]);
  function save(next: T) {
    const saved = writeStored(key, next);
    if (saved) setValue(next);
    return saved;
  }
  return [value, save] as const;
}
export function downloadJson(name: string, data: unknown) {
  downloadText(name, JSON.stringify(data, null, 2), "application/json");
}
export function downloadText(
  name: string,
  text: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function uid() {
  return crypto.randomUUID();
}
export function timestamp() {
  return new Date().toISOString();
}
export function displayDate(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Date unavailable";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
