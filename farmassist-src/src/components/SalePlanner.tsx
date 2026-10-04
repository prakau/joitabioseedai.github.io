import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Calculator, Download, Plus, Save, Store, Trash2 } from "lucide-react";
import { useInterface } from "../lib/interface";
import { localDay } from "../lib/planning";
import {
  compareSales,
  SALE_KEY,
  type Offer,
  type SaleResult,
} from "../lib/sale-planner";
import { downloadJson, readStored, uid, useStored } from "../lib/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Empty, Field, Notice, Select, Title } from "./workspace";

const emptyOffer = (): Offer => ({
  buyer: "",
  price: "",
  unit: "quintal",
  transport: "",
  fees: "",
  commission: "",
});
type Comparison = {
  id: string;
  date: string;
  quantity: string;
  crop: string;
  offers: Offer[];
  results: SaleResult[];
};
export function SalePlanner() {
  const { language } = useInterface();
  const l = (en: string, hi: string) => (language === "hi" ? hi : en);
  const money = (n: number) =>
    new Intl.NumberFormat(language === "hi" ? "hi-IN" : "en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  const [quantity, setQuantity] = useState("");
  const [crop, setCrop] = useState("");
  const [offers, setOffers] = useState<Offer[]>([emptyOffer(), emptyOffer()]);
  const [result, setResult] = useState<Comparison | null>(null);
  const [history, saveHistory] = useStored<Comparison[]>(SALE_KEY, []);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function changed() {
    setResult(null);
    setError("");
    setMessage("");
  }
  function update(index: number, key: keyof Offer, value: string) {
    changed();
    setOffers(offers.map((o, i) => (i === index ? { ...o, [key]: value } : o)));
  }
  return (
    <>
      <Title
        title={l("Sale planner", "बिक्री की योजना")}
        description={l(
          "Compare buyer quotes after transport, fees, and commission.",
          "ढुलाई, शुल्क और कमीशन घटाने के बाद खरीदारों के भाव की तुलना करें।",
        )}
        action={
          <NavLink className="text-link" to="/market">
            <Store size={18} />
            {l("Mandi prices", "मंडी के भाव")}
          </NavLink>
        }
      />
      <div className="field-workflow-strip">
        <Calculator size={24} />
        <p>
          {l(
            "Your quotes, not live market offers. Estimates exclude unentered costs, quality deductions, payment risk and tax.",
            "ये आपके दर्ज किए हुए भाव हैं, लाइव ऑफर नहीं। अनुमान में बिना दर्ज खर्च, गुणवत्ता की कटौती, भुगतान का जोखिम और कर शामिल नहीं हैं।",
          )}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setMessage("");
          try {
            const results = compareSales(quantity, offers);
            setResult({
              id: uid(),
              date: localDay(),
              quantity,
              crop: crop.trim(),
              offers,
              results,
            });
          } catch {
            setResult(null);
            setError(
              l(
                "Enter a positive quantity and price, a buyer name for each offer, and non-negative costs. Commission must be 0–100%. Use up to two decimal places.",
                "मात्रा और भाव शून्य से अधिक, हर खरीदार का नाम और खर्च शून्य या अधिक रखें। कमीशन 0–100% हो। अधिकतम दो दशमलव अंक रखें।",
              ),
            );
          }
        }}
      >
        <div className="fields fields-2">
          <Field label={l("Crop / produce", "फसल / उपज")}>
            <Input
              required
              maxLength={80}
              value={crop}
              onChange={(e) => {
                changed();
                setCrop(e.target.value);
              }}
            />
          </Field>
          <Field label={l("Quantity to sell (kg)", "बेचने की मात्रा (किलो)")}>
            <Input
              required
              type="number"
              min="0.01"
              max="10000000"
              step="0.01"
              value={quantity}
              onChange={(e) => {
                changed();
                setQuantity(e.target.value);
              }}
            />
          </Field>
        </div>
        <div className="offer-grid">
          {offers.map((offer, index) => (
            <fieldset className="buyer-offer" key={index}>
              <legend>
                {l("Buyer", "खरीदार")} {index + 1}
              </legend>
              <Field label={l("Buyer / mandi name", "खरीदार / मंडी का नाम")}>
                <Input
                  required
                  maxLength={80}
                  value={offer.buyer}
                  onChange={(e) => update(index, "buyer", e.target.value)}
                />
              </Field>
              <div className="fields fields-2">
                <Field label={l("Quoted price (INR)", "बताया गया भाव (रुपये)")}>
                  <Input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={offer.price}
                    onChange={(e) => update(index, "price", e.target.value)}
                  />
                </Field>
                <Field label={l("Price unit", "भाव की इकाई")}>
                  <Select
                    value={offer.unit}
                    onChange={(e) => update(index, "unit", e.target.value)}
                  >
                    <option value="quintal">
                      {l("Per quintal (100 kg)", "प्रति क्विंटल (100 किलो)")}
                    </option>
                    <option value="kg">{l("Per kg", "प्रति किलो")}</option>
                  </Select>
                </Field>
              </div>
              {(
                [
                  [
                    "transport",
                    "Total transport cost (INR)",
                    "कुल ढुलाई खर्च (रुपये)",
                  ],
                  ["fees", "Other total fees (INR)", "अन्य कुल शुल्क (रुपये)"],
                  ["commission", "Commission (%)", "कमीशन (%)"],
                ] as const
              ).map(([key, en, hi]) => (
                <Field key={key} label={l(en, hi)}>
                  <Input
                    type="number"
                    min="0"
                    max={key === "commission" ? 100 : 10000000}
                    step="0.01"
                    placeholder="0"
                    value={offer[key]}
                    onChange={(e) => update(index, key, e.target.value)}
                  />
                </Field>
              ))}
              {offers.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    changed();
                    setOffers(offers.filter((_, i) => i !== index));
                  }}
                >
                  <Trash2 size={17} />
                  {l("Remove buyer", "खरीदार हटाएं")}
                </Button>
              )}
            </fieldset>
          ))}
        </div>
        <div className="actions">
          <Button type="submit">
            <Calculator size={18} />
            {l("Compare net proceeds", "शुद्ध प्राप्ति की तुलना करें")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={offers.length >= 5}
            onClick={() => {
              changed();
              setOffers([...offers, emptyOffer()]);
            }}
          >
            <Plus size={18} />
            {l("Add buyer", "खरीदार जोड़ें")}
          </Button>
        </div>
      </form>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {result && (
        <section
          className="section-divider sale-results"
          aria-label={l("Sale comparison", "बिक्री की तुलना")}
        >
          <div className="section-row">
            <h3>{l("Estimated net proceeds", "अनुमानित शुद्ध प्राप्ति")}</h3>
            <span>
              {result.crop} · {result.quantity} kg · {result.date}
            </span>
          </div>
          <p className="muted">
            {l(
              "For the same quantity and comparable quality. This is not farm profit or a guaranteed buyer payment.",
              "समान मात्रा और तुलनीय गुणवत्ता के लिए। यह खेती का लाभ या भुगतान की गारंटी नहीं है।",
            )}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    l("Buyer", "खरीदार"),
                    l("Gross", "सकल"),
                    l("Deductions", "कटौती"),
                    l("Estimated net", "अनुमानित शुद्ध"),
                    l("Net / kg", "शुद्ध / किलो"),
                  ].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.results.map((row, i) => (
                  <tr key={i}>
                    <th scope="row">{row.buyer}</th>
                    <td>{money(row.gross)}</td>
                    <td>{money(row.deductions)}</td>
                    <td>
                      <strong>{money(row.net)}</strong>
                    </td>
                    <td>{money(row.netPerKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.results.some((row) => row.net < 0) && (
            <Notice error>
              {l(
                "At least one offer has costs higher than the sale value.",
                "कम से कम एक ऑफर में खर्च बिक्री की रकम से अधिक है।",
              )}
            </Notice>
          )}
          <div className="actions">
            <Button
              disabled={history.some((e) => e.id === result.id)}
              onClick={() => {
                const current = readStored<Comparison[]>(SALE_KEY, []);
                if (current.some((e) => e.id === result.id)) return;
                if (current.length >= 100) {
                  setError(
                    l(
                      "Export and remove older comparisons first.",
                      "पहले पुराने तुलनात्मक रिकॉर्ड निर्यात करके हटाएं।",
                    ),
                  );
                  return;
                }
                if (saveHistory([result, ...current]))
                  setMessage(
                    l(
                      "Comparison saved on this device.",
                      "तुलना इस डिवाइस पर सहेजी गई।",
                    ),
                  );
              }}
            >
              <Save size={18} />
              {l("Save comparison", "तुलना सहेजें")}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                downloadJson("JOITAFA-sale-comparison.json", result)
              }
            >
              <Download size={18} />
              {l("Download comparison", "तुलना डाउनलोड करें")}
            </Button>
          </div>
        </section>
      )}
      <section className="section-divider">
        <h3>{l("Saved comparisons", "सहेजी हुई तुलना")}</h3>
        {!history.length && (
          <Empty>
            {l("No saved comparisons yet.", "अभी कोई तुलना सहेजी नहीं गई है।")}
          </Empty>
        )}
        {history.map((item) => (
          <div className="section-row observation-row" key={item.id}>
            <button
              className="text-link"
              onClick={() => {
                setCrop(item.crop);
                setQuantity(item.quantity);
                setOffers(item.offers);
                setResult(item);
                setError("");
                setMessage("");
              }}
            >
              {item.date} · {item.crop} · {item.quantity} kg
            </button>
            <button
              className="icon-action"
              title={l("Delete comparison", "तुलना हटाएं")}
              aria-label={l("Delete comparison", "तुलना हटाएं")}
              onClick={() => {
                if (
                  saveHistory(
                    readStored<Comparison[]>(SALE_KEY, []).filter(
                      (e) => e.id !== item.id,
                    ),
                  )
                ) {
                  if (result?.id === item.id) setResult(null);
                }
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
