export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.headers?.origin === "https://localhost") {
    res.setHeader("Access-Control-Allow-Origin", "https://localhost");
    res.setHeader("Vary", "Origin");
  }
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.DATAGOV_API_KEY) return res.status(200).json({ status: "unavailable", source: "AGMARKNET / Data.gov.in", records: [], message: "Live mandi prices are not connected. Use the official market portal below; no sample prices are shown." });
  const url = new URL("https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070");
  url.searchParams.set("api-key", process.env.DATAGOV_API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "200");
  for (const field of ["state", "district", "commodity", "market", "arrival_date"]) {
    const value = req.query?.[field];
    if (typeof value === "string" && value.length <= 100 && value.trim()) url.searchParams.set(`filters[${field}]`, value.trim());
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let providerStatus = null;
  let failureReason = "connection_failed";
  try {
    const response = await fetch(url, { signal: controller.signal });
    providerStatus = response.status;
    failureReason = [401, 403].includes(response.status) ? "access_denied" : response.status === 429 ? "rate_limited" : "provider_error";
    const data = await response.json().catch(() => null);
    if (!data) failureReason = "invalid_provider_response";
    else if (typeof data.message === "string" && /(?:invalid|expired|missing).{0,30}(?:api.?key|credential)|api.?key.{0,30}(?:invalid|expired|missing)/i.test(data.message)) failureReason = "access_denied";
    if (!response.ok || data?.status !== "ok" || !Array.isArray(data.records)) throw new Error("Market service unavailable");
    const updated = new Date(data.updated_date);
    return res.status(200).json({
      status: "live",
      source: "AGMARKNET / Data.gov.in",
      records: data.records,
      retrievedAt: new Date().toISOString(),
      sourceUpdatedAt: Number.isNaN(updated.getTime()) ? undefined : updated.toISOString(),
      total: data.total,
    });
  } catch (error) {
    if (error?.name === "AbortError" || controller.signal.aborted) failureReason = "provider_timeout";
    console.warn(JSON.stringify({ service: "joitafa-market", providerStatus, failureReason, timestamp: new Date().toISOString() }));
    const message = failureReason === "access_denied" ? "Data.gov.in denied access. The configured mandi credential needs administrator review. Use the official portal meanwhile."
      : failureReason === "rate_limited" ? "Data.gov.in is limiting requests. Retry later or check the official market portal."
      : failureReason === "provider_timeout" ? "Data.gov.in took too long to respond. Retry or check the official market portal."
      : "Data.gov.in did not return usable mandi data. Retry or check the official portal; no sample prices are used.";
    return res.status(502).json({ error: message, providerStatus, failureReason });
  } finally { clearTimeout(timer); }
}
