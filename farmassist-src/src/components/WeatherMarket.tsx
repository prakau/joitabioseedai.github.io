import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, LocateFixed, RefreshCw, Search } from "lucide-react";
import {
  fetchNasaClimatology,
  fetchMandiPrices,
  type MarketFilters,
} from "../services/publicApis";
import {
  searchPlaces,
  weatherAdvice,
  type Place,
  type WeatherReport,
} from "../lib/weather";
import { displayDate } from "../lib/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Busy, Empty, Field, Notice, Title } from "./workspace";
export function LocationPicker({
  place,
  onChange,
}: {
  place: Place;
  onChange: (place: Place) => void;
}) {
  const [search, setSearch] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function find() {
    if (search.trim().length < 2) {
      setMessage("Enter at least two letters of a town or district.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const results = await searchPlaces(search.trim());
      setPlaces(results);
      if (!results.length)
        setMessage("No matching places. Try the nearest town.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function locate() {
    setBusy(true);
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Location access is unavailable. Search for a town.");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: `Device location (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`,
        });
        setBusy(false);
      },
      () => {
        setMessage(
          "Location permission was denied or timed out. Search for your town instead.",
        );
        setBusy(false);
      },
      { timeout: 8000 },
    );
  }
  return (
    <div className="location-picker">
      <p>
        <strong>Selected location:</strong> {place.label}
      </p>
      <form
        className="location-search"
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <Field label="Search Indian town / district">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="For example, Hisar"
          />
        </Field>
        <Button type="submit" disabled={busy}>
          <Search size={18} />
          Search
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={locate}
        >
          <LocateFixed size={18} />
          Use my location
        </Button>
      </form>
      {busy && <Busy label="Finding location" />}
      {message && <Notice>{message}</Notice>}
      <div className="place-results">
        {places.map((p) => (
          <button
            key={`${p.lat},${p.lon}`}
            onClick={() => {
              onChange(p);
              setPlaces([]);
              setMessage("Location updated.");
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
export function Weather({
  place,
  onPlace,
  report,
  loading,
  refresh,
}: {
  place: Place;
  onPlace: (p: Place) => void;
  report?: WeatherReport;
  loading: boolean;
  refresh: () => void;
}) {
  const climate = useQuery({
    queryKey: ["climate-v3", place],
    queryFn: () => fetchNasaClimatology(place.lat, place.lon),
  });
  const parameters = climate.data?.data?.properties?.parameter;
  const month = new Date()
    .toLocaleString("en-US", { month: "short", timeZone: "Asia/Kolkata" })
    .toUpperCase();
  const temp = parameters?.T2M?.[month],
    rain = parameters?.PRECTOTCORR?.[month];
  return (
    <>
      <Title
        title="Local weather"
        description="Current estimates and a seven-day forecast for your selected location."
        action={
          <Button variant="secondary" disabled={loading} onClick={refresh}>
            <RefreshCw size={18} />
            Refresh
          </Button>
        }
      />
      <LocationPicker place={place} onChange={onPlace} />
      {loading && <Busy label="Fetching weather" />}
      {report && (
        <>
          <Notice>
            {report.status === "live"
              ? "Live weather"
              : report.status === "cached"
                ? "Cached weather"
                : "Weather unavailable"}{" "}
            / {report.source}.{" "}
            {report.observedAt
              ? `Observed ${displayDate(report.observedAt)}.`
              : ""}{" "}
            {report.note}
          </Notice>
          <div className="metrics">
            <div>
              <strong>
                {report.temperature === undefined
                  ? "--"
                  : `${report.temperature} C`}
              </strong>
              <span>Temperature</span>
            </div>
            <div>
              <strong>
                {report.humidity === undefined ? "--" : `${report.humidity}%`}
              </strong>
              <span>Relative humidity</span>
            </div>
            <div>
              <strong>
                {report.wind === undefined ? "--" : `${report.wind} km/h`}
              </strong>
              <span>Wind at 10 metres</span>
            </div>
            <div>
              <strong>
                {report.rain === undefined ? "--" : `${report.rain} mm`}
              </strong>
              <span>Precipitation, current interval</span>
            </div>
          </div>
          <p className="weather-advice">{weatherAdvice(report)}</p>
          {!!report.forecast.length && (
            <div className="table-wrap">
              <table>
                <caption>Seven-day forecast / local dates</caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>High / low</th>
                    <th>Rain total</th>
                    <th>Rain chance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.forecast.map((day) => (
                    <tr key={day.date}>
                      <td>{day.date}</td>
                      <td>
                        {day.high} / {day.low} C
                      </td>
                      <td>{day.rain} mm</td>
                      <td>{day.chance}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <section className="section-divider">
        <h3>Seasonal climate context</h3>
        <p>
          NASA POWER historical monthly climatology for {place.label}. These
          values are not today's weather or a forecast.
        </p>
        {climate.isPending ? (
          <Busy label="Fetching climate history" />
        ) : Number.isFinite(temp) &&
          Number.isFinite(rain) &&
          Number(temp) > -900 &&
          Number(rain) > -900 ? (
          <Notice>
            {month}: mean temperature {temp} C; mean daily precipitation {rain}{" "}
            mm/day. Source: NASA POWER, {climate.data?.status}. Retrieved{" "}
            {displayDate(climate.data?.retrievedAt)}.
          </Notice>
        ) : (
          <Empty>
            Historical climate data is currently unavailable for this location.
          </Empty>
        )}
        <a
          className="text-link"
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
        >
          Weather: Open-Meteo
        </a>
        <a
          className="text-link"
          href="https://power.larc.nasa.gov/"
          target="_blank"
          rel="noreferrer"
        >
          Climate: NASA POWER
        </a>
      </section>
    </>
  );
}
export function Market() {
  const [draft, setDraft] = useState<MarketFilters>({
    commodity: "",
    state: "Haryana",
    district: "",
    market: "",
    date: "",
  });
  const [filters, setFilters] = useState(draft);
  const query = useQuery({
    queryKey: ["market-v3", filters],
    queryFn: () => fetchMandiPrices(filters),
  });
  return (
    <>
      <Title
        title="Mandi market prices"
        description="Compare dated records by commodity, district, market, and arrival date."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...draft });
          if (JSON.stringify(filters) === JSON.stringify(draft))
            void query.refetch();
        }}
      >
        <div className="fields fields-3">
          {(["commodity", "state", "district", "market"] as const).map(
            (field) => (
              <Field
                key={field}
                label={field[0].toUpperCase() + field.slice(1)}
              >
                <Input
                  value={draft[field]}
                  maxLength={100}
                  onChange={(e) =>
                    setDraft({ ...draft, [field]: e.target.value })
                  }
                />
              </Field>
            ),
          )}
          <Field label="Arrival date (optional)">
            <Input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
        </div>
        <div className="actions">
          <Button disabled={query.isFetching}>
            <Search size={18} />
            Search prices
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={query.isFetching}
            onClick={() => {
              const allMarkets = { commodity: "", state: "", district: "", market: "", date: "" };
              setDraft(allMarkets);
              setFilters(allMarkets);
              if (Object.values(filters).every((value) => !value))
                void query.refetch();
            }}
          >
            <Globe size={18} />
            Show all markets
          </Button>
        </div>
      </form>
      {query.isFetching && <Busy label="Checking mandi records" />}
      {query.data && (
        <Notice>
          {query.data.source}: {query.data.status}.{" "}
          {query.data.message ||
            `Retrieved ${displayDate(query.data.retrievedAt)}.`}
          {query.data.sourceUpdatedAt &&
            ` Feed updated ${displayDate(query.data.sourceUpdatedAt)}.`}
          {query.data.status === "live" &&
            ` ${query.data.records.length} records shown${query.data.total !== undefined ? ` of ${query.data.total}` : ""}.`}
        </Notice>
      )}
      {!!query.data?.records.length && (
        <div className="table-wrap">
          <table>
            <caption>Rupees per quintal / {query.data.status} records</caption>
            <thead>
              <tr>
                <th>Commodity / variety</th>
                <th>Market</th>
                <th>District / state</th>
                <th>Arrival date</th>
                <th>Min / modal / max (Rs/q)</th>
              </tr>
            </thead>
            <tbody>
              {query.data.records.map((row, i) => (
                <tr key={i}>
                  <td>
                    {row.commodity}
                    <small>{row.variety}</small>
                  </td>
                  <td>{row.market}</td>
                  <td>
                    {row.district}, {row.state}
                  </td>
                  <td>{row.arrival_date}</td>
                  <td>
                    {row.min_price} / {row.modal_price} / {row.max_price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!query.isFetching && !query.data?.records.length && (
        <Empty>
          {query.data?.status === "live"
            ? `No published prices match ${filters.state.trim() || "these filters"}. The daily feed may not yet include your market; this is not a zero price.`
            : "No verified price records are available. Check the official market portal; sample values are not used."}
        </Empty>
      )}
      <div className="actions">
        <a
          className="text-link"
          href="https://agmarknet.gov.in/"
          target="_blank"
          rel="noreferrer"
        >
          Open official AGMARKNET prices
        </a>
        <a
          className="text-link"
          href="https://enam.gov.in/"
          target="_blank"
          rel="noreferrer"
        >
          Open e-NAM
        </a>
      </div>
      <p className="muted">
        Prices vary by arrival date, variety, grade, and market. Confirm with
        the mandi before a sale. Up to 200 matching records are returned.
      </p>
    </>
  );
}
