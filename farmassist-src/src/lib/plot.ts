export type Layout = {
  length: number;
  width: number;
  rows: number;
  crop: string;
  irrigation: string;
  notes: string;
};
export const defaultLayout: Layout = {
  length: 60,
  width: 20,
  rows: 8,
  crop: "Onion",
  irrigation: "Drip",
  notes: "",
};
export function validateLayout(value: Layout) {
  if (!Number.isFinite(value.length) || value.length < 1 || value.length > 2000)
    return "Length must be between 1 and 2000 metres.";
  if (!Number.isFinite(value.width) || value.width < 1 || value.width > 2000)
    return "Width must be between 1 and 2000 metres.";
  if (!Number.isInteger(value.rows) || value.rows < 1 || value.rows > 100)
    return "Rows must be a whole number between 1 and 100.";
  if (!value.crop) return "Choose a crop.";
  return "";
}
