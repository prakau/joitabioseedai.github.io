import { useState } from "react";
import { Calculator, Download, Droplets, Ruler, Sprout } from "lucide-react";
import {
  areaInMetres,
  areaUnits,
  calculateSeed,
  calculateWater,
  type AreaUnit,
} from "../lib/farm-tools";
import { downloadText } from "../lib/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, Notice, Select, Title } from "./workspace";

export function FarmCalculators() {
  const [mode, setMode] = useState<"area" | "water" | "seed">("area");
  const [area, setArea] = useState("");
  const [unit, setUnit] = useState<AreaUnit>("Acres");
  const [depth, setDepth] = useState("");
  const [flow, setFlow] = useState("");
  const [rate, setRate] = useState("");
  const [rateUnit, setRateUnit] = useState<"kg/ha" | "kg/acre">("kg/ha");
  const [error, setError] = useState("");
  const [result, setResult] = useState<
    { label: string; value: string }[] | null
  >(null);
  const [inputs, setInputs] = useState("");
  const format = (value: number) =>
    value.toLocaleString("en-IN", { maximumFractionDigits: 3 });
  function invalidate() {
    setResult(null);
    setError("");
  }
  function calculate() {
    try {
      const squareMetres = areaInMetres(area, unit);
      let values = Object.entries(areaUnits).map(([label, factor]) => ({
        label,
        value: format(squareMetres / factor),
      }));
      let details = `Field area: ${area} ${unit}`;
      if (mode === "water") {
        const water = calculateWater(squareMetres, depth, flow);
        values = [
          { label: "Water volume (litres)", value: format(water.litres) },
          {
            label: "Water volume (cubic metres)",
            value: format(water.litres / 1000),
          },
        ];
        if (water.minutes !== null)
          values.push({
            label: "Pump time (hours)",
            value: format(water.minutes / 60),
          });
        details += `\nApplied depth: ${depth} mm\nPump flow: ${flow || "Not entered"} L/min`;
      } else if (mode === "seed") {
        values = [
          {
            label: "Seed quantity (kg)",
            value: format(calculateSeed(squareMetres, rate, rateUnit)),
          },
        ];
        details += `\nUser-entered seed rate: ${rate} ${rateUnit}`;
      }
      setResult(values);
      setInputs(details);
      setError("");
    } catch (failure) {
      setResult(null);
      setError((failure as Error).message);
    }
  }
  return (
    <>
      <Title
        title="Field calculators"
        description="Area conversions and quantities calculated from your measurements."
      />
      <div className="mode-switch" role="group" aria-label="Calculator mode">
        {(
          [
            { id: "area", label: "Area", icon: Ruler },
            { id: "water", label: "Water", icon: Droplets },
            { id: "seed", label: "Seed", icon: Sprout },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              invalidate();
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          calculate();
        }}
      >
        <div className="fields fields-2">
          <Field label="Field area">
            <Input
              required
              type="number"
              min="0.000001"
              step="any"
              value={area}
              onChange={(event) => {
                setArea(event.target.value);
                invalidate();
              }}
            />
          </Field>
          <Field label="Area unit">
            <Select
              value={unit}
              onChange={(event) => {
                setUnit(event.target.value as AreaUnit);
                invalidate();
              }}
            >
              {Object.keys(areaUnits).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </Select>
          </Field>
          {mode === "water" && (
            <>
              <Field label="Applied water depth (mm)">
                <Input
                  required
                  type="number"
                  min="0.000001"
                  max="1000"
                  step="any"
                  value={depth}
                  onChange={(event) => {
                    setDepth(event.target.value);
                    invalidate();
                  }}
                />
              </Field>
              <Field label="Pump flow (litres/minute, optional)">
                <Input
                  type="number"
                  min="0.000001"
                  max="10000000"
                  step="any"
                  value={flow}
                  onChange={(event) => {
                    setFlow(event.target.value);
                    invalidate();
                  }}
                />
              </Field>
            </>
          )}
          {mode === "seed" && (
            <>
              <Field label="Locally recommended seed rate">
                <Input
                  required
                  type="number"
                  min="0.000001"
                  max="10000"
                  step="any"
                  value={rate}
                  onChange={(event) => {
                    setRate(event.target.value);
                    invalidate();
                  }}
                />
              </Field>
              <Field label="Seed rate unit">
                <Select
                  value={rateUnit}
                  onChange={(event) => {
                    setRateUnit(event.target.value as typeof rateUnit);
                    invalidate();
                  }}
                >
                  <option>kg/ha</option>
                  <option>kg/acre</option>
                </Select>
              </Field>
            </>
          )}
        </div>
        <Button type="submit">
          <Calculator size={18} />
          Calculate
        </Button>
      </form>
      {error && <Notice error>{error}</Notice>}
      {result && (
        <section
          className="calculation-result"
          aria-label="Calculation result"
          aria-live="polite"
        >
          <div className="metrics">
            {result.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() =>
              downloadText(
                "farmassist-calculation.txt",
                `JOITAFA calculation\n${inputs}\n\n${result.map((item) => `${item.label}: ${item.value}`).join("\n")}\n\nArithmetic estimate only. Not a crop prescription.`,
              )
            }
          >
            <Download size={18} />
            Download calculation
          </Button>
        </section>
      )}
      <p className="calculator-note">
        {mode === "water"
          ? "Volume = area in square metres x applied depth in millimetres. Pump time assumes constant measured flow, with no delivery losses. This does not determine when or how much your crop needs watering."
          : mode === "seed"
            ? "Quantity = area x your entered seed rate. Use a locally recommended rate for the crop, variety and planting method. No rate is prescribed by this calculator."
            : "Standard acre and hectare conversions. Bigha, kanal and other local units are excluded because their definitions vary by region."}
      </p>
    </>
  );
}
