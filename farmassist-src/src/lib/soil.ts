export const soilFields = [
  { key: "ph", label: "pH", unit: "0 to 14", min: 0, max: 14 },
  {
    key: "ec",
    label: "Electrical conductivity",
    unit: "dS/m",
    min: 0,
    max: 100,
  },
  { key: "oc", label: "Organic carbon", unit: "%", min: 0, max: 100 },
  {
    key: "n",
    label: "Available nitrogen (N)",
    unit: "kg/ha",
    min: 0,
    max: 5000,
  },
  {
    key: "p",
    label: "Available phosphorus (P)",
    unit: "kg/ha, elemental P",
    min: 0,
    max: 2000,
  },
  {
    key: "k",
    label: "Available potassium (K)",
    unit: "kg/ha, elemental K",
    min: 0,
    max: 5000,
  },
  { key: "zn", label: "Zinc (Zn)", unit: "mg/kg", min: 0, max: 1000 },
  { key: "fe", label: "Iron (Fe)", unit: "mg/kg", min: 0, max: 10000 },
] as const;
export type SoilValues = Record<(typeof soilFields)[number]["key"], string>;
export const emptySoil: SoilValues = {
  ph: "",
  ec: "",
  oc: "",
  n: "",
  p: "",
  k: "",
  zn: "",
  fe: "",
};
export function analyzeSoil(values: SoilValues) {
  const present = soilFields.filter((field) => values[field.key]?.trim());
  if (!present.length)
    throw new Error("Enter at least one value from your soil report.");
  for (const field of present) {
    const value = Number(values[field.key]);
    if (!Number.isFinite(value) || value < field.min || value > field.max)
      throw new Error(
        `${field.label} must be between ${field.min} and ${field.max} ${field.unit}.`,
      );
  }
  return present.map((field) => {
    const value = Number(values[field.key]);
    let interpretation =
      "Compare with the lab's method-specific reference range before selecting an input.";
    if (field.key === "ph")
      interpretation =
        value < 6.5
          ? "Acidic range. Crop tolerance varies; lime needs a laboratory lime-requirement test."
          : value > 7.5
            ? "Alkaline range. Check crop suitability and micronutrient availability; pH alone cannot determine a gypsum dose."
            : "Near-neutral range. Check the crop-specific target and the rest of the soil report.";
    if (field.key === "oc")
      interpretation = `${value < 0.5 ? "Low" : value <= 0.75 ? "Medium" : "High"} organic carbon under common Indian soil-test categories. Use crop residues and well-decomposed organic matter as part of a local soil plan.`;
    if (field.key === "ec")
      interpretation =
        "Salt interpretation depends on the extraction method (for example, 1:2 extract versus saturation extract) and crop tolerance. Ask the lab to classify salinity; do not infer salt stress from an unqualified sensor value.";
    if (field.key === "n")
      interpretation = `${value < 280 ? "Low" : value <= 560 ? "Medium" : "High"} available nitrogen under common Indian screening categories. This is soil status, not a fertilizer dose.`;
    if (field.key === "p")
      interpretation = `${value < 11 ? "Low" : value <= 22 ? "Medium" : "High"} under TNAU's available elemental P screening range. Verify extraction method and whether your report uses P or P2O5.`;
    if (field.key === "k")
      interpretation = `${value < 110 ? "Low" : value <= 280 ? "Medium" : "High"} under TNAU's available elemental K screening range. Verify whether your report uses K or K2O.`;
    return {
      label: field.label,
      value: `${value} ${field.key === "ph" ? "" : field.unit}`,
      interpretation,
    };
  });
}
