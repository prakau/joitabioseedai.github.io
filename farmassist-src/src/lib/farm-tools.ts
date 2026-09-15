export const areaUnits = {
  "Square metres": 1,
  Hectares: 10000,
  Acres: 4046.8564224,
} as const;
export type AreaUnit = keyof typeof areaUnits;
export function positiveNumber(value: string, label: string, maximum = 1e9) {
  const number = Number(value);
  if (
    !value.trim() ||
    !Number.isFinite(number) ||
    number <= 0 ||
    number > maximum
  )
    throw new Error(
      `${label} must be greater than zero and no more than ${maximum.toLocaleString("en-IN")}.`,
    );
  return number;
}
export function areaInMetres(value: string, unit: AreaUnit) {
  if (!(unit in areaUnits)) throw new Error("Choose a supported area unit.");
  const metres = positiveNumber(value, "Field area", 1e8) * areaUnits[unit];
  if (metres > 1e10)
    throw new Error("Field area is too large. Check the value and unit.");
  return metres;
}
export function calculateWater(area: number, depth: string, flow: string) {
  if (!Number.isFinite(area) || area <= 0)
    throw new Error("Enter a valid field area first.");
  const litres = area * positiveNumber(depth, "Applied water depth (mm)", 1000);
  const minutes = flow.trim()
    ? litres / positiveNumber(flow, "Pump flow (L/min)", 1e7)
    : null;
  return { litres, minutes };
}
export function calculateSeed(
  area: number,
  rate: string,
  unit: "kg/ha" | "kg/acre",
) {
  if (!Number.isFinite(area) || area <= 0)
    throw new Error("Enter a valid field area first.");
  return (
    (area / (unit === "kg/ha" ? 10000 : 4046.8564224)) *
    positiveNumber(rate, "Seed rate", 10000)
  );
}
export const ledgerCategories = {
  expense: [
    "Seed",
    "Crop inputs",
    "Labour",
    "Irrigation",
    "Machinery",
    "Transport",
    "Other expense",
  ],
  income: ["Produce sale", "Other income"],
};
export const LEDGER_KEY = "joita-fa-ledger-v1";
export type LedgerEntry = {
  id: string;
  date: string;
  type: "income" | "expense";
  crop: string;
  category: string;
  amountPaise: number;
  note: string;
};
export function parseMoney(value: string) {
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(value.trim()))
    throw new Error("Enter an INR amount with at most two decimal places.");
  return Math.round(positiveNumber(value, "Amount (INR)", 1e8) * 100);
}
export function ledgerTotals(entries: LedgerEntry[]) {
  const income = entries
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amountPaise, 0);
  const expenses = entries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amountPaise, 0);
  return { income, expenses, net: income - expenses };
}
export function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
