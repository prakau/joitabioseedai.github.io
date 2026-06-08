# JOITA Bioseed AI Website

Official GitHub Pages website for JOITA Bioseed AI.

JOITA Bioseed AI combines AI-guided recommendations, biological crop inputs, and field validation for farmer-first climate-resilient agriculture.

## Public Website

- Homepage: `https://joitabioseedai.com/`
- FarmAssist AI page: `https://joitabioseedai.com/farmassist-ai.html`
- Dedicated Agri-Smart Assistant page: `https://joitabioseedai.com/agri-smart-assistant.html`
- FarmAssist app: `https://joitabioseedai.com/farmassist/`

## Current Site Pages

- `index.html`
- `products.html`
- `farmassist-ai.html`
- `agri-smart-assistant.html`
- `data-validation.html`
- `farmers-fpos.html`
- `investors-partners.html`
- `join-us.html`
- `contact.html`

Legacy URLs under `/pages/`, `about.html`, `domains.html`, `agri-assistant.html`, and `contact-us.html` now redirect to the updated page set. The dedicated `agri-smart-assistant.html` page remains public for farmers and partners who know the original assistant name.

## JOITA FarmAssist

The public farmer assistant is a React 18 + Vite + TypeScript + Tailwind offline-first web app.

- Source: `farmassist-src/`
- GitHub Pages output: `farmassist/`
- Base path: `/farmassist/`

To rebuild FarmAssist:

```bash
cd farmassist-src
npm install
npm run build
```

FarmAssist uses public/no-key APIs where possible and stores optional API keys only in browser localStorage.

## OpenRouter FarmAssist Proxy

OpenRouter is supported only through a backend proxy. Do not place the OpenRouter key in frontend JavaScript or GitHub Pages HTML.

- Backend function: `api/farmassist-chat.js`
- Required environment variable: `OPENROUTER_API_KEY`
- Template: `.env.example`
- Preferred deployment: Vercel serverless function at `/api/farmassist-chat`

GitHub Pages cannot run `/api` functions. On GitHub Pages, FarmAssist falls back to the offline JOITA knowledge base unless the same site is also deployed behind a serverless provider such as Vercel, Netlify, Cloudflare Workers, Render, or Railway.

## Tech Stack

- Static HTML, CSS, and JavaScript for the public marketing site
- React 18, Vite, TypeScript, Tailwind CSS for FarmAssist
- GitHub Pages with custom domain through `CNAME`

## Positioning

Products and platform:

- BioSynth Nano
- FarmAssist AI
- SmartSeedMat
- AquaSynth Nano

Footer disclaimer:

JOITA products and technologies are under continuous field validation. Crop response may vary depending on crop, variety, location, season, soil, weather, application timing, and management practices. Product use should follow approved guidance, local regulations, and expert recommendations.

## License

Copyright 2025-2026 JOITA Bioseed AI. All rights reserved.
