import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Mic, Square, Trash2 } from "lucide-react";
import { analyzeAudio } from "../lib/audio";
import {
  displayDate,
  downloadJson,
  timestamp,
  uid,
  useStored,
} from "../lib/storage";
import type { Place } from "../lib/weather";
import {
  fetchGbifContext,
  fetchINaturalistContext,
} from "../services/publicApis";
import { Button } from "./ui/button";
import { Busy, Empty, Field, Notice, Title } from "./workspace";
type Reading = ReturnType<typeof analyzeAudio> & {
  id: string;
  date: string;
  location: string;
};
export function SoundMonitor({ place }: { place: Place }) {
  const [readings, saveReadings] = useStored<Reading[]>(
    "joita-fa-sound-v3",
    [],
  );
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [result, setResult] = useState<Reading | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const gbif = useQuery({
    queryKey: ["gbif-v3", place],
    queryFn: () => fetchGbifContext(place.lat, place.lon),
  });
  const inat = useQuery({
    queryKey: ["inat-v3", place],
    queryFn: () => fetchINaturalistContext(place.lat, place.lon),
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== "inactive") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );
  async function process(blob: Blob) {
    setBusy(true);
    setError("");
    let context: AudioContext | undefined;
    try {
      if (blob.size > 20 * 1024 * 1024)
        throw new Error("Audio must be smaller than 20 MB.");
      context = new AudioContext();
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      const metrics = analyzeAudio(
        decoded.getChannelData(0),
        decoded.sampleRate,
      );
      if (!mounted.current) return;
      const next = {
        ...metrics,
        id: uid(),
        date: timestamp(),
        location: place.label,
      };
      setResult(next);
      saveReadings([next, ...readings].slice(0, 30));
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Audio could not be decoded. Try a WAV or MP3 file.",
        );
    } finally {
      await context?.close();
      if (mounted.current) setBusy(false);
    }
  }
  function stop() {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }
  async function start() {
    setError("");
    setBusy(true);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Microphone recording is unavailable here. Use a supported browser over HTTPS or upload an audio file.",
        );
      const input = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (!mounted.current) {
        input.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = input;
      const chunks: Blob[] = [];
      const media = new MediaRecorder(input);
      recorder.current = media;
      media.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      media.onstop = () => {
        if (mounted.current)
          void process(new Blob(chunks, { type: media.mimeType }));
      };
      media.onerror = () => {
        stop();
        setError("Recording failed. Try uploading an audio file.");
      };
      media.start();
      setRecording(true);
      setSeconds(0);
      let elapsed = 0;
      timer.current = setInterval(() => {
        elapsed++;
        setSeconds(elapsed);
        if (elapsed >= 60) stop();
      }, 1000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(
        (e as Error).name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in your browser or upload an audio file."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title
        title="Field sound monitor / EHI"
        description="Record field sound and compare measurements over time."
      />
      <Notice>
        Sound activity is not an Ecosystem Health Index or species
        identification. Vehicles, voices, wind, and microphone sensitivity
        affect the result. A validated biological EHI model is not connected.
      </Notice>
      <div className="recorder">
        <div className={`recording-meter ${recording ? "is-recording" : ""}`}>
          <Mic size={32} />
          <strong>
            {recording ? `${seconds} / 60 seconds` : "Ready to record"}
          </strong>
        </div>
        <div className="actions">
          <Button disabled={busy || recording} onClick={() => void start()}>
            <Mic size={18} />
            Record 60 seconds
          </Button>
          {recording && (
            <Button variant="secondary" onClick={stop}>
              <Square size={18} />
              Stop recording
            </Button>
          )}
        </div>
        <Field label="Or upload field audio (3-120 seconds, up to 20 MB)">
          <input
            type="file"
            accept="audio/*"
            disabled={recording || busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void process(file);
            }}
          />
        </Field>
      </div>
      {error && <Notice error>{error}</Notice>}
      {busy && <Busy label="Preparing or analyzing audio" />}
      {audioUrl && (
        <audio aria-label="Recorded field audio" controls src={audioUrl} />
      )}
      {result && (
        <section className="section-divider">
          <h3>Measured sound activity</h3>
          <div
            className="waveform"
            role="img"
            aria-label="Recorded sound amplitude"
          >
            {result.waveform.map((v, i) => (
              <span
                key={i}
                style={{ height: `${Math.max(2, Math.min(100, v * 500))}%` }}
              />
            ))}
          </div>
          <div className="metrics">
            <div>
              <strong>{result.activity}%</strong>
              <span>Frames above -50 dBFS</span>
            </div>
            <div>
              <strong>{result.silence}%</strong>
              <span>Quiet frames</span>
            </div>
            <div>
              <strong>{result.rmsDb} dBFS</strong>
              <span>Digital signal level</span>
            </div>
            <div>
              <strong>{result.duration}s</strong>
              <span>Recorded duration</span>
            </div>
          </div>
          <p className="muted">
            Clipped samples: {result.clipping}%. This is a digital signal
            measurement, not calibrated environmental loudness. Raw audio
            remains in this session; saved records contain measurements only.
          </p>
        </section>
      )}
      <h3>Saved measurements</h3>
      {!readings.length && <Empty>No recordings measured yet.</Empty>}
      {readings.map((r) => (
        <div className="saved-row" key={r.id}>
          <button className="text-link" onClick={() => setResult(r)}>
            {r.activity}% active / {r.duration}s
            <small>
              {r.location} / {displayDate(r.date)}
            </small>
          </button>
          <Button
            variant="ghost"
            aria-label="Export sound measurement"
            title="Export sound measurement"
            onClick={() => downloadJson("field-sound.json", r)}
          >
            <Download size={18} />
          </Button>
          <Button
            variant="ghost"
            aria-label="Delete sound measurement"
            title="Delete sound measurement"
            onClick={() =>
              saveReadings(readings.filter((item) => item.id !== r.id))
            }
          >
            <Trash2 size={18} />
          </Button>
        </div>
      ))}
      <section className="section-divider">
        <h3>Nearby biodiversity records</h3>
        <p className="muted">
          Published observations near {place.label}; these species have not been
          identified in your recording. GBIF uses an approximately 20 km-wide
          bounding box; iNaturalist uses a 10 km radius.
        </p>
        {[
          {
            name: "GBIF",
            result: gbif,
            link: "https://www.gbif.org/occurrence/",
          },
          {
            name: "iNaturalist",
            result: inat,
            link: "https://www.inaturalist.org/observations/",
          },
        ].map(({ name, result: query, link }) => (
          <details key={name}>
            <summary>
              {name}
              <span>
                {query.isPending
                  ? "Loading"
                  : query.data?.status || "Unavailable"}
              </span>
            </summary>
            {query.data?.data?.results?.length ? (
              query.data.data.results.slice(0, 8).map((record, i) => (
                <p key={i}>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`${link}${record.key || record.id}`}
                  >
                    {record.species ||
                      record.scientificName ||
                      record.taxon?.preferred_common_name ||
                      record.taxon?.name ||
                      "Observation"}
                  </a>{" "}
                  /{" "}
                  {record.eventDate?.slice(0, 10) ||
                    record.observed_on ||
                    "Date not supplied"}
                </p>
              ))
            ) : (
              <Empty>
                No nearby records returned. This does not mean no biodiversity
                is present.
              </Empty>
            )}
          </details>
        ))}
      </section>
    </>
  );
}
