# JOITA FarmAssist

Public application: https://www.joitabioseedai.com/farmassist/

React 18, TypeScript, Vite, Tailwind, React Query, HashRouter, and Three.js. Source lives in this directory; the production build is written to `../farmassist/`. The surrounding JOITA website and CNAME remain separate.

## Run and verify

```sh
npm ci --prefix ../api
npm ci
npm run dev
npm test
npm run test:browser
npm run build
```

The local Vite server proxies `/api` to the existing JOITA production backend. It does not read or require production keys locally. Live requests use the ordinary production rate limit. Browser regression tests mock provider responses and data services; they do not spend live AI quota.

Install a Playwright Chromium browser with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium executable. Browser tests expect Vite on port 5173. To verify the built offline app, run `npm run preview -- --port 4173`, then `node tests/verify-offline.mjs`.

## What works

- Ask: streamed Gemini primary, OpenRouter fallback, honest local knowledge fallback; 14 answer languages, automatic script matching, native-language examples, short conversation context, simpler-explanation follow-ups, saved answers, searchable history and export. Stop cancels a request without saving unfinished text. Read-aloud uses server-side Google speech with matching device voices as an explicit fallback. Native audio controls support pause and seeking; Stop and navigation cancel playback.
- Diagnose: real JPEG/PNG/WebP bytes sent to the provider, with text symptoms and explicit photo-analysis status. Uploads limited to 4 MB and resized before base64 transport. Images are not included in saved history.
- Plot: actual Three.js field geometry driven by dimensions and row count, camera controls, irrigation overlays, input validation, saved layout loading, deletion and export. A 2D plan remains available when WebGL is unsupported.
- Weather: manual town search/geolocation; current Open-Meteo estimates and seven-day forecast, coordinate-specific cache with original observation time, and separately labeled NASA POWER historical climatology. No fabricated weather observations or numerical disease-risk scores.
- Calendar: crop/topic/season search, dated task editing and completion, overdue filters, dashboard upcoming tasks, and real all-day `.ics` exports. Answers can become user-confirmed inspection tasks. Calendar export does not enable background notifications in FarmAssist.
- Calculators: area conversion, water volume/pump time, and seed quantity from user-provided rates and units. These are arithmetic tools, not irrigation prescriptions or recommended seed rates.
- Income & Costs: private local income/expense entries, integer-paise totals, date/crop filters, editing, deletion/undo, and JSON export. Recorded cash flow is not a profit forecast.
- Soil: measured lab values, units, range validation, screening guidance, history and export. Blank values are not treated as zero. Soil test methods and crop requirements take priority over generic screening ranges.
- Sound: 60-second microphone recording, stop control, uploaded audio analysis, playback, measured RMS/activity/quiet frames, saved metrics and export. Permission and decoding errors are visible. Audio stays in the browser and is not sent to AI services.
- Community: local field notes, search, delete, export and explicit sharing/email actions. No seeded users or fictional public posts.
- Settings: farm profile, location, record export, offline cache status and diagnostics. No AI-key entry or browser AI credentials.

## External services and limits

Vercel runs `/api/health`, `/api/farmassist-chat`, `/api/farmassist-speech`, and `/api/market`. `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `DATAGOV_API_KEY`, and `GOOGLE_TTS_API_KEY` belong only in Vercel secret environment settings. Never commit keys or `.env` files. Environment changes require a new production deployment.

`DATAGOV_API_KEY` enables the AGMARKNET adapter. Market distinguishes feed publication time, retrieval time, and each record's arrival date. An empty state filter means no matching publication, not a zero price or a broken connection. Show all markets clears filters; up to 200 records are returned. The daily resource is not a historical archive. Without a key, Market shows an unavailable state and official market links, never demonstration prices. Offline caches preserve original records and dates for identical filters only.

`GOOGLE_TTS_API_KEY` must allow the Google Cloud Text-to-Speech API. Google Standard-A voices support English (India), Hindi, Punjabi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam and Urdu. Haryanvi uses a clearly labeled Hindi voice. Odia and Assamese fall back to a matching device voice, if present. Only clicking read-aloud sends the completed answer text to Google; audio is not persisted in local storage. Native text is split below Google's per-request byte limit; one app request accepts up to 18,000 UTF-8 bytes. Unsupported languages, provider failures, missing device voices, autoplay restrictions and cancellations have explicit UI states.

Chat and speech each have a simple limit of 10 requests per IP per hour **per warm server instance**, not a distributed global quota. Configure Google project quotas to cap cross-instance usage and billing alerts to monitor cost. Cloud speech can incur charges beyond the provider allowance; Standard voices are selected explicitly instead of higher-priced premium voices. No billing plan or provider quota is changed by this application.

Chat requests default to JSON for backwards compatibility. `Accept: text/event-stream` enables `status`, `delta`, `reset`, and final `complete` events. Each event contains JSON data. Only a validated `complete` event is a finished answer; a provider switch clears its preceding partial output. Truncated streams are never saved as live answers. Vercel installs the API and frontend dependencies separately. Provider timeouts fit within the 30-second function budget.

Automatic language matching uses script detection, not a guaranteed language classifier. Shared scripts such as Hindi/Marathi/Haryanvi require an explicit choice for the intended language or dialect. Offline crop guides remain in English. Interface navigation remains English; native-language prompts and AI answers are available in the advisory workspace.

There is no shared community database or automatic synchronization between devices. A scientifically validated EHI or acoustic species classifier is not connected; sound activity is not ecosystem health. Nearby GBIF/iNaturalist observations provide geographic context only, never species detections from a recording. Pl@ntNet is not presented as an active disease detector.

## Offline and data integrity

The service worker precaches the app shell, JS and CSS. It only intercepts this app's same-origin GET assets/navigation, and never caches `/api/health`, chat, or third-party API calls. Cache cleanup is restricted to JOITA FarmAssist caches. Weather/API caches include coordinates or filters and source timestamps.

Existing questions/layouts/notes remain accessible. Earlier soil and EHI records remain exportable but are not relabeled as new validated measurements. Local storage failures display a warning; save confirmation appears only after successful persistence.

The public website deploys from the repository to Vercel. A static GitHub Pages copy can serve the UI/offline tools but cannot run live API functions.
