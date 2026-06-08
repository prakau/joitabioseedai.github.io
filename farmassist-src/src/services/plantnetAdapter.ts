export async function identifyPlantWithPlantNet(image: File, apiKey: string) {
  if (!apiKey) {
    return {
      source: "Pl@ntNet optional",
      status: "optional" as const,
      message: "No Pl@ntNet key configured. Offline symptom-assisted diagnosis remains active."
    };
  }

  const form = new FormData();
  form.append("images", image);
  form.append("organs", "leaf");
  const response = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    body: form
  });
  if (!response.ok) throw new Error("Pl@ntNet identification failed");
  return {
    source: "Pl@ntNet plant/species identification support — not a complete disease diagnosis.",
    status: "live" as const,
    data: await response.json()
  };
}
