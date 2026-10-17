import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { transcribeVoice } from "../lib/voice";
import { useInterface } from "../lib/interface";

export function VoiceQuestion({ language, value, onChange, available, disabled = false, onBusyChange }: {
  language: string; value: string; onChange: (text: string) => void; available: boolean; disabled?: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const { language: ui } = useInterface();
  const hi = ui === "hi" || language === "Hindi" || language === "Haryanvi";
  const l = (en: string, hindi: string) => hi ? hindi : en;
  const [mode, setMode] = useState<"idle" | "permission" | "recording" | "transcribing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const request = useRef<AbortController | null>(null);
  const session = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const busy = mode !== "idle";
  function release() {
    session.current++;
    if (timer.current) clearInterval(timer.current);
    if (recorder.current) {
      recorder.current.onstop = null;
      if (recorder.current.state !== "inactive") recorder.current.stop();
    }
    stream.current?.getTracks().forEach(track => track.stop());
    request.current?.abort();
  }
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { release(); }, []);
  async function convert(blob: Blob, token: number) {
    setMode("transcribing");
    const controller = new AbortController(); request.current = controller;
    try {
      const text = await transcribeVoice(blob, language, controller.signal);
      if (token !== session.current) return;
      const combined = [value.trim(), text.trim()].filter(Boolean).join(" ");
      if (combined.length > 1000) throw new Error(l("The question is full. Shorten it before recording again.", "सवाल लंबा है। फिर रिकॉर्ड करने से पहले छोटा करें।"));
      onChange(combined);
      setMessage(l("Voice added. Check the words, then ask JOITAFA.", "आवाज़ से सवाल लिखा गया। शब्द जांचें, फिर JOITAFA से पूछें।"));
    } catch (e) {
      if (token === session.current && (e as Error).name !== "AbortError") setError((e as Error).message);
    } finally { if (token === session.current) setMode("idle"); }
  }
  async function start() {
    setError(""); setMessage("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(l("Recording is unavailable here. Upload a voice note or use your keyboard microphone.", "यहां रिकॉर्डिंग उपलब्ध नहीं है। आवाज़ की फाइल चुनें या कीबोर्ड का माइक उपयोग करें।")); return;
    }
    const token = ++session.current;
    setMode("permission");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== session.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(media, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 48000 });
      recorder.current = capture;
      const chunks: Blob[] = [];
      const started = Date.now();
      capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      capture.onstop = () => {
        if (timer.current) clearInterval(timer.current);
        media.getTracks().forEach(track => track.stop());
        if (token !== session.current) return;
        if (Date.now() - started < 800) { setError(l("Record at least one second of clear speech.", "कम से कम एक सेकंड साफ बोलकर रिकॉर्ड करें।")); setMode("idle"); return; }
        void convert(new Blob(chunks, { type: capture.mimeType }), token);
      };
      capture.onerror = () => { release(); setMode("idle"); setError(l("Recording failed. Please try a voice file or type.", "रिकॉर्डिंग नहीं हुई। आवाज़ की फाइल चुनें या सवाल लिखें।")); };
      capture.start(); setMode("recording"); setSeconds(0);
      timer.current = setInterval(() => {
        setSeconds(Math.min(30, Math.floor((Date.now() - started) / 1000)));
        if (Date.now() - started >= 30000 && capture.state === "recording") capture.stop();
      }, 250);
    } catch (e) {
      if (token !== session.current) return;
      release(); setMode("idle");
      setError((e as Error).name === "NotAllowedError" ? l("Microphone permission was denied. Allow access or upload a voice note.", "माइक की अनुमति नहीं मिली। अनुमति दें या आवाज़ की फाइल चुनें।") : l("Microphone could not open. Upload a voice note or type your question.", "माइक नहीं खुला। आवाज़ की फाइल चुनें या सवाल लिखें।"));
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setError(""); setMessage("");
    const token = ++session.current;
    let audio: AudioContext | undefined;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error(l("Choose a voice note under 2 MB.", "2 MB से छोटी आवाज़ की फाइल चुनें।"));
      setMode("transcribing");
      audio = new AudioContext();
      const decoded = await audio.decodeAudioData(await file.arrayBuffer());
      if (decoded.duration < 0.8 || decoded.duration > 30.5) throw new Error(l("Choose a voice note between 1 and 30 seconds.", "1 से 30 सेकंड की आवाज़ की फाइल चुनें।"));
      if (token === session.current) await convert(file, token);
    } catch (e) { if (token === session.current) { setError((e as Error).message); setMode("idle"); } }
    finally { await audio?.close().catch(() => {}); }
  }
  return <div className="voice-question">
    <div className="actions">
      {!busy && <Button type="button" variant="secondary" disabled={disabled || !available} onClick={() => void start()}><Mic size={18} />{l("Speak your question", "बोलकर सवाल पूछें")}</Button>}
      {mode === "recording" && <Button type="button" variant="secondary" onClick={() => { if (recorder.current?.state === "recording") recorder.current.stop(); }}><Square size={18} />{l("Stop and transcribe", "रोकें और शब्द लिखें")} · {seconds}/30s</Button>}
      {busy && <Button type="button" variant="ghost" onClick={() => { release(); setMode("idle"); setMessage(l("Recording discarded.", "रिकॉर्डिंग हटा दी गई।")); }}><X size={18} />{l("Cancel voice input", "आवाज़ का सवाल रद्द करें")}</Button>}
      {!busy && <button className="text-link" type="button" disabled={disabled || !available} onClick={() => input.current?.click()}><Upload size={16} />{l("Upload voice note", "आवाज़ की फाइल चुनें")}</button>}
    </div>
    <input ref={input} hidden style={{ display: "none" }} type="file" accept="audio/*" aria-label="Voice note (1–30 seconds)" disabled={busy || disabled || !available} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file); }} />
    <small>{available ? l("Up to 30 seconds. Audio is sent for transcription after you stop; it is not saved in your records.", "अधिकतम 30 सेकंड। रोकने के बाद आवाज़ से शब्द लिखे जाते हैं; रिकॉर्डिंग आपके रिकॉर्ड में नहीं सहेजी जाती।") : l("Voice input is unavailable right now. You can type your question.", "बोलकर सवाल अभी उपलब्ध नहीं है। आप अपना सवाल लिख सकते हैं।")}</small>
    {mode === "permission" && <p role="status">{l("Waiting for microphone permission…", "माइक की अनुमति का इंतजार है…")}</p>}
    {mode === "transcribing" && <p role="status">{l("Writing your spoken question…", "आपका बोला हुआ सवाल लिखा जा रहा है…")}</p>}
    {message && <p role="status">{message}</p>}
    {error && <p className="voice-error" role="alert">{error}</p>}
  </div>;
}
