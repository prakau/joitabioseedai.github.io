# JOITA FarmAssist

JOITA FarmAssist is a production-shaped, offline-first agricultural companion web app for farmers. It is built with React 18, Vite, TypeScript, Tailwind CSS, shadcn-style local UI primitives, React Query, and React Router.

## Features

- Agricultural knowledge base with offline crop, fertilizer, pest, soil, and biochar guidance.
- Plant disease diagnosis workflow with image upload, symptom notes, heuristic offline scoring, and optional online API path.
- Bioacoustic field-health monitor that simulates a 60-second recording, detects biodiversity signal groups, and computes an Ecosystem Health Index.
- Weather widget using the free Open-Meteo API with seasonal India offline fallback.
- Crop calendar and growth-stage schedules for common India crops.
- 3D farm plot visualizer with water, fertility, and canopy zones.
- Soil recommendations for common India soil profiles.
- Market price tracker with offline mandi planning data and data.gov.in/Agmarknet integration notes.
- Farmer community board backed by localStorage for offline posting and later sync.
- Service worker and localStorage support for rural low-connectivity use.
- Direct link to [JoitaBioseedai.com](https://JoitaBioseedai.com).

## Free APIs

- Weather: Open-Meteo, no key required.
- Plant diagnosis upgrade path: PlantNet, Hugging Face Spaces, or Roboflow free tier.
- Market upgrade path: data.gov.in Agmarknet datasets when an API key is available.
- Community sync upgrade path: Supabase free tier or Firebase free tier.

## Run Locally

```bash
cd farmassist-src
npm install
npm run dev
```

## Build

```bash
cd farmassist-src
npm run build
```

## GitHub Pages Hosting

This repo includes `.github/workflows/joita-farmassist-pages.yml`. Push to `main`, enable GitHub Pages with `GitHub Actions` as the source, and the app will deploy the repository root after building `farmassist-src` into `farmassist/`.

The Vite base path is `/farmassist/`, so the public URL is `https://joitabioseedai.com/farmassist/`.
