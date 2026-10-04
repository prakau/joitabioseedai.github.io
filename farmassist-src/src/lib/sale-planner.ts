export const SALE_KEY = "joita-fa-sale-comparisons-v1";
export type Offer = {
  buyer: string;
  price: string;
  unit: "kg" | "quintal";
  transport: string;
  fees: string;
  commission: string;
};
export type SaleResult = {
  buyer: string;
  gross: number;
  deductions: number;
  net: number;
  netPerKg: number;
};
function number(value: string, optional = false) {
  if (!value.trim()) {
    if (optional) return 0;
    throw new Error("numbers");
  }
  const parsed = Number(value);
  if (
    !/^\d+(\.\d{1,2})?$/.test(value.trim()) ||
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 10000000
  )
    throw new Error("numbers");
  return parsed;
}
export function compareSales(quantity: string, offers: Offer[]): SaleResult[] {
  const kg = number(quantity);
  if (kg <= 0 || offers.length < 2 || offers.length > 5)
    throw new Error("quantity");
  const money = (n: number) => Math.round(n * 100) / 100;
  return offers
    .map((o) => {
      if (!o.buyer.trim() || o.buyer.length > 80) throw new Error("buyer");
      const price = number(o.price),
        transport = number(o.transport, true),
        fees = number(o.fees, true),
        commission = number(o.commission, true);
      if (price <= 0 || commission > 100 || !["kg", "quintal"].includes(o.unit))
        throw new Error("numbers");
      const gross = money((kg * price) / (o.unit === "quintal" ? 100 : 1));
      const deductions = money(
        transport + fees + money((gross * commission) / 100),
      );
      const net = money(gross - deductions);
      return {
        buyer: o.buyer.trim(),
        gross,
        deductions,
        net,
        netPerKg: money(net / kg),
      };
    })
    .sort((a, b) => b.net - a.net);
}
