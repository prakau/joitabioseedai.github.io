import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Camera,
  Send,
  Trash2,
  Download,
  Mail,
  Search,
  Plus,
  Undo2,
  Languages,
  Square,
} from "lucide-react";
import {
  advisoryLanguageHelp,
  answerLanguage,
  resolveAnswerLanguage,
} from "../lib/languages";
import { LanguageSelect } from "./LanguageSelect";
import { AdvisoryAnswer } from "./AdvisoryAnswer";
import { CropPhotoInput } from "./CropPhotoInput";
import { offlineAdvice } from "../lib/offline-hindi";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import {
  Busy,
  CropSelect,
  Empty,
  Field,
  Notice,
  Select,
  Title,
  privacyNotice,
  sourceLabel,
} from "./workspace";
import {
  cropPhoto,
  sendQuestion,
  track,
  type ChatContext,
  type ChatResult,
} from "../lib/network";
import { searchCrops, inferCrop } from "../services/semanticSearch";
import {
  displayDate,
  downloadJson,
  readStored,
  timestamp,
  uid,
  useStored,
} from "../lib/storage";
type Record = {
  id: string;
  question: string;
  answer: string;
  date: string;
  source?: ChatResult["source"];
  context?: ChatContext;
  imageAnalyzed?: boolean;
  answerLanguage?: string;
};
const prompts = [
  "Tomato leaves are yellowing and curling. What should I check?",
  "Mustard flowering in Haryana. What should I check?",
  "How do I plan wheat irrigation at grain filling?",
];
export function Advisory({
  location,
  preferredLanguage,
  onLanguage,
  diagnose = false,
  cloudSpeech = false,
  initialQuestion = "",
  autoSubmitId,
  onAutoSubmitConsumed,
  onResult,
}: {
  location: string;
  preferredLanguage: string;
  onLanguage: (language: string) => void;
  diagnose?: boolean;
  cloudSpeech?: boolean;
  initialQuestion?: string;
  autoSubmitId?: string;
  onAutoSubmitConsumed?: () => void;
  onResult: (result: ChatResult) => void;
}) {
  const [history, saveHistory] = useStored<Record[]>("joita-fa-questions", []);
  const [context, setContext] = useState<ChatContext>({
    crop: "",
    location,
    stage: "not sure",
    language: preferredLanguage,
    problemType: diagnose ? "disease" : "general",
  });
  const [question, setQuestion] = useState(initialQuestion);
  const [result, setResult] = useState<ChatResult | null>(null);
  const [activeRecord, setActiveRecord] = useState<Record | null>(null);
  const [deletedRecord, setDeletedRecord] = useState<Record | null>(null);
  const [historyLimit, setHistoryLimit] = useState(12);
  const [followingUp, setFollowingUp] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const answerAnchor = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [partialAnswer, setPartialAnswer] = useState("");
  const [progress, setProgress] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [requestLanguage, setRequestLanguage] = useState("English");
  const request = useRef<AbortController | null>(null);
  const streamAnchor = useRef<HTMLElement>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [contact, setContact] = useState("");
  const [kbSearch, setKbSearch] = useState("");
  const [thread, setThread] = useState<{ question: string; answer: string }[]>(
    [],
  );
  useEffect(() => () => request.current?.abort(), []);
  const consumedSubmission = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!autoSubmitId || consumedSubmission.current === autoSubmitId) return;
    // Defer until StrictMode's mount/cleanup probe has completed.
    const timer = window.setTimeout(() => {
      consumedSubmission.current = autoSubmitId;
      void submit();
      onAutoSubmitConsumed?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [autoSubmitId]);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    setElapsed(0);
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    streamAnchor.current?.scrollIntoView({
      block: "nearest",
      behavior: "instant",
    });
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    if (!result) return;
    const frame = requestAnimationFrame(() =>
      answerAnchor.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [result]);
  function focusQuestion() {
    const input = form.current?.querySelector("textarea");
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ block: "center", behavior: "instant" });
  }
  function newQuestion() {
    setQuestion("");
    setResult(null);
    setActiveRecord(null);
    setThread([]);
    setPhoto("");
    setContact("");
    setError("");
    setFollowingUp(false);
    setContext({
      crop: "",
      location,
      stage: "not sure",
      language: preferredLanguage,
      problemType: diagnose ? "disease" : "general",
    });
    if (form.current) form.current.reset();
    focusQuestion();
  }
  async function submit(offline = false, followUp?: string) {
    if (busy) return;
    if (!question.trim() && !followUp && !photo) {
      setError("Describe your question or the symptoms you see.");
      return;
    }
    const message =
      followUp ||
      question.trim() ||
      "Describe the visible crop symptoms in this photo. What should I inspect to narrow down the cause?";
    if (message.length > 1000) {
      setError("Keep your question within 1000 characters.");
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    setPartialAnswer("");
    setProgress("Connecting to live advisory...");
    setError("");
    setResult(null);
    const actualContext = {
      ...context,
      crop: inferCrop(message, context.crop),
      language: resolveAnswerLanguage(
        context.language,
        message,
        activeRecord?.context?.language,
      ),
    };
    setContext({ ...context, crop: actualContext.crop });
    setRequestLanguage(actualContext.language);
    if (followUp) {
      setQuestion(followUp);
      setPhoto("");
    }
    track("JOITAFA question submitted", {
      crop: actualContext.crop,
      location: context.location,
      problemType: context.problemType,
      hasImage: Boolean(photo),
    });
    let response: ChatResult;
    try {
      if (offline || !navigator.onLine)
        throw new Error(offline ? "" : "Your device is offline.");
      response = await sendQuestion(
        message,
        actualContext,
        followUp ? "" : photo,
        thread,
        (event) => {
          if (controller.signal.aborted) return;
          if (event.type === "delta") {
            setPartialAnswer((previous) => previous + event.text);
            setProgress("Receiving live answer...");
          } else {
            if (event.type === "reset") setPartialAnswer("");
            setProgress(event.message);
          }
        },
        controller.signal,
      );
      if (
        !response.answer?.trim() ||
        !["gemini", "openrouter", "offline_kb", "joita_rules"].includes(response.source)
      )
        throw new Error("The advisory service returned an invalid response.");
      if (response.source === "offline_kb") Object.assign(response, offlineAdvice(message, actualContext.crop, context.stage, actualContext.language));
    } catch (failure) {
      if (controller.signal.aborted) {
        setPartialAnswer("");
        setError("Request stopped. No unfinished answer was saved.");
        setBusy(false);
        return;
      }
      response = {
        ok: true,
        source: "offline_kb",
        model: "joita-crop-guides",
        imageAnalyzed: false,
        ...offlineAdvice(message, actualContext.crop, context.stage, actualContext.language),
        failureReason: offline
          ? undefined
          : failure instanceof Error
            ? failure.message
            : "Live advisory is unavailable.",
      };
    }
    if (photo && !followUp && !response.imageAnalyzed)
      response.answer =
        (response.language === "Hindi" ? "**फोटो की जांच नहीं हुई।** यह केवल लिखे गए लक्षणों पर आधारित सलाह है।\n\n" : "**Photo not analyzed.** This result uses only your written symptoms.\n\n") +
        response.answer;
    setResult(response);
    setPartialAnswer("");
    onResult(response);
    setFollowingUp(false);
    setThread((previous) =>
      [...previous, { question: message, answer: response.answer }].slice(-3),
    );
    const record: Record = {
      id: uid(),
      question: message,
      answer: response.answer,
      date: timestamp(),
      source: response.source,
      context: actualContext,
      imageAnalyzed: response.imageAnalyzed,
      answerLanguage: response.language || actualContext.language,
    };
    setActiveRecord(record);
    saveHistory(
      [record, ...readStored<Record[]>("joita-fa-questions", history)].slice(
        0,
        50,
      ),
    );
    track(
      response.source === "offline_kb"
        ? "AI fallback triggered"
        : "AI response received",
      { crop: actualContext.crop, model: response.model },
    );
    setBusy(false);
    request.current = null;
  }
  const matchingHistory = history.filter((item) =>
    `${item.question} ${item.answer}`
      .toLowerCase()
      .includes(historyFilter.toLowerCase()),
  );
  async function upload(file?: File) {
    if (!file) return;
    setImageBusy(true);
    setPhoto("");
    setError("");
    try {
      setPhoto(await cropPhoto(file));
      track("Image uploaded", { crop: context.crop });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo could not be opened.");
    } finally {
      setImageBusy(false);
    }
  }
  const body = `Expert follow-up request\nContact: ${contact}\nCrop: ${context.crop}\nLocation: ${context.location}\nQuestion: ${question}`;
  const resolvedLanguage = resolveAnswerLanguage(
    context.language,
    question,
    activeRecord?.context?.language,
  );
  const native = answerLanguage(resolvedLanguage);
  const languageHelp = advisoryLanguageHelp(resolvedLanguage);
  const chooseLanguage = (language: string) => {
    setContext({ ...context, language });
    onLanguage(language);
  };
  return (
    <>
      <Title
        title={diagnose ? "Crop photo & symptom check" : "Ask JOITAFA"}
        description={
          diagnose
            ? "Add a clear crop photo and describe what changed in the field."
            : "Practical advice for your crop, stage, and location."
        }
        action={
          <Button
            className="new-question"
            aria-label="New question"
            title="New question"
            variant="secondary"
            disabled={busy || imageBusy}
            onClick={newQuestion}
          >
            <Plus size={18} />
            <span>New question</span>
          </Button>
        }
      />
      <div className="advisory-layout">
        <div>
          <form
            ref={form}
            aria-busy={busy}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="advisory-form"
          >
            <fieldset disabled={busy || imageBusy}>
              <div className="advisory-language-bar">
                <LanguageSelect
                  value={context.language}
                  onChange={chooseLanguage}
                />
                <div
                  className="language-shortcuts"
                  role="group"
                  aria-label="Language shortcuts"
                >
                  {[
                    ["Auto", "Auto"],
                    ["Hindi", "हिन्दी"],
                    ["Punjabi", "ਪੰਜਾਬੀ"],
                    ["English", "English"],
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={context.language === value}
                      onClick={() => chooseLanguage(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="native-question-heading"
                lang={native.locale}
                dir={resolvedLanguage === "Urdu" ? "rtl" : "ltr"}
              >
                <Languages size={21} />
                <strong>{languageHelp.heading}</strong>
              </div>
              {diagnose && <CropPhotoInput upload={upload} disabled={busy || imageBusy} onError={setError} />}
              {diagnose && imageBusy && <Busy label="Preparing photo / फोटो तैयार हो रही है" />}
              {diagnose && photo && <div className="photo-preview"><img src={photo} alt="Crop photo to be analyzed" /><Button type="button" variant="ghost" onClick={() => setPhoto("")}><Trash2 size={17}/>Remove photo / फोटो हटाएं</Button></div>}
              {followingUp && activeRecord && (
                <div className="conversation-context">
                  <small>FOLLOW-UP TO</small>
                  <p dir="auto">{activeRecord.question}</p>
                </div>
              )}
              <Field
                label={
                  diagnose ? "Symptoms and field observations" : "Your question"
                }
              >
                <Textarea
                  dir="auto"
                  value={question}
                  maxLength={1000}
                  placeholder={languageHelp.example}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </Field>
              <div className="form-meta">
                <span>{question.length}/1000 characters</span>
                <span className="answer-language-preview">
                  Answer: {native.native}
                  {context.language === "Auto" ? " (automatic)" : ""}
                </span>
              </div>
              {!diagnose && (
                <div className="suggestions">
                  {(resolvedLanguage === "English"
                    ? prompts
                    : [languageHelp.example]
                  ).map((prompt) => (
                    <button
                      type="button"
                      key={prompt}
                      dir="auto"
                      onClick={() => {
                        setQuestion(prompt);
                        setContext({ ...context, crop: inferCrop(prompt) });
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <div className="actions question-actions">
                <Button disabled={busy || imageBusy} type="submit">
                  {diagnose ? <Camera size={18} /> : <Send size={18} />}
                  {diagnose ? "Analyze crop" : "Ask JOITAFA"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void submit(true)}
                >
                  Use offline knowledge
                </Button>
              </div>
              <p className="muted">{privacyNotice}</p>
              <details className="field-context" open={diagnose || undefined}>
                <summary>
                  Crop, location &amp; photo{" "}
                  <span>
                    {context.crop || "Optional crop details"} /{" "}
                    {context.location || "Location not set"}
                  </span>
                </summary>
                <div className="fields fields-3">
                  <CropSelect
                    value={context.crop}
                    onChange={(crop) => setContext({ ...context, crop })}
                  />
                  <Field label="District / state">
                    <Input
                      value={context.location}
                      maxLength={120}
                      onChange={(e) =>
                        setContext({ ...context, location: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Growth stage">
                    <Select
                      value={context.stage}
                      onChange={(e) =>
                        setContext({ ...context, stage: e.target.value })
                      }
                    >
                      {[
                        "not sure",
                        "sowing",
                        "seedling",
                        "vegetative",
                        "flowering",
                        "fruiting",
                        "grain filling",
                        "harvest",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="fields fields-2">
                  <Field label="Topic">
                    <Select
                      value={context.problemType}
                      onChange={(e) =>
                        setContext({ ...context, problemType: e.target.value })
                      }
                    >
                      {[
                        "general",
                        "disease",
                        "pest",
                        "nutrition",
                        "irrigation",
                        "planting",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                {!diagnose && <CropPhotoInput upload={upload} disabled={busy || imageBusy} onError={setError} />}
                {!diagnose && imageBusy && <Busy label="Preparing photo / फोटो तैयार हो रही है" />}
                {!diagnose && photo && (
                  <div className="photo-preview">
                    <img src={photo} alt="Crop photo to be analyzed" />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setPhoto("")}
                    >
                      <Trash2 size={17} />
                      Remove photo
                    </Button>
                  </div>
                )}
              </details>
            </fieldset>
          </form>
          {error && <Notice error>{error}</Notice>}
          {busy && (
            <section
              className="streaming-answer"
              ref={streamAnchor}
              aria-label="Live answer in progress"
              aria-busy="true"
            >
              <div className="streaming-toolbar">
                <Busy label={`${progress} ${elapsed}s`} />
                <Button
                  variant="secondary"
                  onClick={() => request.current?.abort()}
                >
                  <Square size={16} />
                  Stop
                </Button>
              </div>
              <p className="streaming-caution">
                Answer in progress. Wait for the complete guidance before
                acting.
              </p>
              {partialAnswer && (
                <div
                  className="answer-copy streaming-copy"
                  lang={answerLanguage(requestLanguage).locale}
                  dir={requestLanguage === "Urdu" ? "rtl" : "ltr"}
                >
                  <ReactMarkdown>{partialAnswer}</ReactMarkdown>
                </div>
              )}
            </section>
          )}
          {result && activeRecord && (
            <>
              <div ref={answerAnchor} className="answer-anchor">
                <AdvisoryAnswer
                  key={activeRecord.id}
                  result={result}
                  question={activeRecord.question}
                  crop={activeRecord.context?.crop || ""}
                  language={activeRecord.context?.language || "English"}
                  date={activeRecord.date}
                  disabled={busy || imageBusy}
                  cloudSpeech={cloudSpeech}
                  onSimplify={() =>
                    void submit(
                      false,
                      advisoryLanguageHelp(
                        activeRecord.context?.language || "English",
                      ).simplify,
                    )
                  }
                  onFollowUp={() => {
                    setQuestion("");
                    setPhoto("");
                    setError("");
                    setFollowingUp(true);
                    const fileInput =
                      form.current?.querySelector<HTMLInputElement>(
                        'input[type="file"]',
                      );
                    if (fileInput) fileInput.value = "";
                    focusQuestion();
                  }}
                />
              </div>
              <div className="follow-up">
                <h3>Want expert follow-up?</h3>
                <p>
                  Share your WhatsApp or email with JOITA. This is optional.
                </p>
                <Field label="WhatsApp / email">
                  <Input
                    value={contact}
                    maxLength={120}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </Field>
                <a
                  className="text-link"
                  href={`mailto:contact@joitabioseedai.com?subject=JOITAFA%20expert%20follow-up&body=${encodeURIComponent(body)}`}
                >
                  <Mail size={17} />
                  Compose email to JOITA
                </a>
                <small>
                  Opens your email app. The request is sent only when you send
                  that email.
                </small>
              </div>
            </>
          )}
        </div>
        <aside className="history">
          <h3>Saved questions</h3>
          <Field label="Search saved questions">
            <Input
              type="search"
              value={historyFilter}
              onChange={(e) => {
                setHistoryFilter(e.target.value);
                setHistoryLimit(12);
              }}
            />
          </Field>
          {!history.length && (
            <Empty>
              Your questions and answers will be saved on this device.
            </Empty>
          )}
          {!!history.length && !matchingHistory.length && (
            <Empty>No saved answers match this search.</Empty>
          )}
          {deletedRecord && (
            <div className="history-feedback" role="status">
              Answer removed from saved questions.
              <button
                className="text-link"
                disabled={busy || imageBusy}
                onClick={() => {
                  saveHistory([deletedRecord, ...history].slice(0, 50));
                  setDeletedRecord(null);
                }}
              >
                <Undo2 size={17} />
                Undo
              </button>
            </div>
          )}
          <div
            className="history-list"
            tabIndex={matchingHistory.length ? 0 : undefined}
            role="region"
            aria-label="Saved answers list"
          >
            {matchingHistory.slice(0, historyLimit).map((item) => (
              <div className="history-row" key={item.id}>
                <button
                  className="history-item"
                  disabled={busy || imageBusy}
                  onClick={() => {
                    setQuestion(item.question);
                    setPhoto("");
                    setContact("");
                    setError("");
                    setFollowingUp(false);
                    setActiveRecord(item);
                    setThread([
                      { question: item.question, answer: item.answer },
                    ]);
                    if (item.context)
                      setContext({
                        ...item.context,
                        language: preferredLanguage,
                      });
                    setResult({
                      ok: true,
                      source: item.source || "offline_kb",
                      model: "saved-record",
                      answer: item.answer,
                      imageAnalyzed: item.imageAnalyzed,
                      language: item.answerLanguage || (item.source === "offline_kb" ? "English" : item.context?.language),
                    });
                  }}
                >
                  <strong>{item.question}</strong>
                  <small>
                    {displayDate(item.date)} /{" "}
                    {item.source ? sourceLabel(item.source) : "Saved advisory"}
                  </small>
                </button>
                <button
                  className="icon-action history-delete"
                  title="Delete saved answer"
                  aria-label={`Delete saved answer: ${item.question}`}
                  disabled={busy || imageBusy}
                  onClick={() => {
                    saveHistory(
                      history.filter((record) => record.id !== item.id),
                    );
                    setDeletedRecord(item);
                    if (activeRecord?.id === item.id) newQuestion();
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            {matchingHistory.length > historyLimit && (
              <Button
                variant="ghost"
                onClick={() => setHistoryLimit(historyLimit + 12)}
              >
                Show more saved answers
              </Button>
            )}
          </div>
          {!!history.length && (
            <Button
              variant="ghost"
              onClick={() => downloadJson("farmassist-questions.json", history)}
            >
              <Download size={17} />
              Export answers
            </Button>
          )}
        </aside>
      </div>
      {!diagnose && (
        <section className="knowledge-search">
          <h3>
            <Search size={20} />
            Search crop knowledge
          </h3>
          <Field label="Search crop or topic">
            <Input
              type="search"
              value={kbSearch}
              onChange={(e) => setKbSearch(e.target.value)}
              placeholder="Try sarson, tomato, irrigation, or aphid"
            />
          </Field>
          {kbSearch &&
            (searchCrops(kbSearch).length ? (
              searchCrops(kbSearch)
                .slice(0, 4)
                .map((guide) => (
                  <details key={guide.crop}>
                    <summary>{guide.crop}</summary>
                    <p>{guide.water}</p>
                    <p>{guide.fertilizer}</p>
                    <p>{guide.stress}</p>
                  </details>
                ))
            ) : (
              <Empty>
                No matching crop guide. Try a crop name or ask live AI.
              </Empty>
            ))}
        </section>
      )}
    </>
  );
}
