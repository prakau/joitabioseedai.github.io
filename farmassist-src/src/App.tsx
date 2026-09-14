import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Camera,
  CloudSun,
  Download,
  Home,
  Info,
  Leaf,
  Map,
  Menu,
  MessageSquare,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Sprout,
  Store,
  TestTube2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Advisory } from "./components/Advisory";
import { FarmPlot } from "./components/FarmPlot";
import { Calendar, Community, Soil } from "./components/FieldRecords";
import { SoundMonitor } from "./components/SoundMonitor";
import { LocationPicker, Market, Weather } from "./components/WeatherMarket";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Empty, Field, Notice, Title } from "./components/workspace";
import { requestJson, type ChatResult, type Health } from "./lib/network";
import { defaultPlace, fetchWeather, type Place } from "./lib/weather";
import {
  displayDate,
  downloadJson,
  readStored,
  useStored,
} from "./lib/storage";
import { cropGuides } from "./data/agriculture";

const modules = [
  { id: "home", label: "Home", icon: Home },
  { id: "ask", label: "Ask", icon: MessageSquare },
  { id: "diagnose", label: "Diagnose", icon: Camera },
  { id: "sound", label: "EHI / Sound", icon: Activity },
  { id: "weather", label: "Weather", icon: CloudSun },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "visualizer", label: "3D Plot", icon: Map },
  { id: "soil", label: "Soil", icon: TestTube2 },
  { id: "market", label: "Market", icon: Store },
  { id: "community", label: "Community", icon: Leaf },
  { id: "about", label: "About", icon: Info },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];
const recordKeys = [
  "joita-fa-questions",
  "joita-fa-layouts",
  "joita-fa-soils-v3",
  "joita-fa-soils",
  "joita-fa-sound-v3",
  "joita-fa-ehi",
  "joita-fa-posts",
  "joita-fa-plans-v3",
];
function exportRecords() {
  const records = Object.fromEntries(
    recordKeys.map((key) => [key, readStored(key, [])]),
  );
  downloadJson("joita-farmassist-records.json", {
    version: 3,
    exportedAt: new Date().toISOString(),
    records,
  });
}
export default function App() {
  const location = useLocation();
  const active = location.pathname.replace(/^\//, "") || "home";
  const [place, savePlace] = useStored<Place>(
    "joita-fa-location-v3",
    defaultPlace,
  );
  const [profile, saveProfile] = useStored("joita-fa-profile-v3", {
    farmName: "My farm",
    district: "",
  });
  const [online, setOnline] = useState(navigator.onLine);
  const [menu, setMenu] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<ChatResult | null>(null);
  const [storageWarning, setStorageWarning] = useState("");
  const [storageRevision, setStorageRevision] = useState(0);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    const warning = (e: Event) =>
      setStorageWarning((e as CustomEvent<string>).detail);
    const changed = () => setStorageRevision((v) => v + 1);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("storage-warning", warning);
    window.addEventListener("records-changed", changed);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("storage-warning", warning);
      window.removeEventListener("records-changed", changed);
    };
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `${modules.find((m) => m.id === active)?.label || "Home"} | JOITA FarmAssist`;
  }, [active]);
  const health = useQuery({
    queryKey: ["farmassist-health-v3", online],
    queryFn: () =>
      requestJson<Health>("/api/health", { cache: "no-store" }, 8000),
    enabled: online,
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const weather = useQuery({
    queryKey: ["weather-v3", place.lat, place.lon, online],
    queryFn: () => fetchWeather(place.lat, place.lon),
    networkMode: "always",
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const connected =
    online &&
    !health.isError &&
    health.data?.ok &&
    (health.data.hasGeminiKey || health.data.hasOpenRouterKey);
  const status = !online
    ? "Device offline"
    : health.isPending
      ? "Checking backend"
      : connected
        ? lastAnswer?.source === "gemini" || lastAnswer?.source === "openrouter"
          ? "Live AI online"
          : lastAnswer?.source === "offline_kb" && lastAnswer.failureReason
            ? "Live AI temporarily unavailable"
            : "Backend connected"
        : health.data?.ok
          ? "Live AI not configured"
          : "Backend unavailable";
  const savedCount =
    recordKeys.reduce(
      (sum, key) => sum + readStored<unknown[]>(key, []).length,
      0,
    ) +
    storageRevision * 0;
  const sound = readStored<{ activity: number }[]>("joita-fa-sound-v3", [])[0];
  const recordCount = (key: string) => readStored<unknown[]>(key, []).length;
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="app-brand">
          <span className="brand-icon">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="JOITA Bioseed AI" width="32" height="32" />
          </span>
          <span>
            <strong>JOITA FarmAssist</strong>
            <small>Practical support for your farm</small>
          </span>
        </NavLink>
        <div className="header-status">
          <span>
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            {online ? "Device online" : "Device offline"}
          </span>
          <span role="status">
            <i
              className={connected ? "status-light connected" : "status-light"}
            />
            {status}
          </span>
        </div>
        <a className="website-link" href="https://www.joitabioseedai.com/">
          Main website
          <ArrowUpRight size={17} />
        </a>
        <button
          className="menu-toggle"
          title="Toggle navigation"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <div className="workspace">
        <aside className={`app-sidebar ${menu ? "is-open" : ""}`}>
          <div className="farm-profile">
            <small>YOUR WORKSPACE</small>
            <strong>{profile.farmName}</strong>
            <span>{place.label}</span>
          </div>
          <nav aria-label="FarmAssist modules">
            {modules.map(({ id, label, icon: Icon }) => (
              <NavLink key={id} to={id === "home" ? "/" : `/${id}`} end>
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span>JOITA Bioseed AI</span>
            <a href="mailto:contact@joitabioseedai.com">Contact our team</a>
          </div>
        </aside>
        <main className="app-main" id="main-content">
          {storageWarning && <Notice error>{storageWarning}</Notice>}
          {!online && (
            <Notice>
              Device offline. Crop guides and saved records remain available.
              Live services will need a connection.
            </Notice>
          )}
          <div className="module-view" key={active}>
            {active === "home" && (
              <>
                <Title
                  title={`Good farming starts with a clear next step.`}
                  description={new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <section className="dashboard-advisory">
                  <div>
                    <span className="eyebrow">YOUR FIELD ADVISORY</span>
                    <h3>What is happening in your crop?</h3>
                    <p>
                      Ask a question or add a crop photo. Keep the answer with
                      your field records.
                    </p>
                    <NavLink className="primary-link" to="/ask">
                      Ask FarmAssist
                      <ArrowUpRight size={20} />
                    </NavLink>
                  </div>
                  <Sprout className="dashboard-sprout" aria-hidden size={100} />
                </section>
                <div className="metrics">
                  <div>
                    <strong>
                      {weather.data?.temperature !== undefined
                        ? `${weather.data.temperature} C`
                        : "--"}
                    </strong>
                    <span>
                      {weather.data?.status === "live"
                        ? "Live"
                        : weather.data?.status === "cached"
                          ? "Cached"
                          : "No current"}{" "}
                      weather
                    </span>
                    <small>{place.label}</small>
                  </div>
                  <div>
                    <strong>{sound ? `${sound.activity}%` : "--"}</strong>
                    <span>Latest sound activity</span>
                    <small>
                      {sound
                        ? "Recorded signal, not ecosystem health"
                        : "No recording measured yet"}
                    </small>
                  </div>
                  <div>
                    <strong>{savedCount}</strong>
                    <span>Saved records</span>
                    <small>Stored on this device</small>
                  </div>
                  <div>
                    <strong>{cropGuides.length}</strong>
                    <span>Crop guides</span>
                    <small>North India reference windows</small>
                  </div>
                </div>
                <h3 className="section-heading">Your farm tools</h3>
                <div className="tool-grid">
                  {[
                    {
                      id: "diagnose",
                      icon: Camera,
                      title: "Check a crop photo",
                      text: "Visible symptoms and the next field checks.",
                    },
                    {
                      id: "visualizer",
                      icon: Map,
                      title: "Plan your field",
                      text: `${recordCount("joita-fa-layouts")} layouts saved. Dimensions, rows, and irrigation.`,
                    },
                    {
                      id: "weather",
                      icon: CloudSun,
                      title: "Check local weather",
                      text: "Location-specific forecast with dated observations.",
                    },
                    {
                      id: "soil",
                      icon: TestTube2,
                      title: "Read your soil test",
                      text: "Measured values, explicit units, and soil context.",
                    },
                    {
                      id: "calendar",
                      icon: CalendarDays,
                      title: "Plan crop tasks",
                      text: "Search growing windows and save dated tasks.",
                    },
                    {
                      id: "sound",
                      icon: Activity,
                      title: "Record field sound",
                      text: "Measure sound activity and review nearby records.",
                    },
                  ].map((tool) => (
                    <NavLink
                      className="tool-item"
                      key={tool.id}
                      to={`/${tool.id}`}
                    >
                      <tool.icon size={24} />
                      <h4>{tool.title}</h4>
                      <p>{tool.text}</p>
                      <ArrowUpRight className="tool-arrow" size={20} />
                    </NavLink>
                  ))}
                </div>
                <p className="pilot-note">
                  FarmAssist is in pilot mode. Responses are AI-assisted and
                  should be confirmed with local expert recommendations.
                </p>
              </>
            )}
            {(active === "ask" || active === "diagnose") && (
              <Advisory
                key={active}
                location={profile.district || place.label}
                diagnose={active === "diagnose"}
                onResult={setLastAnswer}
              />
            )}
            {active === "visualizer" && <FarmPlot />}
            {active === "soil" && <Soil />}
            {active === "calendar" && <Calendar />}
            {active === "community" && <Community />}
            {active === "sound" && <SoundMonitor place={place} />}
            {active === "weather" && (
              <Weather
                place={place}
                onPlace={savePlace}
                report={weather.data}
                loading={weather.isFetching}
                refresh={() => {
                  void weather.refetch();
                }}
              />
            )}
            {active === "market" && <Market />}
            {active === "settings" && (
              <SettingsPanel
                profile={profile}
                saveProfile={saveProfile}
                place={place}
                savePlace={savePlace}
                health={health.data}
                healthError={health.error?.message}
                status={status}
                lastAnswer={lastAnswer}
                refresh={() => {
                  void health.refetch();
                }}
              />
            )}
            {active === "about" && (
              <>
                <Title
                  title="JOITA FarmAssist"
                  description="AI-powered, offline-first farm advisory for Indian farmers."
                />
                <p>
                  FarmAssist brings crop questions, photographs, local weather,
                  soil reports, and field plans into one workspace. Live
                  advisory uses a secure JOITA server with Gemini primary and
                  OpenRouter fallback.
                </p>
                <div className="result-list">
                  <div>
                    <h3>Know what an answer is based on</h3>
                    <p>
                      Each answer identifies live AI or the offline crop guide.
                      Photo review supports field checks; it does not confirm a
                      disease, laboratory measurement, or treatment
                      prescription.
                    </p>
                  </div>
                  <div>
                    <h3>Your records</h3>
                    <p>
                      Saved questions, plans, notes, and measurements stay in
                      this browser. They are not automatically shared across
                      devices. Export a backup in Settings before clearing
                      browser data.
                    </p>
                  </div>
                  <div>
                    <h3>Data sources</h3>
                    <p>
                      Weather: <a href="https://open-meteo.com/">Open-Meteo</a>.
                      Historical climate:{" "}
                      <a href="https://power.larc.nasa.gov/">NASA POWER</a>.
                      Biodiversity: <a href="https://www.gbif.org/">GBIF</a> and{" "}
                      <a href="https://www.inaturalist.org/">iNaturalist</a>.
                      Market: AGMARKNET when connected.
                    </p>
                  </div>
                </div>
                <a
                  className="text-link"
                  href="mailto:contact@joitabioseedai.com"
                >
                  Contact JOITA: contact@joitabioseedai.com
                </a>
              </>
            )}
            {!modules.some((m) => m.id === active) && (
              <>
                <Title
                  title="Page not found"
                  description="Choose a farm tool from the navigation."
                />
                <NavLink className="primary-link" to="/">
                  Open dashboard
                </NavLink>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
function SettingsPanel({
  profile,
  saveProfile,
  place,
  savePlace,
  health,
  healthError,
  status,
  lastAnswer,
  refresh,
}: {
  profile: { farmName: string; district: string };
  saveProfile: (p: { farmName: string; district: string }) => boolean;
  place: Place;
  savePlace: (p: Place) => boolean;
  health?: Health;
  healthError?: string;
  status: string;
  lastAnswer: ChatResult | null;
  refresh: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [message, setMessage] = useState("");
  const [offlineStatus, setOfflineStatus] = useState(
    "Checking offline availability",
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const keys = await caches.keys();
        const ready = keys.some((key) => key === "joita-farmassist-v3");
        if (!cancelled)
          setOfflineStatus(
            ready
              ? "App shell downloaded for offline use on this device."
              : "Offline app download is not ready. Keep the production app open while connected, then check again.",
          );
      } catch {
        if (!cancelled)
          setOfflineStatus(
            "Offline app caching is unavailable in this browser. You can still export your records.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <>
      <Title
        title="Settings & offline data"
        description="Your farm profile, location, saved records, and service status."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (saveProfile(draft)) setMessage("Farm profile saved.");
        }}
      >
        <div className="fields fields-2">
          <Field label="Farm name">
            <Input
              required
              maxLength={80}
              value={draft.farmName}
              onChange={(e) => setDraft({ ...draft, farmName: e.target.value })}
            />
          </Field>
          <Field label="Advisory district / state">
            <Input
              maxLength={120}
              value={draft.district}
              onChange={(e) => setDraft({ ...draft, district: e.target.value })}
            />
          </Field>
        </div>
        <Button>
          <Save size={18} />
          Save settings
        </Button>
      </form>
      {message && <Notice>{message}</Notice>}
      <LocationPicker place={place} onChange={savePlace} />
      <section className="section-divider">
        <h3>Offline records</h3>
        <Notice>{offlineStatus}</Notice>
        <p>
          Records are saved to this browser. Export them before clearing website
          data or switching devices.
        </p>
        <Button variant="secondary" onClick={exportRecords}>
          <Download size={18} />
          Export all farm records
        </Button>
        <p className="muted">
          Old EHI and soil records are included in exports for continuity, but
          are not presented as newly validated measurements.
        </p>
      </section>
      <section className="section-divider">
        <h3>Service status</h3>
        <Notice>
          {status}. {healthError || ""}
        </Notice>
        <Button variant="secondary" onClick={refresh}>
          <RefreshCw size={18} />
          Check backend
        </Button>
        <p>
          Market feed: {health?.hasMarketKey ? "Configured" : "Not connected"}.
          Community posts: on this device only. Sound analysis: digital signal
          measurements, without species recognition.
        </p>
        {health?.ok && !health.hasGeminiKey && !health.hasOpenRouterKey && (
          <Notice error>
            Live AI is not configured. Add GEMINI_API_KEY or OPENROUTER_API_KEY
            in Vercel.
          </Notice>
        )}
        <details>
          <summary>Connection diagnostics</summary>
          <dl>
            <dt>Backend URL</dt>
            <dd>{window.location.origin}/api/farmassist-chat</dd>
            <dt>Current hostname</dt>
            <dd>{window.location.hostname}</dd>
            <dt>Health checked</dt>
            <dd>{displayDate(health?.timestamp)}</dd>
            <dt>Environment</dt>
            <dd>{health?.environment || "Unavailable"}</dd>
            <dt>Gemini / OpenRouter configured</dt>
            <dd>
              {health?.hasGeminiKey ? "Yes" : "No"} /{" "}
              {health?.hasOpenRouterKey ? "Yes" : "No"}
            </dd>
            <dt>Last response source</dt>
            <dd>{lastAnswer?.source || "No question sent in this session"}</dd>
            <dt>Last failure</dt>
            <dd>{lastAnswer?.failureReason || healthError || "None"}</dd>
          </dl>
        </details>
      </section>
    </>
  );
}
