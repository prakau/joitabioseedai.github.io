import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  MessageSquare,
  Share2,
  Square,
  Volume2,
  Lightbulb,
  LoaderCircle,
} from "lucide-react";
import { answerLanguage, matchingVoice, speechChunks } from "../lib/languages";
import { downloadText, displayDate } from "../lib/storage";
import { requestSpeech, type ChatResult } from "../lib/network";
import { Answer, safetyNotice } from "./workspace";
import { Button } from "./ui/button";
import { AdvisoryTask } from "./FieldTasks";
import { copyText, shareText } from "../lib/platform";

export function AdvisoryAnswer({
  result,
  language,
  question,
  date,
  crop,
  onFollowUp,
  onSimplify,
  disabled,
  cloudSpeech = false,
}: {
  result: ChatResult;
  language: string;
  question: string;
  date: string;
  crop: string;
  onFollowUp: () => void;
  onSimplify: () => void;
  disabled: boolean;
  cloudSpeech?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const cloudRequest = useRef<AbortController | null>(null);
  const playback = useRef(0);
  const [speaking, setSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioParts, setAudioParts] = useState<string[]>([]);
  const [audioIndex, setAudioIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const actualLanguage = answerLanguage(
    result.source === "offline_kb" ? "English" : language,
  );
  const voice = matchingVoice(voices, actualLanguage.speech, !navigator.onLine);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const refresh = () => setVoices(synth.getVoices());
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => {
      synth.removeEventListener("voiceschanged", refresh);
      if (speech.current) synth.cancel();
    };
  }, []);

  useEffect(() => () => {
    playback.current += 1;
    cloudRequest.current?.abort();
  }, []);

  useEffect(() => {
    const player = audio.current;
    if (!player || !audioParts.length) return;
    const session = playback.current;
    void player.play().catch(() => {
      if (session === playback.current)
        setFeedback("Google audio is ready. Press play in the audio controls.");
    });
    return () => player.pause();
  }, [audioParts, audioIndex]);

  function stop() {
    playback.current += 1;
    cloudRequest.current?.abort();
    cloudRequest.current = null;
    audio.current?.pause();
    setAudioParts([]);
    setLoadingAudio(false);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    speech.current = null;
    setSpeaking(false);
  }
  function plainAnswer() {
    return (
      root.current?.querySelector<HTMLElement>(".answer-copy")?.innerText ||
      result.answer
    );
  }
  function answerDocument() {
    return `JOITA FarmAssist\n${displayDate(date)}\nSource: ${result.source}\nAnswer language: ${actualLanguage.name}\n\nQuestion: ${question}\n\n${plainAnswer()}\n\n${safetyNotice}\nhttps://www.joitabioseedai.com/farmassist/`;
  }
  async function copy() {
    try {
      await copyText(answerDocument());
      setFeedback("Answer copied.");
    } catch {
      setFeedback(
        "Clipboard access is unavailable. Download the answer instead.",
      );
    }
  }
  async function share() {
    try {
      if (!await shareText("JOITA FarmAssist advisory", answerDocument())) { await copy(); return; }
      setFeedback("Share request completed.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFeedback(
        "Sharing is unavailable. Copy or download the answer instead.",
      );
    }
  }
  function readOnDevice(prefix = "") {
    stop();
    if (!voice || !("SpeechSynthesisUtterance" in window)) {
      setFeedback(
        `${prefix}No ${actualLanguage.name} voice is available on this device. The written answer is still available.`,
      );
      return;
    }
    const session = playback.current;
    const chunks = speechChunks(plainAnswer());
    setSpeaking(true);
    setFeedback(
      prefix + (actualLanguage.name === "Haryanvi"
        ? "Reading with the device's Hindi voice."
        : `Reading in ${actualLanguage.name} with a device voice.`),
    );
    function next(index: number) {
      if (session !== playback.current) return;
      if (index >= chunks.length) {
        speech.current = null;
        setSpeaking(false);
        setFeedback("Finished reading.");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = voice!.lang;
      utterance.voice = voice!;
      utterance.rate = 0.95;
      utterance.onend = () => next(index + 1);
      utterance.onerror = () => {
        if (session !== playback.current) return;
        stop();
        setFeedback(
          "Audio playback failed. Try again or read the written answer.",
        );
      };
      speech.current = utterance;
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        stop();
        setFeedback("Audio playback is unavailable on this device.");
      }
    }
    next(0);
  }

  async function readAloud() {
    if (speaking) {
      stop();
      setFeedback("Reading stopped.");
      return;
    }
    if (!cloudSpeech || !navigator.onLine) {
      readOnDevice();
      return;
    }
    stop();
    const session = playback.current;
    const controller = new AbortController();
    cloudRequest.current = controller;
    setSpeaking(true);
    setLoadingAudio(true);
    setFeedback("Creating Google speech audio...");
    try {
      const parts = await requestSpeech(plainAnswer(), actualLanguage.name, controller.signal);
      if (session !== playback.current) return;
      setLoadingAudio(false);
      setAudioIndex(0);
      setAudioParts(parts);
      setFeedback(actualLanguage.name === "Haryanvi"
        ? "Google speech: Hindi voice for the Haryanvi answer."
        : `Google speech: ${actualLanguage.name}.`);
    } catch (error) {
      if (session !== playback.current) return;
      readOnDevice(`${error instanceof Error && error.name !== "AbortError" ? error.message : "Google speech timed out."} `);
    }
  }

  return (
    <section className="answer-panel" ref={root} aria-label="FarmAssist answer">
      <div className="answer-meta">
        <strong>{actualLanguage.native}</strong>
        <span>
          {displayDate(date)}
          {result.source !== "offline_kb" && result.responseTimeMs
            ? ` / ${(result.responseTimeMs / 1000).toFixed(1)}s`
            : ""}
        </span>
      </div>
      {result.source === "offline_kb" && language !== "English" && (
        <p className="language-notice">
          Offline crop guides are in English. {language} answers require live
          AI.
        </p>
      )}
      <Answer
        result={result}
        language={actualLanguage.locale}
        rtl={actualLanguage.name === "Urdu"}
      />
      <div className="answer-actions">
        <div className="answer-tools" role="group" aria-label="Answer tools">
          <button
            className="icon-action"
            title="Copy answer"
            aria-label="Copy answer"
            onClick={() => void copy()}
          >
            <Copy size={20} />
          </button>
          <button
            className="icon-action"
            title="Download answer"
            aria-label="Download answer"
            onClick={() => {
              downloadText("farmassist-advisory.txt", answerDocument());
              setFeedback("Answer downloaded.");
            }}
          >
            <Download size={20} />
          </button>
          <button
            className="icon-action"
            title="Share answer"
            aria-label="Share answer"
            onClick={() => void share()}
          >
            <Share2 size={20} />
          </button>
          <button
            className={`icon-action ${speaking ? "is-speaking" : ""}`}
            title={speaking ? "Stop reading" : "Read answer aloud"}
            aria-label={speaking ? "Stop reading" : "Read answer aloud"}
            aria-pressed={speaking}
            onClick={() => void readAloud()}
          >
            {loadingAudio ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" /> : speaking ? <Square size={18} /> : <Volume2 size={21} />}
          </button>
        </div>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            stop();
            onSimplify();
          }}
        >
          <Lightbulb size={17} />
          Explain simply
        </Button>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            stop();
            onFollowUp();
          }}
        >
          <MessageSquare size={17} />
          Ask a follow-up
        </Button>
      </div>
      {!!audioParts.length && (
        <div className="cloud-audio">
          <audio
            ref={audio}
            controls
            preload="metadata"
            aria-label={`Google speech in ${actualLanguage.name}`}
            src={`data:audio/mpeg;base64,${audioParts[audioIndex]}`}
            onEnded={() => {
              if (audioIndex + 1 < audioParts.length) setAudioIndex(audioIndex + 1);
              else {
                stop();
                setFeedback("Finished reading with Google speech.");
              }
            }}
            onError={() => readOnDevice("Google audio could not play. ")}
          />
          <span>Google speech{audioParts.length > 1 ? ` / part ${audioIndex + 1} of ${audioParts.length}` : ""}</span>
        </div>
      )}
      <p className="answer-feedback" role="status">
        {feedback ||
          (cloudSpeech && navigator.onLine
            ? "Read-aloud sends this answer to Google for speech."
            : !voice
            ? `Read-aloud voice for ${actualLanguage.name} is not available on this device.`
            : "")}
      </p>
      <AdvisoryTask crop={crop} />
    </section>
  );
}
