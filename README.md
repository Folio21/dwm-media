# Lead Finder + Site Builder

Internal tool — Phase 1 (Lead Finder) and Phase 2 (Demo Site Builder) are implemented. See `BUILD_SPEC.md` for the full plan (Phases 3-5).

## What's here

- `server/` — Express backend, JSON-file storage (`server/data/leadfinder.json`). Calls Google Places API (New) Text Search for leads and the Anthropic API to generate pitch demo sites. Exposes the REST endpoints listed in the build spec's Jarvis-integration section.
- `client/` — React + Vite + Tailwind frontend. Search form, results table with website-status flag, call-status tracking, notes, filters, sort, and a "Build Demo Website" button with live preview.

## Setup

### 1. Google Places API key

In Google Cloud Console: enable **Places API (New)**, create an API key, restrict it to that API (under **API restrictions**, not **Application restrictions** — leave application restrictions at "None" for a local server-side app like this). Billing must be enabled on the project (low cost at this volume — Google's free monthly credit typically covers it).

### 2. Anthropic API key

Reuse the same key used for Jarvis (or create one at console.anthropic.com). Needed for the Demo Site Builder (Phase 2).

### 3. Unsplash API key (optional, adds real photos to demo sites)

Free account at unsplash.com/developers → "New Application" → copy the **Access Key**. No billing needed at this scale. If you skip this, demo sites just generate without photos — nothing breaks.

### 4. Backend

```bash
cd server
npm install
cp .env.example .env
# edit .env and paste in GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY, and (optionally) UNSPLASH_ACCESS_KEY
npm run dev
```

Runs on `http://localhost:4000`. Leads and generated demo sites are stored in `server/data/leadfinder.json` (plain JSON file — no native database module, so there's nothing to compile).

### 5. Frontend

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api` calls to the backend.

Open `http://localhost:5173`, search a category + city. Leads persist in `server/data/leadfinder.json` — re-searching the same city won't lose your call status / notes.

## Using the Demo Site Builder

Click **"Build Demo Website"** on any lead row. It sends a pitch-page prompt to Claude (different wording depending on whether the lead has a website already, per the build spec), generates a single-page HTML mockup, and opens a preview modal. From there you can open it in a new tab or copy the shareable link (`http://localhost:4000/preview/{id}`) to text to the prospect.

These are pitch artifacts only — forms, booking widgets, and chat mockups are visual and don't submit anywhere real. Never send a demo link to a client as their actual delivered site; that's what the (not-yet-built) Phase 4 "Build Real Website" is for.

## API endpoints

**Phase 1 — Leads**
- `POST /api/search-leads` `{category, city}` — searches Google Places, upserts leads, returns them
- `GET /api/leads` `?city=&category=&filter=no_website|has_website|called|not_called&sort=rating|reviews` — list/filter
- `POST /api/leads/:id/status` `{call_status, notes}` — update tracking fields
- `POST /api/leads/:id/check-website` — best-effort liveness/parked-domain check on an existing lead's website

**Phase 2 — Demo Site Builder**
- `POST /api/leads/:id/build-demo-site` — generates a demo pitch site for a lead, returns `{site_id, html, preview_url}`
- `GET /api/sites/:id` — fetch a previously generated site's metadata
- `GET /preview/:id` — plain HTML response of the generated site (shareable link, not JSON)

Matches the endpoint shapes specced for future Jarvis voice integration (Section 10 of the build spec) — no changes needed there when that phase starts.

## What's not built yet

Per the build spec's phased order: Client/Revenue tracking (Phase 3), Real Website Builder (Phase 4), and deployment/polish (Phase 5). The `clients` and `sites` collections already exist in the JSON store so Phase 3/4 won't need a data migration, but no routes or UI for Clients exist yet.

## Known gaps / things to sanity-check

- Google's Places API "parked domain" detection in `checkWebsiteHealth` is a basic text-match heuristic, not exhaustive — treat it as a hint, not ground truth.
- Pagination pulls up to 3 pages (~60 results) per the spec's range; Google enforces a short delay before a `nextPageToken` is valid, which is handled but adds a couple seconds per page.
- Demo site generation calls Claude with `max_tokens: 24000` and now rejects truncated/incomplete HTML with an error instead of saving it — if a build fails with a "cut off" error, just retry; it usually succeeds.
- Demo site images come from the Unsplash API, keyed off the lead's `category` (e.g. "HVAC business professional"). If `UNSPLASH_ACCESS_KEY` isn't set, or the Unsplash call fails, the prompt tells Claude to skip images rather than invent fake URLs.
- The `/preview/:id` link is only reachable on your local network right now (`http://localhost:4000/...`) — it'll need real hosting once this moves to the VPS (Phase 5) before it's usable as an actual text-to-a-prospect link from outside your machine.
- No tests yet — this was hand-built for speed per the spec's "function over polish" instruction.
