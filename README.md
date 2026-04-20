# flyers-fan

`flyers-fan` is a Philadelphia Flyers dashboard built with React, Vite, and Tailwind CSS. It pulls live NHL data through a small Vercel edge proxy and presents it in a fan-focused interface currently centered on the 2025-2026 Flyers season.

## What the app includes

- A dashboard with the Flyers' record, recent form, live-game status, and Metro context
- A schedule view for the season game log and recent results
- A standings view focused on the Metropolitan Division and Eastern Conference
- A "Game Tape" page for the current live game or most recent finished game
- Adaptive polling that refreshes live games more often than season-long data
- Keyboard shortcuts: `1` dashboard, `2` schedule, `3` standings, `4` game tape

## How it works

The frontend does not call the NHL API directly. Browser requests go to `/api/nhl`, which is implemented in [api/nhl.js](api/nhl.js). That edge function:

- Proxies requests to `https://api-web.nhle.com`
- Adds CORS headers so the browser can fetch NHL data
- Applies short cache windows based on the endpoint type
- Keeps live game data fresher than standings and season schedule data

The app is intentionally Flyers-specific right now. The main hard-coded values live in [src/App.jsx](src/App.jsx):

- `TEAM_ABBR = 'PHI'`
- `SEASON = '20252026'`

## Tech stack

- React 19
- Vite 8
- Tailwind CSS 3
- Lucide React
- Vercel Edge Functions

## Local development

This project does not require API keys or environment variables.

1. Install dependencies:

```bash
npm install
```

2. Run the app with the Vercel API route available:

```bash
npx vercel dev
```

`npm run dev` starts the Vite frontend, but the app expects `/api/nhl` to exist. Since that route lives in [api/nhl.js](api/nhl.js), plain Vite dev mode is not enough unless you add your own local proxy setup.

## Build

To produce the frontend bundle:

```bash
npm run build
```

To preview the full app with the NHL proxy, use Vercel locally or deploy it to Vercel.

## Data sources

The current UI is built from these NHL endpoints:

- `v1/club-schedule-season/PHI/20252026`
- `v1/standings/now`
- `v1/gamecenter/:id/boxscore`
- `v1/gamecenter/:id/right-rail`
- `v1/gamecenter/:id/landing`

## Project structure

```text
.
|-- api/
|   `-- nhl.js
|-- public/
|   |-- favicon.svg
|   `-- icons.svg
|-- src/
|   |-- App.jsx
|   |-- index.css
|   |-- main.jsx
|   `-- assets/
|       `-- hero.png
|-- index.html
`-- package.json
```

## Deployment

Deploy the repo to Vercel so the static frontend and `/api/nhl` edge function are served together.
