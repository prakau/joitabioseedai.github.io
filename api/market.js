export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
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
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data.status !== "ok" || !Array.isArray(data.records)) throw new Error("Market service unavailable");
    const updated = new Date(data.updated_date);
    return res.status(200).json({
      status: "live",
      source: "AGMARKNET / Data.gov.in",
      records: data.records,
      retrievedAt: new Date().toISOString(),
      sourceUpdatedAt: Number.isNaN(updated.getTime()) ? undefined : updated.toISOString(),
      total: data.total,
    });
  } catch {
    return res.status(502).json({ error: "The mandi service did not return data. Please retry or check the official portal." });
  } finally { clearTimeout(timer); }
}
