# JOITA FarmAssist

Public application: https://www.joitabioseedai.com/farmassist/

React 18, TypeScript, Vite, Tailwind, React Query, HashRouter, and Three.js. Source lives in this directory; the production build is written to `../farmassist/`. The surrounding JOITA website and CNAME remain separate.

## Run and verify

```sh
npm ci
npm run dev
npm test
npm run test:browser
npm run build
```

The local Vite server proxies `/api` to the existing JOITA production backend. It does not read or require production keys locally. Live requests use the ordinary production rate limit. Browser regression tests mock provider responses and data services; they do not spend live AI quota.

Install a Playwright Chromium browser with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium executable. Browser tests expect Vite on port 5173. To verify the built offline app, run `npm run preview -- --port 4173`, then `node tests/verify-offline.mjs`.

## What works

- Ask: Gemini primary, OpenRouter fallback, honest local knowledge fallback; topic-aware crop guidance, short conversation context, saved answers, searchable history and export.
- Diagnose: real JPEG/PNG/WebP bytes sent to the provider, with text symptoms and explicit photo-analysis status. Uploads limited to 4 MB and resized before base64 transport. Images are not included in saved history.
- Plot: actual Three.js field geometry driven by dimensions and row count, camera controls, irrigation overlays, input validation, saved layout loading, deletion and export. A 2D plan remains available when WebGL is unsupported.
- Weather: manual town search/geolocation; current Open-Meteo estimates and seven-day forecast, coordinate-specific cache with original observation time, and separately labeled NASA POWER historical climatology. No fabricated weather observations or numerical disease-risk scores.
- Calendar: crop/topic/season search and local dated tasks with completion state.
- Soil: measured lab values, units, range validation, screening guidance, history and export. Blank values are not treated as zero. Soil test methods and crop requirements take priority over generic screening ranges.
- Sound: 60-second microphone recording, stop control, uploaded audio analysis, playback, measured RMS/activity/quiet frames, saved metrics and export. Permission and decoding errors are visible. Audio stays in the browser and is not sent to AI services.
- Community: local field notes, search, delete, export and explicit sharing/email actions. No seeded users or fictional public posts.
- Settings: farm profile, location, record export, offline cache status and diagnostics. No AI-key entry or browser AI credentials.

## External services and limits

Vercel runs `/api/health`, `/api/farmassist-chat`, and `/api/market`. `GEMINI_API_KEY` and `OPENROUTER_API_KEY` belong only in Vercel environment settings. Never commit keys or `.env` files. Optional `DATAGOV_API_KEY` enables the AGMARKNET adapter. Without it, Market shows an unavailable state and official market links, never demonstration prices. The simple chat limiter is per warm server instance, not a distributed global quota.

There is no shared community database or automatic synchronization between devices. A scientifically validated EHI or acoustic species classifier is not connected; sound activity is not ecosystem health. Nearby GBIF/iNaturalist observations provide geographic context only, never species detections from a recording. Pl@ntNet is not presented as an active disease detector.

## Offline and data integrity

The service worker precaches the app shell, JS and CSS. It only intercepts this app's same-origin GET assets/navigation, and never caches `/api/health`, chat, or third-party API calls. Cache cleanup is restricted to JOITA FarmAssist caches. Weather/API caches include coordinates or filters and source timestamps.

Existing questions/layouts/notes remain accessible. Earlier soil and EHI records remain exportable but are not relabeled as new validated measurements. Local storage failures display a warning; save confirmation appears only after successful persistence.

The public website deploys from the repository to Vercel. A static GitHub Pages copy can serve the UI/offline tools but cannot run live API functions.
