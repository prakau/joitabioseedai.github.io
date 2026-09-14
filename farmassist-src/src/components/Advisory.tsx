import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Send,
  Trash2,
  Download,
  Mail,
  Search,
  Plus,
  Undo2,
} from "lucide-react";
import { LanguageSelect } from "./LanguageSelect";
import { AdvisoryAnswer } from "./AdvisoryAnswer";
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
} from "./workspace";
import {
  cropPhoto,
  sendQuestion,
  track,
  type ChatContext,
  type ChatResult,
} from "../lib/network";
import { answerFarmQuestion } from "../lib/farm-ai";
import { searchCrops, inferCrop } from "../services/semanticSearch";
import {
  displayDate,
  downloadJson,
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
  onResult,
}: {
  location: string;
  preferredLanguage: string;
  onLanguage: (language: string) => void;
  diagnose?: boolean;
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
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [activeRecord, setActiveRecord] = useState<Record | null>(null);
  const [deletedRecord, setDeletedRecord] = useState<Record | null>(null);
  const [historyLimit, setHistoryLimit] = useState(12);
  const [followingUp, setFollowingUp] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const answerAnchor = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [contact, setContact] = useState("");
  const [kbSearch, setKbSearch] = useState("");
  const [thread, setThread] = useState<{ question: string; answer: string }[]>(
    [],
  );
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
  async function submit(offline = false) {
    if (busy) return;
    if (!question.trim() && !(diagnose && photo)) {
      setError("Describe your question or the symptoms you see.");
      return;
    }
    const message =
      question.trim() ||
      "Describe the visible crop symptoms in this photo. What should I inspect to narrow down the cause?";
    if (message.length > 1000) {
      setError("Keep your question within 1000 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    const actualContext = {
      ...context,
      crop: inferCrop(message, context.crop),
    };
    setContext(actualContext);
    track("FarmAssist question submitted", {
      crop: actualContext.crop,
      location: context.location,
      problemType: context.problemType,
      hasImage: Boolean(photo),
    });
    let response: ChatResult;
    try {
      if (offline || !navigator.onLine)
        throw new Error(offline ? "" : "Your device is offline.");
      response = await sendQuestion(message, actualContext, photo, thread);
      if (
        !response.answer?.trim() ||
        !["gemini", "openrouter", "offline_kb"].includes(response.source)
      )
        throw new Error("The advisory service returned an invalid response.");
      if (response.source === "offline_kb")
        response.answer = answerFarmQuestion(
          message,
          actualContext.crop,
          context.stage,
        );
    } catch (failure) {
      response = {
        ok: true,
        source: "offline_kb",
        model: "joita-crop-guides",
        imageAnalyzed: false,
        answer: answerFarmQuestion(message, actualContext.crop, context.stage),
        failureReason: offline
          ? undefined
          : failure instanceof Error
            ? failure.message
            : "Live advisory is unavailable.",
      };
    }
    if (photo && !response.imageAnalyzed)
      response.answer =
        "**Photo not analyzed.** This result uses only your written symptoms.\n\n" +
        response.answer;
    setResult(response);
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
    };
    setActiveRecord(record);
    saveHistory([record, ...history].slice(0, 50));
    track(
      response.source === "offline_kb"
        ? "AI fallback triggered"
        : "AI response received",
      { crop: actualContext.crop, model: response.model },
    );
    setBusy(false);
  }
  const matchingHistory = history.filter((item) =>
    `${item.question} ${item.answer}`
      .toLowerCase()
      .includes(historyFilter.toLowerCase()),
  );
  async function upload(file?: File) {
    if (!file) return;
    setImageBusy(true);
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
  return (
    <>
      <Title
        title={diagnose ? "Crop photo & symptom check" : "Ask FarmAssist"}
        description={
          diagnose
            ? "Add a clear crop photo and describe what changed in the field."
            : "Practical advice for your crop, stage, and location."
        }
        action={
          <Button
            variant="secondary"
            disabled={busy || imageBusy}
            onClick={newQuestion}
          >
            <Plus size={18} />
            New question
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
                <LanguageSelect
                  value={context.language}
                  onChange={(language) => {
                    setContext({ ...context, language });
                    onLanguage(language);
                  }}
                />
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
              {followingUp && activeRecord && (
                <div className="conversation-context">
                  <small>FOLLOW-UP TO</small>
                  <p>{activeRecord.question}</p>
                </div>
              )}
              {!diagnose && (
                <div className="suggestions">
                  {prompts.map((prompt) => (
                    <button
                      type="button"
                      key={prompt}
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
              <Field
                label={
                  diagnose ? "Symptoms and field observations" : "Your question"
                }
              >
                <Textarea
                  dir="auto"
                  value={question}
                  maxLength={1000}
                  placeholder="Tell us what you see, when it started, and how much of the field is affected."
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </Field>
              <div className="form-meta">
                <span>{question.length}/1000 characters</span>
                <span>Photos: JPEG, PNG, WebP, up to 4 MB</span>
              </div>
              <Field label="Crop photo (optional)">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={imageBusy || busy}
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </Field>
              {imageBusy && <Busy label="Preparing photo" />}
              {photo && (
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
              <div className="actions">
                <Button disabled={busy || imageBusy} type="submit">
                  {diagnose ? <Camera size={18} /> : <Send size={18} />}
                  {diagnose ? "Analyze crop" : "Ask FarmAssist"}
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
            </fieldset>
          </form>
          {error && <Notice error>{error}</Notice>}
          {busy && (
            <Busy
              label={
                photo
                  ? "Reviewing the crop photo and your question..."
                  : "Preparing your advisory..."
              }
            />
          )}
          {result && activeRecord && (
            <>
              <div ref={answerAnchor} className="answer-anchor">
                <AdvisoryAnswer
                  key={activeRecord.id}
                  result={result}
                  question={activeRecord.question}
                  language={activeRecord.context?.language || "English"}
                  date={activeRecord.date}
                  disabled={busy || imageBusy}
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
                  href={`mailto:contact@joitabioseedai.com?subject=FarmAssist%20expert%20follow-up&body=${encodeURIComponent(body)}`}
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
                    });
                  }}
                >
                  <strong>{item.question}</strong>
                  <small>
                    {displayDate(item.date)} /{" "}
                    {item.source || "saved source not recorded"}
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
