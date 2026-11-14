# CrewVitals (working title) — Project Spec

NASA Space Apps Challenge 2026 — Challenge: "Create Health Monitoring Software for Astronauts on Space Missions".

Build a web app that lets an astronaut on a long-duration mission self-assess their health, understand what each indicator means in spaceflight, and know what to do next. All UI text is in English.

## 1. Hard rules

- This is a hackathon prototype, not a medical device. Show that disclaimer in the footer and on the About page.
- Never invent NASA facts, statistics, or thresholds. Every NASA-specific statement shown in the UI must come from `src/content/evidence.json`, which the team curates by hand, and must display its source link.
- Alert thresholds are terrestrial adult clinical reference ranges. Label them as such in the UI ("Reference range: adult clinical reference, Earth-based").
- Crew data in the demo is simulated. Label it "Simulated crew data" wherever it appears.
- NASA data that is fetched live is labeled "Live". NASA data embedded as a file is labeled "Snapshot — retrieved <date>". Never present a snapshot as live.
- Do not use NASA logos, insignia, or mission patches. Do not generate images with AI.
- No login, no accounts, no personal data sent to any server. Health entries stay in the browser (localStorage).

## 2. Stack and hosting

- Vite + React + TypeScript + Tailwind CSS + Recharts.
- Hosting: Cloudflare Pages, deployed from a public GitHub repository.
- Server-side calls to NASA APIs go through Cloudflare Pages Functions in `/functions/api/`. None of the three APIs used needs an API key (checked 2026-11-14), so there are no secrets to manage.
- Each function caches its response (Cache API, 1 hour) and returns a typed JSON shape. If the upstream call fails, the function returns the bundled snapshot from `/public/snapshots/` with `"mode": "snapshot"`.

## 3. Screens

1. **Dashboard** — mission day counter, overall status, six indicator cards with traffic-light status, radiation panel, space-weather banner.
2. **Daily check-in** — one form for the six indicators. Plain-language help text next to each field explaining how to take the measurement.
3. **Body map** — a human figure (SVG supplied by the team at `src/assets/body.svg`, with region ids). Clicking a region opens a panel with its indicators, current status, how spaceflight affects that region, and the evidence links.
4. **Trends** — line chart per indicator across mission days, with reference bands shaded and anomalies marked.
5. **About / Data sources / AI use** — the disclaimer, every data source with link and live/snapshot mode, and a statement of which AI tools were used to build the app.

A "Load demo mission" button fills 30 mission days of simulated data, including a few deliberate anomalies, so judges can see trends and alerts immediately. A "Clear data" button resets.

## 4. Indicators and status rules

Status is green / yellow / red. Thresholds live in `src/content/indicators.ts` so the team can edit them in one place.
**The team's biomedical engineer reviewed this table and the guidance on 14 Nov 2026 (with Gemini as an aid). Any change needs the same review.**

| Indicator | Input | Green | Yellow | Red |
|---|---|---|---|---|
| Blood pressure | systolic / diastolic, mmHg | SBP 90–129 and DBP 60–79 | SBP 130–139 or DBP 80–89 | SBP ≥ 140, DBP ≥ 90, SBP < 90, or DBP < 60 |
| Resting heart rate | bpm | 50–100 | 40–49 or 101–120 | < 40 or > 120 |
| Blood glucose (fasting) | mg/dL | 70–99 | 54–69 or 100–125 | < 54 or ≥ 126 |
| Blood glucose (non-fasting) | mg/dL | 70–139 | 54–69 or 140–199 | < 54 or ≥ 200 |
| Body temperature | °C | 36.0–37.5 | 35.0–35.9 or 37.6–37.9 | < 35.0 or ≥ 38.0 |
| Sleep | hours in last 24 h | ≥ 7.0 | 6.0–6.9 | < 6.0 |
| Mood | self-report, 1 (very low) to 5 (very good) | 4–5 | 3 | 1–2 |

Trend rules (evaluated on the last 3 entries, which must fall on 3 consecutive mission days with the indicator logged in all three):

- Any indicator red on 3 consecutive days → escalation message.
- Sleep < 6 h on 3 consecutive days → sleep-debt alert. (Sleep < 6 h is exactly sleep red, so this alert replaces the generic escalation for sleep.)
- Mood ≤ 2 on 3 consecutive days → behavioral-health alert. (Mood ≤ 2 is exactly mood red, so this alert replaces the generic escalation for mood.)
- Blood pressure or heart rate yellow or worse on 3 consecutive days → cardiovascular trend alert, checked per indicator. Not shown for an indicator that already has an escalation.

Escalation, sleep-debt and behavioral-health alerts tell the user to inform the Crew Medical Officer and report to the flight surgeon on the ground. Alert texts are editable strings in `indicators.ts` and need the same review as the thresholds.

When at least one red trend alert is active, the Overall status box says so first ("A red trend alert is active: inform the Crew Medical Officer and report to the flight surgeon on the ground. See the trend alerts below.", with a link to the alerts), and then shows the guidance for the latest check-in under the label "Latest check-in:".

Guidance shown per status:

- Green: "Within reference range. Keep your routine."
- Yellow: "Outside the reference range. Re-measure, review the self-care steps below, and log again tomorrow."
- Red: "Well outside the reference range. Re-measure now. If confirmed, inform the Crew Medical Officer and report to the flight surgeon on the ground."
- Yellow for Sleep or Mood: "Below the reference range. Review the self-care steps and log again tomorrow."
- Red for Sleep or Mood: "Well below the reference range. Follow the self-care steps and log again tomorrow."
- A single Sleep or Mood reading never says "Re-measure" or refers the user to the Crew Medical Officer; escalation for these two comes only from the 3-day trend rules. The overall status uses the Sleep/Mood text when Sleep or Mood are the only indicators at the worst status.
- Blood pressure SBP ≥ 180 or DBP ≥ 120, glucose < 54, temperature ≥ 39.0 → "Urgent: inform the Crew Medical Officer now."

Self-care steps per indicator are short editable strings in `indicators.ts`.

## 5. Spaceflight context (body map and cards)

Each indicator is linked to one or more of the five hazards of human spaceflight defined by NASA's Human Research Program: space radiation; isolation and confinement; distance from Earth; gravity fields; hostile/closed environments.

| Body region (SVG id) | Indicators | Hazard(s) |
|---|---|---|
| `head` | Mood, Sleep | Isolation and confinement |
| `heart` | Blood pressure, Heart rate | Gravity fields; space radiation |
| `abdomen` | Blood glucose | Distance from Earth (nutrition: no resupply); gravity fields (kidney stone risk) |
| `core` | Body temperature | Hostile/closed environments (immune changes) |
| `bones` | none (information only) | Gravity fields (bone and muscle loss) |
| `whole-body` | Radiation exposure panel | Space radiation |

The explanatory text and the "why this matters in space" sentence for each region come only from `src/content/evidence.json`. That file already exists and is drafted. Read it, render it, and do not rewrite or extend its text. Its structure:

- `sources`: an object keyed by a short name (`bodyInSpace`, `hazards`, `roadmap`). Each value has `title` and `url`.
- `hazards`: the five HRP hazards, each with `id`, `name` and `nasa` statements.
- `regions`: one entry per body-map region, each with `id` (the SVG id), `label`, `indicators` (indicator ids from `indicators.ts`), `hazards` (hazard ids), `nasa`, `team` and `reviewStatus`.
- `escalation`: `nasa` statements and `team` text about care far from Earth (not rendered yet).
- `_readme`: a note for the team, not rendered.

In every entry:

- `nasa`: a list of statements paraphrased from a NASA page. Each statement has `text` and `source`, where `source` is a key into `sources` (for example `"bodyInSpace"`), not a URL. Render each statement with a link built from that source's `url`, using its `title` as the link text.
- `team`: the team's own design rationale. Render under the label "Why we track this" and never attribute it to NASA.
- `reviewStatus`: internal, not rendered.

Sources used: https://www.nasa.gov/humans-in-space/the-human-body-in-space/ and https://www.nasa.gov/hrp/hazards. Deeper references for the About page: https://humanresearchroadmap.nasa.gov/Risks/.

"Distance from Earth" appears as a mission-setting selector (ISS / Lunar surface / Mars transit) on the dashboard, stored in `Settings.setting`, that changes one line of the escalation guidance: on Mars transit, every red escalation text adds "Communication with the ground is delayed. Follow the onboard procedure first." That covers the red guidance for a single reading, the red trend alerts, and the red-trend message in the Overall status box. The Sleep and Mood self-care texts do not refer the user to the ground, so they do not change. ISS and Lunar surface leave all texts unchanged. (Implemented after M5 as the stretch goal.)

## 6. NASA data integrations

Endpoint status as of 2026-11-14 is noted per API. Before building against each one, call it once with curl and save the real response to `/public/snapshots/` (`donki-flr.json`, `donki-sep.json`, `osdr-<keyword>.json` with spaces as hyphens, `radlab-<environment>.json` for the six RadLab environments; `radlab.json` is the original docs-example response, kept for reference and not used). The date they were fetched is `SNAPSHOT_RETRIEVED` in `src/lib/nasa.ts`; update it when the snapshots are refreshed.

Each function returns `{ mode: "live" | "snapshot", retrieved: <ISO date>, data }`. The browser calls `/api/...` first; if that does not return this JSON (for example under plain `npm run dev`, where there are no functions), it reads the snapshot files itself and runs the same code from `src/lib/nasa.ts` on them, labelled as a snapshot. No API key is needed for any of them.

### 6.1 DONKI — space weather events (confirmed working)

- Function: `/functions/api/space-weather.ts`
- Base URL: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/`. DONKI moved here on 2026-09-30. Do not use `api.nasa.gov/DONKI` or `kauai.ccmc.gsfc.nasa.gov`; they no longer serve the API.
- Solar flares: `GET https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`. Returns a JSON array. Fields seen: `flrID`, `beginTime`, `peakTime`, `endTime`, `classType` (e.g. `"M1.7"`), `sourceLocation`, `activeRegionNum`, `link`, `linkedEvents`.
- Solar energetic particle events: `GET https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`. Returns a JSON array, which is `[]` when there are no events (this is the normal case; handle it).
- Use: a banner on the dashboard, from the last 7 days.
  - Any SEP event, or any flare whose `classType` starts with `X` → "Space weather alert", with event time, class, and the DONKI `link`.
  - Otherwise → "No major space weather events in the last 7 days", plus the most recent flare (class and peak time) as information.
- Credit line on the About page: "Space weather data: NASA CCMC DONKI."

### 6.2 OSDR — NASA open-science studies (confirmed working)

- Function: `/functions/api/studies.ts?term=<keyword>`
- Upstream: `GET https://osdr.nasa.gov/osdr/data/search?term=<keyword>&from=0&size=5&type=cgene`
- Response shape: `hits.total` (count) and `hits.hits[]`, each with `_source` containing `"Study Title"`, `"Accession"` (e.g. `"OSD-195"`), `"organism"`, `"Project Type"` (e.g. `"Spaceflight Study"`, `"Ground Study"`), and `"Study Description"`. Note the keys contain spaces.
- Study link: `https://osdr.nasa.gov/bio/repo/data/studies/<Accession>` (checked 2026-11-14: `OSD-195` opens).
- Use: each indicator panel has a "Related NASA open-science studies" list, fetched with a fixed keyword per indicator: `cardiovascular` (blood pressure, heart rate), `glucose`, `immune` (body temperature), `circadian` (sleep), `behavior` (mood), `bone loss` (bones), `radiation` (whole body). The lists appear in the body-map region panels. `sleep circadian` returned only 3 hits on 2026-11-14, so it was replaced by the broader `circadian` (9 hits). The function accepts only these keywords.
- Keyword relevance is loose and many studies are on mice or are ground studies. Always show `organism` and `Project Type` next to each title, and never describe these studies as astronaut data.

### 6.3 RadLab — measured radiation dose, six environments (confirmed working)

- Function: `/functions/api/radiation.ts?env=<id>`. It accepts only the six environment ids below and returns 400 for anything else.
- Docs: https://visualization.osdr.nasa.gov/radlab/gui/data-api (returned a server error on 2026-11-14; the API itself worked).
- Upstream: `GET https://visualization.osdr.nasa.gov/radlab/api/`. Key-value filters such as `instrument_id=DosTel1` and `timestamp` with `>=`, `>`, `<`, `<=` (usable more than once); bare field names add columns; `format=json`. There is no "not equal" filter and no catalogue endpoint.
- JSON response: `{columns, index, data}`, rows as arrays in column order. Map rows to objects by column name, never by position.
- Fields: `absorbed_dose_rate` (µGy/h) is filled for every instrument used. `dose_equivalent_rate` is empty for all of them, so the panel shows absorbed dose only. `latitude`/`longitude` exist only for the ISS.
- RadLab exposes `spacecraft`, `instrument`, `instrument_family` and `trajectory` per instrument; show them as given. It exposes no data source or agency field, so none is shown.
- Environments, all on the same calendar day, **1 Dec 2022** (`RADLAB_DAY` in `src/lib/nasa.ts`):

| id | Name in the app | `instrument_id` | RadLab spacecraft / instrument / family / trajectory |
|---|---|---|---|
| `iss` | ISS | `DosTel1` | ISS / DosTel1 / DosTel / LEO |
| `lunar-orbit` | Lunar orbit | `CRaTER-D1D2` | LRO / CRaTER / CRaTER / Lunar orbit |
| `cislunar-orion` | Cislunar flight inside Orion | `Artemis-I-HERA-HSU1` | Orion / HERA-HSU1 / Timepix / Lunar flyby |
| `deep-space` | Deep space | `BPD` | BioSentinel / BPD / Timepix / Heliocentric orbit at 1 AU |
| `mars-orbit` | Mars orbit | `Liulin-MO-AB-Orbit` | TGO / Liulin-MO-AB / Liulin / Mars orbit |
| `mars-surface` | Mars surface | `MSL-RAD-Surface` | Curiosity / MSL-RAD / RAD / Mars surface |

- Why 1 Dec 2022: it is the only day between 17 Nov and 11 Dec 2022 (Artemis I flight) on which TGO Liulin-MO has no multi-hour gap; the other five have full days at their normal cadence. DONKI lists no SEP events from 17 Nov to 11 Dec 2022 and one M1.0 flare on 1 Dec. Using one day for all six keeps the comparison in the same space-weather period.
- Query: the instrument's readings from 18:00 the day before to 06:00 the day after (6 hours of padding), so the dose can be integrated over exactly 00:00–24:00. Snapshots: `radlab-<id>.json`, the same query saved on 2026-11-14. The docs example's `absorbed_dose_rate>2` filter is never used.
- Daily dose: integrate the dose rate over 00:00–24:00 by the trapezoid rule, readings joined by straight lines and cut at midnight by linear interpolation; report the longest gap. Never compute dose from a plain mean of readings. Mean, median and maximum rate use every reading of the day.
- Panel: a bar comparison of the measured daily dose of all six; a control to pick one (default ISS) with its time series on a logarithmic axis (5-minute averages when the day has more than 300 readings) and its mean, median and maximum. Label each environment exactly as measured, with spacecraft, instrument and date. Never present one environment as another.
- Visible caveat: "The instruments differ in detector design, shielding and location, so these are measured dose rates at each instrument, not comparable crew doses."
- Mission setting line: Lunar surface → "No measured lunar-surface data exists in RadLab; see lunar orbit and cislunar flight." Mars transit → "No measured Mars-transit data exists in RadLab; see deep space and Mars orbit." ISS → no line. RadLab has no lunar-surface data and no Mars-cruise data (checked 2026-11-14).
- Illustrative cumulative dose = the selected environment's measured daily dose × mission day, labelled as an illustration that assumes every mission day is like this measured day at this instrument, and not a personal dose record.
- ISS readings above 100 µGy/h: on 1 Dec 2022 all 82 fall between latitude 13°S–40°S and longitude 24°W–73°W, so the panel says in plain words that they were taken over southern South America and the nearby South Atlantic Ocean, labelled as an observation from the data, not a NASA statement. The sentence is shown only if at least 90% of the high readings fall inside that area.
- RadLab timestamps carry no time zone, and RadLab does not state one. Show them as "RadLab timestamps", without claiming UTC.
- RadLab data covers historical periods. Present it as measured on its date, not as current conditions.
- If the live call fails, serve that environment's snapshot and label it as a snapshot.

## 7. Data model (localStorage)

```ts
type Entry = {
  missionDay: number;
  date: string;            // ISO
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  glucose?: number;
  glucoseFasting?: boolean;
  temperatureC?: number;
  sleepHours?: number;
  mood?: 1 | 2 | 3 | 4 | 5;
  simulated: boolean;
};
type Settings = { missionStart: string; setting: "ISS" | "Lunar surface" | "Mars transit" };
```

## 8. Accessibility and design

- Status is never conveyed by color alone: each status has an icon and a text label.
- Color-blind-safe palette; contrast at WCAG AA.
- Works on a phone-width screen and on a laptop.
- Calm, instrument-panel look. Dark theme by default.

## 9. Build order

1. **M1** — project scaffold, deploy pipeline working on Cloudflare Pages, Dashboard + Daily check-in + status rules + localStorage.
2. **M2** — Trends charts, trend rules, "Load demo mission".
3. **M3** — Body map with region panels and `evidence.json`.
4. **M4** — the three Pages Functions with snapshot fallback, in this order: space-weather banner (DONKI), related studies (OSDR), radiation panel (RadLab).
5. **M5** — About / Data sources / AI use page, accessibility pass, README.

Commit and deploy at the end of each milestone. The app must be usable after M2 even if later milestones are cut.

## 10. Done means

- The public URL opens without login, in a private window, on desktop and phone.
- "Load demo mission" shows all three status colors, at least one trend alert, and the charts.
- Every NASA statement on screen has a source link; every NASA data panel shows Live or Snapshot.
- The README lists data sources, how to run locally, and the AI tools used.
