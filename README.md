# CrewVitals

A web app that lets an astronaut on a long-duration mission self-assess their health, understand what each indicator means in spaceflight, and know what to do next. Built for the NASA Space Apps Challenge 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

> **This is a hackathon prototype, not a medical device.** Alert thresholds are terrestrial adult clinical reference ranges ("Reference range: adult clinical reference, Earth-based"), not NASA flight rules or spaceflight-specific limits. Crew data in the demo is simulated.

## What it does

- **Dashboard**: mission day, overall status, six indicator cards (blood pressure, resting heart rate, blood glucose, body temperature, sleep, mood) with green / yellow / red status, trend alerts, a space weather banner and a radiation panel.
- **Daily check-in**: one form for the six indicators, with plain-language help on how to take each measurement.
- **Trends**: a chart per indicator across mission days, with the green range shaded and out-of-range readings marked. Trend rules flag 3-day patterns (escalation, sleep debt, behavioral health, cardiovascular).
- **Body map**: select a region to see its readings, how spaceflight affects it (paraphrased NASA statements with source links), and related NASA open-science studies.
- **About**: disclaimer, every data source with its link and Live/Snapshot mode, and how AI was used.
- **Load demo mission** fills 30 days of simulated crew data with a few deliberate anomalies. **Clear data** resets.

There is no login and no account. Health entries stay in the browser (localStorage) and are never sent to a server.

## Data sources

| Source | Used for | Link |
|---|---|---|
| NASA CCMC DONKI | Solar flares and solar energetic particle events of the last 7 days (space weather banner) | https://ccmc.gsfc.nasa.gov/DONKI/ (API: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/`) |
| NASA OSDR (Open Science Data Repository) | Related open-science studies, one fixed keyword per indicator | https://osdr.nasa.gov/ (search API: `https://osdr.nasa.gov/osdr/data/search`) |
| NASA OSDR RadLab | Absorbed dose rate measured by the DosTel instruments aboard the ISS on 1 April 2022 (radiation panel) | https://visualization.osdr.nasa.gov/radlab/ (API docs: https://visualization.osdr.nasa.gov/radlab/gui/data-api) |

Space weather data: NASA CCMC DONKI.

The spaceflight context text in `src/content/evidence.json` is paraphrased by the team from these NASA pages, and every statement in the app links to its page:

- The Human Body in Space: https://www.nasa.gov/humans-in-space/the-human-body-in-space/
- 5 Hazards of Human Spaceflight (NASA Human Research Program): https://www.nasa.gov/hrp/hazards
- Human Research Roadmap, Risks: https://humanresearchroadmap.nasa.gov/Risks/

None of the APIs needs an API key.

### Live and snapshot data

The NASA APIs are called server-side by Cloudflare Pages Functions in `functions/api/` (`space-weather`, `studies`, `radiation`). Each caches its response for 1 hour. If the upstream call fails, the function returns the copy bundled in `public/snapshots/`. Every NASA data panel is labelled **Live** or **Snapshot — retrieved &lt;date&gt;**.

The snapshots were retrieved on 2026-11-14. That date is `SNAPSHOT_RETRIEVED` in `src/lib/nasa.ts`; update it whenever the snapshot files are refreshed.

## Run locally

Requires Node.js 24 (tested with 24.11.1) and npm.

```sh
npm ci          # install exact dependencies from package-lock.json
npm run dev     # start the dev server at http://localhost:5173
npm test        # run the unit tests (status rules, trend rules, NASA data code, evidence.json)
npm run build   # type-check and build into dist/
```

Under `npm run dev` there are no Pages Functions, so the app reads the bundled snapshots and labels every NASA panel as a snapshot. Live data appears only when the app is deployed on Cloudflare Pages.

## Deploy

Cloudflare Pages, connected to this GitHub repository:

- Build command: `npm run build`
- Build output directory: `dist`
- The `functions/` directory is picked up automatically as Pages Functions. No secrets or environment variables are needed.

## Editing content

- Thresholds, guidance, self-care steps and trend-alert texts: `src/content/indicators.ts`, the one place to edit them. They must be reviewed by the team's biomedical engineer before submission.
- Spaceflight context: `src/content/evidence.json`. Render it as written; check every NASA statement against its source page.
- Body map figure: `src/assets/body.svg` can be replaced by another drawing without code changes, as long as it keeps the six region ids (`head`, `heart`, `abdomen`, `core`, `bones`, `whole-body`). The comment at the top of the file explains the rest.

## Use of AI

- The code was written with Claude Code (Anthropic's AI coding assistant) and reviewed by the team.
- Body map figure. Schematic figure drawn in code with AI assistance.
- No images were generated with AI, and the app uses no NASA logos, insignia or mission patches.
- The app itself uses no AI: statuses, alerts and guidance come from fixed rules in `src/content/indicators.ts`.
