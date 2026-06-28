import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  CalendarDays,
  Camera,
  CheckCircle2,
  CloudSun,
  Ear,
  ExternalLink,
  Home,
  Info as InfoIcon,
  Leaf,
  Loader2,
  Map,
  MessageSquare,
  Mic,
  NotebookPen,
  Save,
  Send,
  Settings,
  Sparkles,
  Sprout,
  Store,
  TestTube2,
  Trash2,
  Wifi,
  WifiOff
} from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input, Textarea } from "./components/ui/input";
import { cropGuides, knowledgeCards, marketPrices, soilProfiles } from "./data/agriculture";
import { answerFarmQuestion, diagnosePlant, estimateBioacoustics } from "./lib/farm-ai";
import { safeJsonParse } from "./lib/utils";
import { fetchWeather, type WeatherReport } from "./lib/weather";
import { fetchGbifContext, fetchINaturalistContext, fetchMandiPrices, fetchNasaClimatology, fetchNasaPower } from "./services/publicApis";
import { searchKnowledgeBase, type KbMatch } from "./services/semanticSearch";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (eventName: string, options?: { props?: Record<string, string | number | boolean> }) => void;
    umami?: { track?: (eventName: string, props?: Record<string, string | number | boolean>) => void };
  }
}

type QuestionRecord = { id: string; question: string; answer: string; date: string };
type FarmAssistSource = "gemini" | "openrouter" | "offline_kb" | "validation" | string;
type FarmAssistChatResponse = { ok: boolean; answer: string; model: string; mode: "text" | "vision" | "fallback" | string; source?: FarmAssistSource; failureReason?: string; errorDebug?: unknown };
type FarmAssistHealthResponse = { ok: boolean; service?: string; hasGeminiKey?: boolean; hasOpenRouterKey?: boolean; timestamp?: string; environment?: string; status?: string };
type AiStatus = "checking" | "backend_connected" | "online" | "offline" | "not_configured";
type EhiReading = { id: string; date: string; ehi: number; activity: number; silence: number; frequency: number; interpretation: string };
type LayoutRecord = { id: string; crop: string; length: number; width: number; rows: number; irrigation: string; notes: string; date: string };
type SoilReport = { id: string; crop: string; ph: number; ec: number; oc: number; n: number; p: number; k: number; zn: number; fe: number; soil: string; summary: string; date: string };
type CommunityPost = { id: string; name: string; village: string; crop: string; issue: string; text: string; photo?: string; date: string };
type FollowUpRecord = { id: string; contact: string; crop: string; location: string; problemType: string; date: string };
type SettingsState = { dataGovKey: string; plantNetKey: string; enableTransformers: boolean; farmName: string; village: string };

const keys = {
  questions: "joita-fa-questions",
  ehi: "joita-fa-ehi",
  layouts: "joita-fa-layouts",
  soils: "joita-fa-soils",
  posts: "joita-fa-posts",
  weather: "joita-fa-weather",
  settings: "joita-fa-settings",
  followUps: "joita-fa-followups",
  analytics: "joita-fa-analytics",
  apiBase: "joita-fa-api-base"
};

const nav = [
  { id: "home", label: "Home", icon: Home },
  { id: "ask", label: "Ask", icon: Leaf },
  { id: "diagnose", label: "Diagnose", icon: Camera },
  { id: "sound", label: "EHI", icon: Ear },
  { id: "weather", label: "Weather", icon: CloudSun },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "visualizer", label: "3D Plot", icon: Map },
  { id: "soil", label: "Soil", icon: TestTube2 },
  { id: "market", label: "Market", icon: Store },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "about", label: "About", icon: InfoIcon },
  { id: "settings", label: "Settings", icon: Settings }
];

const symptoms = ["yellow leaves", "brown spots", "leaf curl", "white insects", "wilting", "fruit holes", "powdery growth", "black rot"];
const issueTypes = ["Pest", "Disease", "Irrigation", "Fertilizer", "Weather", "Market", "Other"];
const cropStages = ["not sure", "sowing", "seedling", "vegetative", "flowering", "fruiting", "grain filling", "harvest"];
const problemTypes = ["general", "disease", "nutrition", "pest", "weather"];
const languages = ["English", "Hindi", "Haryanvi"];
const privacyNotice = "Do not upload personal documents or private information. FarmAssist is for crop advisory support only.";
const safetyNotice = "AI-assisted advisory. Confirm pesticide/fertilizer use with local label, KVK, or agriculture expert.";
const pilotNotice = "FarmAssist is in pilot mode. Responses are AI-assisted and should be confirmed with local expert recommendations.";
const maxMessageLength = 1000;
const maxImageBytes = 4 * 1024 * 1024;
const chatRequestTimeoutMs = 25000;
const defaultFarmAssistQuestion = "Hi. Please give quick practical crop checks for my farm.";
const joitaEmail = "contact@joitabioseedai.com";
const offlineKbMessage = "Offline JOITA advisory mode is ready. FarmAssist will answer from the built-in crop knowledge base.";
const liveAiFallbackMessage = "Live AI failed. Offline KB answered instead.";
const liveAiNotConfiguredMessage = "Live AI is not configured. Add GEMINI_API_KEY or OPENROUTER_API_KEY in Vercel.";
const quickFarmPrompts = [
  {
    label: "Tomato leaf curl",
    prompt: "Tomato leaves are yellowing and curling. What should I check?",
    crop: "Tomato",
    location: "Haryana",
    stage: "flowering",
    problemType: "disease"
  },
  {
    label: "Mustard flowering",
    prompt: "Mustard crop is at flowering stage in Haryana. What should I check this week?",
    crop: "Mustard",
    location: "Haryana",
    stage: "flowering",
    problemType: "general"
  },
  {
    label: "Wheat heat stress",
    prompt: "Wheat is facing hot dry weather. How should I manage irrigation and stress?",
    crop: "Wheat",
    location: "Haryana",
    stage: "grain filling",
    problemType: "weather"
  },
  {
    label: "Cotton whitefly",
    prompt: "Cotton has white insects on the underside of leaves. What safe checks should I do?",
    crop: "Cotton",
    location: "Haryana",
    stage: "vegetative",
    problemType: "pest"
  }
] as const;

function readList<T>(key: string, fallback: T[] = []) {
  if (typeof localStorage === "undefined") return fallback;
  return safeJsonParse<T[]>(localStorage.getItem(key), fallback);
}

function saveList<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeAnalyticsValue(value: string, fallback = "not provided") {
  return (value || fallback).replace(/[^\w\s,.-]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || fallback;
}

function trackFarmAssistEvent(eventName: string, props: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  const safeProps = {
    crop: sanitizeAnalyticsValue(String(props.crop || "")),
    location: sanitizeAnalyticsValue(String(props.location || "")),
    problemType: sanitizeAnalyticsValue(String(props.problemType || "general"), "general"),
    model: sanitizeAnalyticsValue(String(props.model || "not used"), "not used"),
    hasImage: Boolean(props.hasImage),
    timestamp: new Date().toISOString()
  };
  try {
    window.gtag?.("event", eventName, safeProps);
    window.dataLayer?.push({ event: eventName, ...safeProps });
    window.plausible?.(eventName, { props: safeProps });
    window.umami?.track?.(eventName, safeProps);
  } catch {
    // Analytics must never block farmer advisory.
  }
  try {
    const localEvents = readList<typeof safeProps & { event: string }>(keys.analytics).slice(0, 49);
    saveList(keys.analytics, [{ event: eventName, ...safeProps }, ...localEvents]);
  } catch {
    // Ignore localStorage quota or privacy-mode failures.
  }
}

function diagnosticMessage(reason: string) {
  const lower = reason.toLowerCase();
  if (lower.includes("please ask") || lower.includes("under 1000") || lower.includes("smaller than 4 mb")) {
    return reason;
  }
  if (lower.includes("gemini_api_key") || lower.includes("openrouter_api_key") || lower.includes("not configured") || lower.includes("missing or invalid")) {
    return liveAiNotConfiguredMessage;
  }
  if (lower.includes("rate") || lower.includes("quota") || lower.includes("limited")) {
    return "Live AI is busy right now. FarmAssist answered from the built-in JOITA crop knowledge base.";
  }
  return liveAiFallbackMessage;
}

function sourceBadgeLabel(source?: FarmAssistSource) {
  if (source === "gemini") return "Live AI: Gemini";
  if (source === "openrouter") return "Live AI: OpenRouter";
  if (source === "offline_kb") return "Offline KB";
  return "FarmAssist";
}

function sourceBadgeClass(source?: FarmAssistSource) {
  if (source === "gemini" || source === "openrouter") return "bg-sage-800 text-white";
  if (source === "offline_kb") return "bg-amber-50 text-sage-900";
  return "";
}

function statusDotClass(status: AiStatus) {
  return status === "online" || status === "backend_connected" ? "online" : status === "checking" ? "checking" : "offline";
}

function aiStatusLabel(status: AiStatus) {
  if (status === "backend_connected") return "Backend connected";
  if (status === "online") return "Live AI online";
  if (status === "offline") return "Live AI offline";
  if (status === "not_configured") return "Live AI not configured";
  return "AI status checking";
}

function normalizeFarmAssistQuestion(value: string) {
  return value.trim() || defaultFarmAssistQuestion;
}

async function fetchJsonWithTimeout<T>(url: string, options: RequestInit = {}, timeoutMs = chatRequestTimeoutMs) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => null) as T | null;
    return { response, data };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("FarmAssist backend request timed out. Offline KB answered instead.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function App() {
  const [active, setActive] = useState("home");
  const [online, setOnline] = useState(navigator.onLine);
  const [question, setQuestion] = useState("How should I manage aphids in mustard?");
  const [questions, setQuestions] = useState<QuestionRecord[]>(() => readList(keys.questions));
  const [chatForm, setChatForm] = useState({ crop: "Mustard", location: "Haryana", stage: "flowering", language: "English", problemType: "general", imageUrl: "", imageName: "" });
  const [chatResponse, setChatResponse] = useState<FarmAssistChatResponse | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus>("checking");
  const [aiStatusDetail, setAiStatusDetail] = useState("");
  const [apiBaseOverride, setApiBaseOverride] = useState(() => localStorage.getItem(keys.apiBase) ?? "");
  const [apiHealth, setApiHealth] = useState<FarmAssistHealthResponse | null>(null);
  const [lastResponseSource, setLastResponseSource] = useState<FarmAssistSource>("none");
  const [lastFailureReason, setLastFailureReason] = useState("");
  const [followUpContact, setFollowUpContact] = useState("");
  const [followUpSaved, setFollowUpSaved] = useState("");
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>(() => readList(keys.followUps));
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(["yellow leaves", "brown spots"]);
  const [imageName, setImageName] = useState("leaf-symptom.jpg");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ehiReadings, setEhiReadings] = useState<EhiReading[]>(() => readList(keys.ehi));
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioMetrics, setAudioMetrics] = useState({ activity: 42, silence: 28, frequency: 51 });
  const [geo, setGeo] = useState({ lat: 29.0588, lon: 76.0856, label: "Haryana fallback" });
  const [calendarFilter, setCalendarFilter] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("All");
  const [layout, setLayout] = useState({ length: 80, width: 45, crop: "Wheat", rows: 8, irrigation: "Drip", notes: "North side needs drainage" });
  const [layouts, setLayouts] = useState<LayoutRecord[]>(() => readList(keys.layouts));
  const [soilInput, setSoilInput] = useState({ ph: 7.8, ec: 0.8, oc: 0.42, n: 230, p: 18, k: 150, zn: 0.5, fe: 4.8, soil: "Alluvial soil", crop: "Wheat" });
  const [soilReports, setSoilReports] = useState<SoilReport[]>(() => readList(keys.soils));
  const [marketFilter, setMarketFilter] = useState({ commodity: "", state: "Haryana", district: "", market: "", date: today() });
  const [settings, setSettings] = useState<SettingsState>(() => safeJsonParse(localStorage.getItem(keys.settings), { dataGovKey: "", plantNetKey: "", enableTransformers: false, farmName: "My JOITA farm", village: "Haryana village" }));
  const [kbMatches, setKbMatches] = useState<KbMatch[]>([]);
  const [postForm, setPostForm] = useState({ name: "", village: "", crop: "Wheat", issue: "Pest", text: "", photo: "" });
  const [posts, setPosts] = useState<CommunityPost[]>(() =>
    readList(keys.posts, [
      { id: "seed-1", name: "Sushila", village: "Hisar", crop: "Cotton", issue: "Pest", text: "Yellow sticky traps helped monitor whitefly before spraying.", date: "2026-06-01" },
      { id: "seed-2", name: "Ravi", village: "Karnal", crop: "Rice", issue: "Weather", text: "Drainage channel saved nursery after heavy rain.", date: "2026-06-03" }
    ])
  );
  const [postSearch, setPostSearch] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const devMode = import.meta.env.DEV;
  const apiBase = useMemo(() => {
    const envBase = String(import.meta.env.VITE_FARMASSIST_API_BASE || "");
    return (envBase || apiBaseOverride).trim().replace(/\/$/, "");
  }, [apiBaseOverride]);
  const apiEndpoint = (path: string) => `${apiBase}${path}`;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkAiStatus() {
      if (!navigator.onLine) {
        setAiStatus("offline");
        setAiStatusDetail("Device is offline. FarmAssist will use the built-in JOITA crop knowledge base.");
        setLastFailureReason("Device is offline.");
        return;
      }
      setAiStatus("checking");
      setAiStatusDetail("Checking FarmAssist AI backend...");
      try {
        const { response, data } = await fetchJsonWithTimeout<FarmAssistHealthResponse>(apiEndpoint("/api/health"), { cache: "no-store" }, 9000);
        if (cancelled) return;
        setApiHealth(data);
        if (response.ok && (data?.hasGeminiKey || data?.hasOpenRouterKey)) {
          setAiStatus("backend_connected");
          setAiStatusDetail("Backend connected. Live AI key available.");
          setLastFailureReason("");
        } else if (response.ok && data?.hasGeminiKey === false && data?.hasOpenRouterKey === false) {
          setAiStatus("not_configured");
          setAiStatusDetail(liveAiNotConfiguredMessage);
          setLastFailureReason(liveAiNotConfiguredMessage);
        } else {
          setAiStatus("offline");
          setAiStatusDetail("Backend health check failed. Live AI may be offline.");
          setLastFailureReason(`Health check failed with status ${response.status}.`);
        }
      } catch (error) {
        if (!cancelled) {
          setApiHealth(null);
          setAiStatus("offline");
          setAiStatusDetail("Backend is not reachable from this page. If the domain is on GitHub Pages, set the temporary Vercel API base URL in Settings or move the domain to Vercel.");
          setLastFailureReason(error instanceof Error ? error.message : "Health check request failed.");
        }
      }
    }
    checkAiStatus();
    return () => {
      cancelled = true;
    };
  }, [online, apiBase]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Your location" }),
      () => undefined,
      { timeout: 5000 }
    );
  }, []);

  const weather = useQuery({
    queryKey: ["weather", geo.lat, geo.lon],
    queryFn: async () => {
      const report = await fetchWeather(geo.lat, geo.lon);
      localStorage.setItem(keys.weather, JSON.stringify(report));
      return report;
    }
  });
  const nasa = useQuery({ queryKey: ["nasa", geo.lat, geo.lon], queryFn: () => fetchNasaPower(geo.lat, geo.lon), staleTime: 1000 * 60 * 60 * 12 });
  const climatology = useQuery({ queryKey: ["nasa-climatology", geo.lat, geo.lon], queryFn: () => fetchNasaClimatology(geo.lat, geo.lon), staleTime: 1000 * 60 * 60 * 24 * 7 });
  const gbif = useQuery({ queryKey: ["gbif", geo.lat, geo.lon], queryFn: () => fetchGbifContext(geo.lat, geo.lon), staleTime: 1000 * 60 * 60 * 24 });
  const inat = useQuery({ queryKey: ["inat", geo.lat, geo.lon], queryFn: () => fetchINaturalistContext(geo.lat, geo.lon), staleTime: 1000 * 60 * 60 * 24 });
  const mandi = useQuery({
    queryKey: ["mandi", settings.dataGovKey, marketFilter.state, marketFilter.district, marketFilter.commodity],
    queryFn: () => fetchMandiPrices({ apiKey: settings.dataGovKey, state: marketFilter.state, district: marketFilter.district, commodity: marketFilter.commodity }),
    staleTime: 1000 * 60 * 30
  });

  const crop = cropGuides.find((item) => item.crop === selectedCrop) ?? cropGuides[0];
  const diagnosis = diagnosePlant(imageName, `${selectedCrop} ${selectedSymptoms.join(" ")}`);
  const ehi = Math.max(0, Math.min(100, Math.round(audioMetrics.activity * 0.45 + (100 - audioMetrics.silence) * 0.25 + audioMetrics.frequency * 0.3)));
  const interpretation = ehi <= 30 ? "Poor activity" : ehi <= 60 ? "Moderate activity" : ehi <= 80 ? "Good biological activity" : "High biological activity";
  const filteredCrops = cropGuides.filter((item) => {
    const textMatch = `${item.crop} ${item.keywords.join(" ")}`.toLowerCase().includes(calendarFilter.toLowerCase());
    const seasonMatch = seasonFilter === "All" || item.season.toLowerCase().includes(seasonFilter.toLowerCase());
    return textMatch && seasonMatch;
  });
  const filteredMarkets = marketPrices.filter((item) => item.commodity.toLowerCase().includes(marketFilter.commodity.toLowerCase()));
  const filteredPosts = posts.filter((post) => `${post.name} ${post.village} ${post.crop} ${post.issue} ${post.text}`.toLowerCase().includes(postSearch.toLowerCase()));
  const storageCounts = useMemo<Array<[string, number]>>(() => [
    ["Questions", questions.length],
    ["EHI readings", ehiReadings.length],
    ["Soil reports", soilReports.length],
    ["Farm layouts", layouts.length],
    ["Community posts", posts.length],
    ["Follow-ups", followUps.length]
  ], [questions.length, ehiReadings.length, soilReports.length, layouts.length, posts.length, followUps.length]);
  const followUpMailto = useMemo(() => {
    const body = `Want expert follow-up from FarmAssist.\n\nContact: ${followUpContact || "not provided"}\nCrop: ${chatForm.crop}\nLocation: ${chatForm.location}\nProblem type: ${chatForm.problemType}\n\nPlease contact me for crop advisory support.`;
    return `mailto:${joitaEmail}?subject=${encodeURIComponent("FarmAssist expert follow-up")}&body=${encodeURIComponent(body)}`;
  }, [chatForm.crop, chatForm.location, chatForm.problemType, followUpContact]);

  async function ask() {
    const askedQuestion = normalizeFarmAssistQuestion(question);
    if (askedQuestion !== question) setQuestion(askedQuestion);
    const matches = await searchKnowledgeBase(askedQuestion);
    setKbMatches(matches);
    const result = answerFarmQuestion(askedQuestion);
    const weatherText = weather.data ? `Weather: ${weather.data.sprayDecision} Irrigation urgency ${weather.data.irrigationUrgency}/100. Disease risk ${weather.data.diseaseRisk}/100.` : "Weather: offline fallback or cached data.";
    const stageText = matches[0] ? `Best KB source: ${matches[0].source} (${matches[0].mode}).` : "Best KB source: JOITA offline crop database.";
    const marketText = mandi.data?.records?.length ? `Mandi context: ${mandi.data.source}.` : "Mandi context: offline cache.";
    const grounded = `${result} ${weatherText} ${stageText} ${marketText} Confidence: ${matches[0]?.score ? "Medium-High" : "Medium"} based on available offline/online signals.`;
    const next = [{ id: crypto.randomUUID(), question: askedQuestion, answer: grounded, date: today() }, ...questions].slice(0, 30);
    setQuestions(next);
    saveList(keys.questions, next);
  }

  function offlineFarmAssistFallback(reason: string, askedQuestion = normalizeFarmAssistQuestion(question)): FarmAssistChatResponse {
    const offline = answerFarmQuestion(askedQuestion);
    return {
      ok: false,
      model: "offline-joita-kb",
      mode: "fallback",
      source: "offline_kb",
      failureReason: reason,
      answer: `Likely Issue:
${offline}

Immediate Action:
Monitor the crop, remove badly affected material where practical, correct irrigation stress, and avoid unnecessary spray.

What to Check:
Crop: ${chatForm.crop}. Stage: ${chatForm.stage}. Location: ${chatForm.location}. Check underside of leaves, spread pattern, recent weather, soil moisture, and nearby affected plants.

Safe Advisory:
Use only locally approved label dose and confirm with local KVK/extension expert.

When to Contact Expert:
Contact an expert if symptoms spread fast, plants wilt, or pest/disease pressure increases.

Offline mode:
This answer comes from the built-in JOITA crop knowledge base. Live AI can be connected through the secure backend when available.`
    };
  }

  async function askLiveFarmAssist() {
    const askedQuestion = normalizeFarmAssistQuestion(question);
    if (askedQuestion !== question) setQuestion(askedQuestion);
    if (askedQuestion.length > maxMessageLength) {
      setChatError("Please keep the FarmAssist question under 1000 characters.");
      return;
    }
    setChatLoading(true);
    setChatError("");
    trackFarmAssistEvent("FarmAssist question submitted", {
      crop: chatForm.crop,
      location: chatForm.location,
      problemType: chatForm.problemType,
      model: "pending",
      hasImage: Boolean(chatForm.imageUrl)
    });
    try {
      const { response, data } = await fetchJsonWithTimeout<FarmAssistChatResponse>(apiEndpoint("/api/farmassist-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: askedQuestion,
          crop: chatForm.crop,
          location: chatForm.location,
          stage: chatForm.stage,
          language: chatForm.language,
          problemType: chatForm.problemType,
          imageUrl: chatForm.imageUrl
        })
      });
      if (!response.ok || !data?.answer) {
        if (data?.answer) {
          const fallbackData = {
            ...data,
            ok: false,
            failureReason: data.failureReason || data.answer || `Backend returned status ${response.status}.`
          };
          setAiStatus("offline");
          setAiStatusDetail(diagnosticMessage(fallbackData.failureReason));
          setLastResponseSource(fallbackData.source || "offline_kb");
          setLastFailureReason(fallbackData.failureReason);
          setChatResponse(fallbackData);
          setChatError(diagnosticMessage(fallbackData.failureReason));
          const next = [{ id: crypto.randomUUID(), question: askedQuestion, answer: fallbackData.answer, date: today() }, ...questions].slice(0, 30);
          setQuestions(next);
          saveList(keys.questions, next);
          trackFarmAssistEvent("AI fallback triggered", {
            crop: chatForm.crop,
            location: chatForm.location,
            problemType: chatForm.problemType,
            model: fallbackData.model,
            hasImage: Boolean(chatForm.imageUrl)
          });
          return;
        }
        setAiStatus("offline");
        throw new Error(data?.failureReason || liveAiFallbackMessage);
      }
      const responseSource = data.source || (data.ok ? "unknown" : "offline_kb");
      setLastResponseSource(responseSource);
      setLastFailureReason(data.failureReason || "");
      if (responseSource === "offline_kb") {
        setAiStatus("offline");
        const detail = liveAiFallbackMessage;
        setAiStatusDetail(detail);
        setChatError(detail);
        trackFarmAssistEvent("AI fallback triggered", {
          crop: chatForm.crop,
          location: chatForm.location,
          problemType: chatForm.problemType,
          model: data.model,
          hasImage: Boolean(chatForm.imageUrl)
        });
      } else {
        setAiStatus("online");
        setAiStatusDetail(sourceBadgeLabel(responseSource));
        setChatError("");
        trackFarmAssistEvent("AI response received", {
          crop: chatForm.crop,
          location: chatForm.location,
          problemType: chatForm.problemType,
          model: data.model,
          hasImage: Boolean(chatForm.imageUrl)
        });
      }
      setChatResponse(data);
      const next = [{ id: crypto.randomUUID(), question: askedQuestion, answer: data.answer, date: today() }, ...questions].slice(0, 30);
      setQuestions(next);
      saveList(keys.questions, next);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Live FarmAssist AI is unavailable.";
      const fallback = offlineFarmAssistFallback(reason, askedQuestion);
      setAiStatus("offline");
      setAiStatusDetail(diagnosticMessage(reason));
      setLastResponseSource("offline_kb");
      setLastFailureReason(reason);
      setChatResponse(fallback);
      setChatError(diagnosticMessage(reason));
      const next = [{ id: crypto.randomUUID(), question: askedQuestion, answer: fallback.answer, date: today() }, ...questions].slice(0, 30);
      setQuestions(next);
      saveList(keys.questions, next);
      trackFarmAssistEvent("AI fallback triggered", {
        crop: chatForm.crop,
        location: chatForm.location,
        problemType: chatForm.problemType,
        model: fallback.model,
        hasImage: Boolean(chatForm.imageUrl)
      });
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatImageUpload(file?: File) {
    if (!file) return;
    if (file.size > maxImageBytes) {
      setChatError("Please upload a crop photo smaller than 4 MB for live AI diagnosis.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setChatForm((current) => ({ ...current, imageUrl: String(reader.result ?? ""), imageName: file.name }));
      setChatError("");
      trackFarmAssistEvent("Image uploaded", {
        crop: chatForm.crop,
        location: chatForm.location,
        problemType: chatForm.problemType,
        model: "not used",
        hasImage: true
      });
    };
    reader.readAsDataURL(file);
  }

  function saveFollowUpRequest() {
    const contact = followUpContact.trim();
    if (!contact) {
      setFollowUpSaved("Optional: add WhatsApp or email if you want expert follow-up.");
      return;
    }
    const record = {
      id: crypto.randomUUID(),
      contact: contact.slice(0, 120),
      crop: chatForm.crop,
      location: chatForm.location,
      problemType: chatForm.problemType,
      date: new Date().toISOString()
    };
    const next = [record, ...followUps].slice(0, 30);
    setFollowUps(next);
    saveList(keys.followUps, next);
    setFollowUpSaved("Follow-up contact saved on this device. Use Email JOITA to send it directly.");
  }

  async function startRecording(testSeconds = 60) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const samples: number[] = [];
    const frequencySamples: number[] = [];
    audioChunks.current = [];
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.ondataavailable = (event) => audioChunks.current.push(event.data);
    mediaRecorder.current.start();
    setRecording(true);
    setSeconds(0);
    let elapsed = 0;
    timer.current = window.setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
      const activeBands = data.filter((value) => value > 38).length / data.length;
      samples.push(avg);
      frequencySamples.push(activeBands * 100);
      if (elapsed >= testSeconds) {
        stopRecording(samples, frequencySamples, stream, audioContext);
      }
    }, 1000);
  }

  function stopRecording(samples: number[], frequencySamples: number[], stream: MediaStream, audioContext: AudioContext) {
    if (timer.current) window.clearInterval(timer.current);
    mediaRecorder.current?.stop();
    stream.getTracks().forEach((track) => track.stop());
    audioContext.close();
    const activity = samples.length ? Math.round(Math.min(100, samples.reduce((a, b) => a + b, 0) / samples.length)) : 0;
    const silence = samples.length ? Math.round((samples.filter((value) => value < 18).length / samples.length) * 100) : 100;
    const frequency = frequencySamples.length ? Math.round(frequencySamples.reduce((a, b) => a + b, 0) / frequencySamples.length) : 0;
    const metrics = { activity, silence, frequency };
    setAudioMetrics(metrics);
    const calculated = Math.max(0, Math.min(100, Math.round(metrics.activity * 0.45 + (100 - metrics.silence) * 0.25 + metrics.frequency * 0.3)));
    const reading = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString(),
      ehi: calculated,
      activity,
      silence,
      frequency,
      interpretation: calculated <= 30 ? "Poor activity" : calculated <= 60 ? "Moderate activity" : calculated <= 80 ? "Good biological activity" : "High biological activity"
    };
    const next = [reading, ...ehiReadings].slice(0, 20);
    setEhiReadings(next);
    saveList(keys.ehi, next);
    setRecording(false);
  }

  function saveLayout() {
    const record = { id: crypto.randomUUID(), ...layout, date: today() };
    const next = [record, ...layouts].slice(0, 20);
    setLayouts(next);
    saveList(keys.layouts, next);
  }

  function analyzeSoil() {
    const summary = soilRecommendations(soilInput);
    const record = { id: crypto.randomUUID(), ...soilInput, summary, date: today() };
    const next = [record, ...soilReports].slice(0, 20);
    setSoilReports(next);
    saveList(keys.soils, next);
  }

  function addPost() {
    if (!postForm.text.trim()) return;
    const next = [{ id: crypto.randomUUID(), ...postForm, name: postForm.name || "Farmer", village: postForm.village || "Village", date: today() }, ...posts];
    setPosts(next);
    saveList(keys.posts, next);
    setPostForm({ ...postForm, text: "", photo: "" });
  }

  function deletePost(id: string) {
    const next = posts.filter((post) => post.id !== id);
    setPosts(next);
    saveList(keys.posts, next);
  }

  return (
    <main className="farm-bg min-h-screen text-black">
      <header className="farm-shell sticky top-0 z-20 border-b border-sage-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-sage-800 text-white shadow-field"><Sprout aria-hidden /></div>
            <div>
              <h1 className="text-2xl font-black tracking-normal text-black">JOITA FarmAssist</h1>
              <p className="text-sm font-medium text-sage-900">AI-powered, offline-first farm advisory for Indian farmers</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5">{online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? "Device online" : "Device offline"}</Badge>
            <Badge className="gap-1.5"><span className={`status-dot ${statusDotClass(aiStatus)}`} />{aiStatusLabel(aiStatus)}</Badge>
            <Badge>Haryana/North India KB</Badge>
            <a href="https://joitabioseedai.com" target="_blank" rel="noreferrer">
              <Button variant="secondary"><ExternalLink className="h-4 w-4" /> Main Website</Button>
            </a>
          </div>
        </div>
      </header>

      <section className="farm-shell mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[230px_1fr]">
        <nav className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:block lg:space-y-2" aria-label="FarmAssist modules">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-button flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition lg:w-full lg:justify-start ${
                  active === item.id ? "border-sage-800 bg-sage-800 text-white" : "border-sage-200 bg-white text-black hover:bg-sage-100"
                }`}
                onClick={() => setActive(item.id)}
                title={item.label}
              >
                <Icon className="h-4 w-4" /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="soft-enter space-y-4">{renderPanel()}</div>
      </section>
    </main>
  );

  function renderPanel() {
    if (active === "home") {
      return (
        <>
          <div className="soft-enter grid gap-4 md:grid-cols-4">
            <Metric icon={Activity} label="EHI" value={`${ehi}/100`} />
            <Metric icon={CloudSun} label={geo.label} value={weather.data ? `${weather.data.temperature} C` : "loading"} />
            <Metric icon={NotebookPen} label="Saved records" value={String(storageCounts.reduce((sum, [, count]) => sum + count, 0))} />
            <Metric icon={Leaf} label="Crop guides" value={String(cropGuides.length)} />
          </div>
          <SourceBadges weather={weather.data?.source ?? "Open-Meteo"} market={mandi.data?.source ?? "Offline Cache"} nasa={nasa.data?.source ?? "NASA POWER"} biodiversity={`${gbif.data?.source ?? "GBIF"}/${inat.data?.source ?? "iNaturalist"}`} />
          <Card className="soft-enter-delay-2"><CardHeader><CardTitle>Farm Dashboard</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-3">
            {knowledgeCards.map((card) => <Info key={card.title} label={card.title} value={card.body} />)}
            <Info label="API intelligence" value="AI-assisted, offline-first advisory powered by JOITA crop knowledge, public weather/climate APIs, and optional free AI models." />
          </CardContent></Card>
        </>
      );
    }

    if (active === "ask") {
      const latest = questions[0];
      return (
        <Card className="chat-card overflow-hidden">
          <CardHeader className="chat-hero border-b border-sage-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge className="bg-white text-sage-900"><Sparkles className="h-3.5 w-3.5" /> Farmer advisory desk</Badge>
                <CardTitle className="mt-3 flex items-center gap-2 text-2xl"><Bot className="h-6 w-6" /> Ask FarmAssist</CardTitle>
                <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-sage-900">Ask any crop question. Live AI replies when available, and the JOITA offline knowledge base answers if the backend is busy.</p>
              </div>
              <div className="rounded-md border border-white/70 bg-white/80 p-3 shadow-field">
                <div className="flex items-center gap-2 text-sm font-black"><span className={`status-dot ${statusDotClass(aiStatus)}`} />{aiStatusLabel(aiStatus)}</div>
                <p className="mt-1 text-xs font-bold text-sage-900">{aiStatusDetail || offlineKbMessage}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <select className="min-h-10 w-full rounded-md border border-sage-300 px-3 font-bold" value={chatForm.crop} onChange={(event) => setChatForm({ ...chatForm, crop: event.target.value })}>{cropGuides.map((item) => <option key={item.crop}>{item.crop}</option>)}</select>
              <Input placeholder="Location" value={chatForm.location} onChange={(event) => setChatForm({ ...chatForm, location: event.target.value })} />
              <select className="min-h-10 w-full rounded-md border border-sage-300 px-3 font-bold" value={chatForm.stage} onChange={(event) => setChatForm({ ...chatForm, stage: event.target.value })}>{cropStages.map((item) => <option key={item}>{item}</option>)}</select>
              <select className="min-h-10 w-full rounded-md border border-sage-300 px-3 font-bold" value={chatForm.problemType} onChange={(event) => setChatForm({ ...chatForm, problemType: event.target.value })}>{problemTypes.map((item) => <option key={item}>{item}</option>)}</select>
              <select className="min-h-10 w-full rounded-md border border-sage-300 px-3 font-bold" value={chatForm.language} onChange={(event) => setChatForm({ ...chatForm, language: event.target.value })}>{languages.map((item) => <option key={item}>{item}</option>)}</select>
              <label className="flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-sage-700 bg-sage-100 px-3 py-2 text-sm font-bold text-black hover:bg-sage-200">
                Upload crop photo
                <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => handleChatImageUpload(event.target.files?.[0])} />
              </label>
            </div>
            {chatForm.imageUrl ? <div className="upload-preview flex flex-wrap items-center gap-3 rounded-md border border-sage-200 bg-white p-3"><img className="h-20 w-20 rounded-md object-cover" src={chatForm.imageUrl} alt="Uploaded crop preview" /><div className="min-w-0 flex-1"><p className="truncate font-bold">{chatForm.imageName || "Crop photo attached"}</p><p className="text-sm text-sage-900">Image diagnosis will use the vision model chain.</p></div><Button variant="ghost" onClick={() => setChatForm({ ...chatForm, imageUrl: "", imageName: "" })}>Remove photo</Button></div> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {quickFarmPrompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="quick-prompt rounded-md border border-sage-200 bg-white p-3 text-left shadow-sm transition hover:border-sage-700 hover:bg-sage-50"
                  onClick={() => {
                    setQuestion(item.prompt);
                    setChatForm({ ...chatForm, crop: item.crop, location: item.location, stage: item.stage, problemType: item.problemType });
                    setChatError("");
                  }}
                >
                  <span className="flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4" />{item.label}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-sage-900">{item.prompt}</span>
                </button>
              ))}
            </div>
            <Textarea className="min-h-32 text-base font-semibold leading-7" value={question} maxLength={maxMessageLength} placeholder="Example: Tomato leaves are yellowing and curling. What should I check?" onChange={(event) => setQuestion(event.target.value)} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-sage-800">{question.length}/{maxMessageLength} characters</p>
              <p className="text-xs font-black text-sage-900"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />A reply is always available through live AI or Offline KB.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="ai-submit-button" onClick={askLiveFarmAssist} disabled={chatLoading}>{chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ask Live AI</Button>
              <Button variant="secondary" onClick={ask}><Leaf className="h-4 w-4" /> Answer from Offline KB</Button>
              <Button variant="ghost" onClick={askLiveFarmAssist} disabled={chatLoading || !chatResponse}>Retry</Button>
            </div>
            {aiStatusDetail ? <div className={`farmassist-status-panel rounded-md border p-3 text-sm font-bold leading-6 ${aiStatus === "online" || aiStatus === "backend_connected" ? "border-sage-300 bg-white" : "border-amber-300 bg-amber-50"}`}><div className="flex items-center gap-2"><span className={`status-dot ${statusDotClass(aiStatus)}`} />{aiStatusDetail}</div>{apiBase ? <p className="mt-1 text-xs text-sage-900">API base: {apiBase}</p> : null}</div> : null}
            <div className="rounded-md border border-sage-200 bg-sage-50 p-3 text-sm font-bold leading-6">
              <p>{pilotNotice}</p>
              <p>{privacyNotice}</p>
              <p>{safetyNotice}</p>
            </div>
            {chatLoading ? <div className="typing-card soft-enter rounded-md border border-sage-200 bg-sage-100 p-4 font-bold"><span>FarmAssist AI is checking crop symptoms</span><span className="typing-dots" aria-hidden="true"><i /><i /><i /></span></div> : null}
            {chatError ? <div className="soft-enter rounded-md border border-sage-300 bg-sage-100 p-3 text-sm font-bold">{chatError}</div> : null}
            {chatResponse ? <div className="answer-panel soft-enter rounded-md border border-sage-200 bg-white p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><Badge className={sourceBadgeClass(chatResponse.source)}><CheckCircle2 className="h-3.5 w-3.5" />{sourceBadgeLabel(chatResponse.source)}</Badge>{chatResponse.source === "offline_kb" ? <Badge className="bg-amber-50 text-sage-900">Live AI failed. Offline KB answered instead.</Badge> : <Badge className="bg-sage-100 text-sage-900">Live AI online</Badge>}</div><div className="whitespace-pre-wrap text-base font-semibold leading-7">{chatResponse.answer}</div>{devMode ? <p className="mt-3 text-xs font-bold text-sage-800">Dev model status: {chatResponse.model} · {chatResponse.mode} · {chatResponse.ok ? "ok" : "fallback"} · {chatResponse.source ?? "unknown"}</p> : null}<p className="mt-3 text-sm font-bold text-sage-900">{pilotNotice}</p><p className="mt-2 text-sm font-bold text-sage-900">{privacyNotice}</p><p className="mt-2 text-sm font-bold text-sage-900">{safetyNotice}</p></div> : null}
            {chatResponse ? <div className="soft-enter rounded-md border border-sage-200 bg-sage-50 p-4"><h3 className="font-black">Want expert follow-up? Share WhatsApp/email.</h3><p className="mt-1 text-sm font-semibold text-sage-900">Optional, not required.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><Input placeholder="WhatsApp or email (optional)" value={followUpContact} onChange={(event) => setFollowUpContact(event.target.value)} /><Button variant="secondary" onClick={saveFollowUpRequest}>Save Follow-Up</Button><a href={followUpMailto}><Button>Email JOITA</Button></a></div>{followUpSaved ? <p className="mt-2 text-sm font-bold text-sage-900">{followUpSaved}</p> : null}</div> : null}
            <SourceBadges weather={weather.data?.source ?? "Open-Meteo"} market={mandi.data?.source ?? "Offline Cache"} nasa={nasa.data?.source ?? "NASA POWER"} biodiversity={`${gbif.data?.source ?? "GBIF"}/${inat.data?.source ?? "iNaturalist"}`} />
            <div className="rounded-md bg-sage-100 p-4 text-base font-medium leading-7"><span className="font-black">Offline preview: </span>{latest?.answer ?? answerFarmQuestion(normalizeFarmAssistQuestion(question))}</div>
            <div className="grid gap-2 md:grid-cols-2">{kbMatches.map((match) => <Info key={`${match.source}-${match.mode}`} label={`${match.source} · ${match.mode}`} value={match.text} />)}</div>
            <p className="text-sm font-bold text-sage-900">Safety: verify pesticide and chemical decisions with a local KVK/agronomist before spraying.</p>
          </div>
          <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-md border border-sage-200 bg-sage-50 p-4">
              <h3 className="flex items-center gap-2 font-black"><Bot className="h-4 w-4" />Response promise</h3>
              <div className="mt-3 grid gap-2 text-sm font-bold leading-6">
                <p><CheckCircle2 className="mr-1 inline h-4 w-4" />Gemini is tried first.</p>
                <p><CheckCircle2 className="mr-1 inline h-4 w-4" />OpenRouter is the fallback.</p>
                <p><CheckCircle2 className="mr-1 inline h-4 w-4" />Offline KB answers if live AI is busy.</p>
              </div>
            </div>
            <h3 className="font-black">Past questions</h3>
            {questions.length ? questions.slice(0, 5).map((item) => <div key={item.id} className="rounded-md border border-sage-200 bg-white p-3"><p className="font-bold">{item.question}</p><p className="mt-1 text-sm">{item.date}</p></div>) : <div className="rounded-md border border-sage-200 bg-white p-3 text-sm font-bold">Your recent FarmAssist answers will appear here.</div>}
          </div>
        </CardContent></Card>
      );
    }

    if (active === "diagnose") {
      return (
        <Card><CardHeader><CardTitle>Plant Disease Diagnosis</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            <select className="min-h-10 w-full rounded-md border border-sage-300 px-3 font-bold" value={selectedCrop} onChange={(event) => setSelectedCrop(event.target.value)}>{cropGuides.map((item) => <option key={item.crop}>{item.crop}</option>)}</select>
            <input className="block w-full text-sm" type="file" accept="image/*" capture="environment" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setImageName(file.name);
              setImagePreview(URL.createObjectURL(file));
            }} />
            {imagePreview ? <img className="h-48 w-full rounded-md object-cover" src={imagePreview} alt="Uploaded plant symptom preview" /> : <div className="field-grid flex h-48 items-center justify-center rounded-md border border-sage-200 font-bold">Image preview</div>}
            <div className="grid grid-cols-2 gap-2">{symptoms.map((symptom) => <label key={symptom} className="flex items-center gap-2 rounded-md bg-sage-100 p-2 text-sm font-bold"><input type="checkbox" checked={selectedSymptoms.includes(symptom)} onChange={() => setSelectedSymptoms((current) => current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom])} />{symptom}</label>)}</div>
          </div>
          <div className="rounded-md border border-sage-200 bg-sage-50 p-5">
            <Badge>Symptom-assisted offline advisory</Badge>
            <h3 className="mt-3 text-2xl font-black">{diagnosis.label}</h3>
            <p className="mt-2 font-bold">Confidence: {diagnosis.confidence >= 75 ? "High" : diagnosis.confidence >= 58 ? "Medium" : "Low"}</p>
            <Info label="Immediate action" value={diagnosis.advice} />
            <Info label="Organic option" value="Remove badly affected leaves, improve airflow, use sticky traps or neem-based spray where appropriate, and avoid spraying in strong sun." />
            <Info label="Chemical advisory" value="Placeholder only. Confirm crop, pest/disease, dose, waiting period, PPE, and label approval with local expert before spraying." />
            <SourceBadges weather="Offline JOITA KB" market="Plant ID: Pl@ntNet optional" nasa="Soil: User input" biodiversity="Live Weather optional" />
          </div>
        </CardContent></Card>
      );
    }

    if (active === "sound") {
      return (
        <Card><CardHeader><CardTitle>Bioacoustic Field-Health Monitor</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <Button disabled={recording} onClick={() => startRecording(60)}><Mic className="h-4 w-4" /> Record 60s</Button>
            <Button variant="secondary" disabled={recording} onClick={() => startRecording(10)}>Test 10s</Button>
            <p className="font-bold">{recording ? `Recording ${seconds}s...` : "Signal-based biodiversity proxy, not confirmed species identification."}</p>
            <Info label="Activity" value={`${audioMetrics.activity}/100`} />
            <Info label="Silence ratio" value={`${audioMetrics.silence}%`} />
            <Info label="Frequency activity proxy" value={`${audioMetrics.frequency}/100`} />
          </div>
          <div>
            <div className="text-6xl font-black">{ehi}</div>
            <p className="text-xl font-bold">{interpretation}</p>
            <SourceBadges weather="Offline EHI metrics" market="Biodiversity: GBIF" nasa="iNaturalist" biodiversity="Signal proxy" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Info label="GBIF nearby species" value={`${gbif.data?.records.length ?? 0} cached/live occurrence records within 10 km`} />
              <Info label="iNaturalist observations" value={`${inat.data?.records.length ?? 0} nearby research-grade examples cached/live`} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">{ehiReadings.slice(0, 6).map((item) => <Info key={item.id} label={`${item.date} · EHI ${item.ehi}`} value={`${item.interpretation}; activity ${item.activity}, silence ${item.silence}%, frequency ${item.frequency}`} />)}</div>
          </div>
        </CardContent></Card>
      );
    }

    if (active === "weather") {
      const cached = safeJsonParse<null | WeatherReport>(localStorage.getItem(keys.weather), null);
      const report = weather.data ?? cached;
      return (
        <Card><CardHeader><CardTitle>Weather Advisory</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-4">
          <WeatherTile label="Temperature" value={report ? `${report.temperature} C` : "Loading"} />
          <WeatherTile label="Rain" value={report ? `${report.rain} mm` : "Loading"} />
          <WeatherTile label="Wind" value={report ? `${report.wind} km/h` : "Loading"} />
          <WeatherTile label="Humidity" value={report?.humidity !== undefined ? `${report.humidity}%` : "N/A"} />
          <WeatherTile label="Rain chance" value={report?.rainfallChance !== undefined ? `${report.rainfallChance}%` : "N/A"} />
          <WeatherTile label="Irrigation" value={report ? `${report.irrigationUrgency}/100` : "Loading"} />
          <WeatherTile label="Disease risk" value={report ? `${report.diseaseRisk}/100` : "Loading"} />
          <div className="rounded-md bg-sage-100 p-4 font-medium md:col-span-4">{report?.source ?? "Open-Meteo"}: {report?.note ?? "Fetching live free API data; Haryana seasonal fallback is ready offline."}</div>
          <Info label="Spray/no-spray" value={report?.sprayDecision ?? "Waiting for weather data."} />
          <Info label="Heat stress" value={report?.heatStress ?? "Waiting for weather data."} />
          <Info label="Climate fallback" value={`${nasa.data?.source ?? "NASA POWER"} ${nasa.data?.status ?? "loading"}; climatology ${climatology.data?.status ?? "loading"}.`} />
        </CardContent></Card>
      );
    }

    if (active === "calendar") {
      return (
        <Card><CardHeader><CardTitle>Crop Calendar & Growth Stages</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2"><Input placeholder="Search crop" value={calendarFilter} onChange={(event) => setCalendarFilter(event.target.value)} /><select className="min-h-10 rounded-md border border-sage-300 px-3 font-bold" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>{["All", "Kharif", "Rabi", "Zaid", "Summer"].map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="grid gap-3">{filteredCrops.map((item) => <Info key={item.crop} label={`${item.crop} · ${item.season}`} value={`Sowing: ${item.sowing}. ${item.transplanting ? `Transplanting: ${item.transplanting}. ` : ""}Harvest: ${item.harvest}. Critical stages: ${item.stages.join(" -> ")}. Input windows: ${item.fertilizer}`} />)}</div>
        </CardContent></Card>
      );
    }

    if (active === "visualizer") {
      return (
        <Card><CardHeader><CardTitle>Farm Visualizer</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-md bg-sage-100">
            <div className="plot-3d grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(10, layout.rows)}, 48px)` }}>{Array.from({ length: Math.min(80, layout.rows * 6) }).map((_, index) => <div key={index} className="plot-tile relative h-12 w-12 rounded-sm border border-sage-900/20" style={{ background: index % 9 === 0 ? "#427f9e" : index % 5 === 0 ? "#d99b28" : "#6f944e" }} />)}</div>
          </div>
          <div className="space-y-3">
            <Input type="number" value={layout.length} onChange={(event) => setLayout({ ...layout, length: Number(event.target.value) })} />
            <Input type="number" value={layout.width} onChange={(event) => setLayout({ ...layout, width: Number(event.target.value) })} />
            <Input type="number" value={layout.rows} onChange={(event) => setLayout({ ...layout, rows: Number(event.target.value) })} />
            <select className="min-h-10 w-full rounded-md border border-sage-300 px-3 font-bold" value={layout.crop} onChange={(event) => setLayout({ ...layout, crop: event.target.value })}>{cropGuides.map((item) => <option key={item.crop}>{item.crop}</option>)}</select>
            <Input value={layout.irrigation} onChange={(event) => setLayout({ ...layout, irrigation: event.target.value })} />
            <Textarea value={layout.notes} onChange={(event) => setLayout({ ...layout, notes: event.target.value })} />
            <Button onClick={saveLayout}><Save className="h-4 w-4" /> Save Layout</Button>
          </div>
        </CardContent></Card>
      );
    }

    if (active === "soil") {
      return (
        <Card><CardHeader><CardTitle>Soil Analysis Recommendations</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3 md:grid-cols-3">{(["ph", "ec", "oc", "n", "p", "k", "zn", "fe"] as const).map((field) => <label key={field} className="text-sm font-bold uppercase">{field}<Input type="number" step="0.1" value={soilInput[field]} onChange={(event) => setSoilInput({ ...soilInput, [field]: Number(event.target.value) })} /></label>)}<select className="min-h-10 rounded-md border border-sage-300 px-3 font-bold" value={soilInput.crop} onChange={(event) => setSoilInput({ ...soilInput, crop: event.target.value })}>{cropGuides.map((item) => <option key={item.crop}>{item.crop}</option>)}</select><select className="min-h-10 rounded-md border border-sage-300 px-3 font-bold" value={soilInput.soil} onChange={(event) => setSoilInput({ ...soilInput, soil: event.target.value })}>{soilProfiles.map((item) => <option key={item.type}>{item.type}</option>)}</select><Button onClick={analyzeSoil}>Analyze Soil</Button></div>
          <div className="space-y-3"><Info label="Current recommendation" value={soilRecommendations(soilInput)} />{soilReports.slice(0, 4).map((item) => <Info key={item.id} label={`${item.crop} · ${item.date}`} value={item.summary} />)}</div>
        </CardContent></Card>
      );
    }

    if (active === "market") {
      return (
        <Card><CardHeader><CardTitle>Market Price Tracker</CardTitle></CardHeader><CardContent>
          <div className="grid gap-3 md:grid-cols-5"><Input placeholder="Commodity" value={marketFilter.commodity} onChange={(event) => setMarketFilter({ ...marketFilter, commodity: event.target.value })} /><Input placeholder="State" value={marketFilter.state} onChange={(event) => setMarketFilter({ ...marketFilter, state: event.target.value })} /><Input placeholder="District" value={marketFilter.district} onChange={(event) => setMarketFilter({ ...marketFilter, district: event.target.value })} /><Input placeholder="Market" value={marketFilter.market} onChange={(event) => setMarketFilter({ ...marketFilter, market: event.target.value })} /><Input type="date" value={marketFilter.date} onChange={(event) => setMarketFilter({ ...marketFilter, date: event.target.value })} /></div>
          <SourceBadges weather="Offline JOITA KB" market={mandi.data?.source ?? "Offline Cache"} nasa="Data.gov.in optional key" biodiversity="No secret keys" />
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-left"><thead><tr className="border-b border-sage-200"><th className="p-3">Commodity</th><th className="p-3">Mandi</th><th className="p-3">Price</th><th className="p-3">Trend/Grade</th></tr></thead><tbody>{(mandi.data?.records.length ? mandi.data.records : filteredMarkets).map((item: any, index: number) => <tr key={`${item.commodity}-${index}`} className="border-b border-sage-100"><td className="p-3 font-bold">{item.commodity}</td><td className="p-3">{item.market ?? item.mandi}</td><td className="p-3">Rs {item.modal_price ?? item.price}/{item.unit ?? "quintal"}</td><td className="p-3">{item.grade ?? item.trend ?? "cached"}</td></tr>)}</tbody></table></div>
          <p className="mt-3 text-sm font-bold">Offline/sample/cached price — verify with local mandi before selling.</p>
        </CardContent></Card>
      );
    }

    if (active === "community") {
      return (
        <Card><CardHeader><CardTitle>Farmer Community</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3"><Input placeholder="Name" value={postForm.name} onChange={(event) => setPostForm({ ...postForm, name: event.target.value })} /><Input placeholder="Village" value={postForm.village} onChange={(event) => setPostForm({ ...postForm, village: event.target.value })} /><select className="min-h-10 w-full rounded-md border border-sage-300 px-3 font-bold" value={postForm.crop} onChange={(event) => setPostForm({ ...postForm, crop: event.target.value })}>{cropGuides.map((item) => <option key={item.crop}>{item.crop}</option>)}</select><select className="min-h-10 w-full rounded-md border border-sage-300 px-3 font-bold" value={postForm.issue} onChange={(event) => setPostForm({ ...postForm, issue: event.target.value })}>{issueTypes.map((item) => <option key={item}>{item}</option>)}</select><Textarea placeholder="Post/question" value={postForm.text} onChange={(event) => setPostForm({ ...postForm, text: event.target.value })} /><Input placeholder="Optional photo name or URL" value={postForm.photo} onChange={(event) => setPostForm({ ...postForm, photo: event.target.value })} /><Button onClick={addPost}><MessageSquare className="h-4 w-4" /> Save Local Post</Button></div>
          <div className="space-y-3"><Input placeholder="Search local posts" value={postSearch} onChange={(event) => setPostSearch(event.target.value)} />{filteredPosts.map((post) => <div key={post.id} className="rounded-md border border-sage-200 p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-bold">{post.name} · {post.village}</div><div className="text-sm">{post.crop} · {post.issue} · {post.date}</div></div><Button variant="ghost" onClick={() => deletePost(post.id)} title="Delete post"><Trash2 className="h-4 w-4" /></Button></div><p className="mt-2 leading-6">{post.text}</p>{post.photo ? <p className="mt-2 text-sm font-bold">Photo: {post.photo}</p> : null}</div>)}</div>
        </CardContent></Card>
      );
    }

    if (active === "about") {
      return <Card><CardHeader><CardTitle>About JOITA Bioseed AI</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-lg font-semibold leading-8">JOITA FarmAssist is part of JOITA Bioseed AI's mission to combine AI, nanotechnology, crop science, and farmer-first advisory for climate-resilient agriculture.</p><p className="leading-7">This app is built for practical field use: offline knowledge, local persistence, transparent safety disclaimers, no paid backend requirement, and free API integration where it is reliable.</p><a href="https://joitabioseedai.com" target="_blank" rel="noreferrer"><Button><ExternalLink className="h-4 w-4" /> Visit main website</Button></a></CardContent></Card>;
    }

    return (
      <Card>
        <CardHeader><CardTitle>Settings / Offline Data</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">{storageCounts.map(([label, count]) => <Info key={label} label={label} value={String(count)} />)}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Farm name" value={settings.farmName} onChange={(event) => setSettings({ ...settings, farmName: event.target.value })} />
            <Input placeholder="Village" value={settings.village} onChange={(event) => setSettings({ ...settings, village: event.target.value })} />
            <Input
              placeholder="Temporary Vercel API base URL"
              value={apiBaseOverride}
              onChange={(event) => {
                const value = event.target.value.trim();
                setApiBaseOverride(value);
                if (value) localStorage.setItem(keys.apiBase, value.replace(/\/$/, ""));
                else localStorage.removeItem(keys.apiBase);
              }}
            />
            <Input placeholder="Optional Data.gov.in API key" value={settings.dataGovKey} onChange={(event) => setSettings({ ...settings, dataGovKey: event.target.value })} />
            <Input placeholder="Optional Pl@ntNet API key" value={settings.plantNetKey} onChange={(event) => setSettings({ ...settings, plantNetKey: event.target.value })} />
            <label className="flex items-center gap-2 rounded-md bg-sage-100 p-3 font-bold"><input type="checkbox" checked={settings.enableTransformers} onChange={(event) => { localStorage.setItem("joita-fa-enable-transformers", String(event.target.checked)); setSettings({ ...settings, enableTransformers: event.target.checked }); }} /> Enable Transformers.js semantic search</label>
            <Button onClick={() => {
              localStorage.setItem(keys.settings, JSON.stringify(settings));
              localStorage.setItem("joita-fa-enable-transformers", String(settings.enableTransformers));
              const cleanApiBase = apiBaseOverride.trim().replace(/\/$/, "");
              if (cleanApiBase) localStorage.setItem(keys.apiBase, cleanApiBase);
              else localStorage.removeItem(keys.apiBase);
            }}><Save className="h-4 w-4" /> Save Settings</Button>
          </div>
          <Info label="Live API target" value={apiBase ? `${apiBase}/api/farmassist-chat` : "/api/farmassist-chat on the same domain"} />
          <div className="rounded-md border border-sage-200 bg-sage-50 p-4">
            <h3 className="mb-3 font-black">Admin Debug</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="API health status" value={apiHealth ? `Gemini key: ${apiHealth.hasGeminiKey ? "yes" : "no"}. OpenRouter key: ${apiHealth.hasOpenRouterKey ? "yes" : "no"}. Environment: ${apiHealth.environment ?? "unknown"}. Checked: ${apiHealth.timestamp ?? "unknown"}.` : "No health response yet."} />
              <Info label="Backend URL being called" value={`${apiEndpoint("/api/health")} and ${apiEndpoint("/api/farmassist-chat")}`} />
              <Info label="Last response source" value={sourceBadgeLabel(lastResponseSource)} />
              <Info label="Last failure reason" value={lastFailureReason || "None"} />
              <Info label="Current hostname" value={typeof window !== "undefined" ? window.location.hostname : "unknown"} />
            </div>
          </div>
          <Info label="PWA" value="Service worker caches the /farmassist/ shell. localStorage persists questions, EHI readings, weather cache, soil reports, farm layouts, and community posts." />
          <Info label="Live AI keys" value="Live AI uses Gemini first and OpenRouter fallback through /api/farmassist-chat. GEMINI_API_KEY and OPENROUTER_API_KEY must stay in server environment variables and must never be saved in frontend JavaScript." />
          <Info label="Pilot, privacy, and safety" value={`${pilotNotice} ${privacyNotice} ${safetyNotice}`} />
          <Info label="No fake claims" value="Core app works offline from JOITA KB. Online sources make it smarter; pesticide dose decisions always need local expert verification." />
        </CardContent>
      </Card>
    );
  }
}

function soilRecommendations(input: { ph: number; ec: number; oc: number; n: number; p: number; k: number; zn: number; fe: number; soil: string; crop: string }) {
  const parts = [];
  parts.push(input.ph < 6.2 ? "Soil is acidic; consider lime only after lab confirmation." : input.ph > 8.2 ? "Soil is alkaline; add organic matter and avoid unnecessary sodic irrigation." : "pH is broadly suitable.");
  parts.push(input.ec > 1.5 ? "Salinity risk is elevated; improve drainage and use good-quality irrigation water." : "EC is within a manageable range.");
  parts.push(input.oc < 0.5 ? "Organic carbon is low; add compost, residues, green manure, or charged biochar." : "Organic carbon is acceptable.");
  parts.push(input.n < 280 ? "Nitrogen appears low; split N rather than applying one heavy dose." : "Nitrogen is adequate or high.");
  parts.push(input.p < 15 ? "Phosphorus is low; use basal P and mycorrhiza/compost support." : "Phosphorus is acceptable.");
  parts.push(input.k < 130 ? "Potassium may limit flowering, fruiting, or grain filling." : "Potassium is acceptable.");
  parts.push(input.zn < 0.6 ? "Zinc deficiency risk is present; verify and apply zinc as locally recommended." : "Zinc is acceptable.");
  parts.push(input.fe < 4.5 ? "Iron deficiency risk may appear in sensitive crops." : "Iron is acceptable.");
  parts.push(`For ${input.crop} in ${input.soil}, confirm with a lab soil test before major correction.`);
  return parts.join(" ");
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <Card><CardContent className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-sage-100"><Icon className="h-5 w-5" /></div><div><div className="text-xs font-bold uppercase text-sage-800">{label}</div><div className="text-xl font-black">{value}</div></div></CardContent></Card>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-sage-200 bg-white p-3"><div className="text-xs font-bold uppercase text-sage-800">{label}</div><div className="mt-1 font-semibold leading-6">{value}</div></div>;
}

function WeatherTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-sage-100 p-4"><div className="text-sm font-bold text-sage-900">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>;
}

function SourceBadges({ weather, market, nasa, biodiversity }: { weather: string; market: string; nasa: string; biodiversity: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Offline JOITA KB</Badge>
      <Badge>Live Weather: {weather}</Badge>
      <Badge>Climate: {nasa}</Badge>
      <Badge>Market: {market}</Badge>
      <Badge>Biodiversity: {biodiversity}</Badge>
      <Badge>Plant ID: Pl@ntNet optional</Badge>
      <Badge>Soil: User input / SoilGrids optional</Badge>
    </div>
  );
}
