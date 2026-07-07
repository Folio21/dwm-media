# Lead Finder + Site Builder — Build Spec
**Owner:** David Meeks / DWM Media
**Purpose:** Internal-only tool to replace manual lead research + speed up cold outreach. Not a client-facing product.
**Hand-off target:** Claude Code (iterative build, runs locally / on VPS)
---
## 1. What this is
A two-part internal web app:
1. **Lead Finder** — search local businesses by category + city, see who lacks a website, track call status. Replaces the manual `places_search` workflow + Excel tracker with one live tool.
2. **Site Builder** — has two distinct modes:
   - **Build Demo Website** — auto-generate a pitch-ready landing page for any lead, used during/after a cold call to sell the prospect. Fast, AI-generated, not functional (no real backend).
   - **Build Real Website** — available only on converted clients, generates the actual paid deliverable matching whichever package (Starter/Growth) and add-ons they bought, with genuinely working forms, booking, e-commerce, and chatbot where purchased.
Modeled on the workflow demonstrated in a reference video (tool: "SiteDrop AI" — Lead Finder + Landing Page Builder combo). We are not cloning their product or business — just borrowing the workflow shape for personal use. The Demo/Real split is David's own addition to make sure the tool never delivers something to a paying client that doesn't actually work.
---
## 2. Tech stack (recommended)
- **Frontend:** React + Vite, Tailwind CSS
- **Backend:** Node.js (Express) or Next.js API routes — either works, pick whichever Claude Code defaults to for speed
- **Database:** SQLite for local/single-user (this is a one-person internal tool — no need for Postgres/multi-tenant complexity)
- **Lead data source:** Google Places API (Places API (New) — Text Search + Place Details)
- **Demo site generation:** Anthropic API (Claude Sonnet) — generate static HTML/CSS pages from a prompt
- **Real site generation (Phase 4 only):** Anthropic API for content/design, plus real backend components:
  - Email notifications — Resend or similar (for contact form / booking confirmations)
  - Stripe Checkout — only when a client's package includes e-commerce
  - File storage for photo galleries — local disk is fine at this scale, no need for S3
- **Hosting:** Run locally during active use; optional later deploy to David's DigitalOcean VPS (same box as Jarvis/Kalshi bot) for always-on access from phone
No auth system needed for the internal tool itself — single user, local/VPS use only. Skip user accounts, billing, multi-tenancy entirely for David's own access. (Stripe is for client e-commerce sites' checkout flow, not for the internal tool.)
---
## 3. Feature spec — Part 1: Lead Finder
### Search
- Input: business category (free text or dropdown of common categories — HVAC, plumbing, roofing, garage door, landscaping, gyms, med spas, barbershops, salons) + city/region (default: Orlando/Seminole County, but allow any city)
- Calls Google Places Text Search API: `"{category} in {city}, FL"`
- Returns up to 20-60 results per search (paginate if the API supports it)
### Results table/cards
For each business, display:
- Name
- Category
- Phone number
- Address
- Rating + review count
- Hours (open/closed now)
- **Website status** — this is the key filter:
  - Places API returns a `website` field if one exists in their Google Business Profile
  - If `website` is null/missing → flag as **"No website — perfect pitch"**
  - If present → fetch the URL and do a quick sanity check (does it resolve? is it a placeholder/parked domain?) — flag as **"Has website"** but still allow chatbot pitch path
- Call status dropdown: Not called / No answer / Voicemail / Sent pricing / Callback / Not interested / Booked (same categories as the existing Excel tracker — replicate that logic here)
- Notes field (free text)
### Filters
- All / No website / Has website / Called / Not called
- Sort by: rating, review count, distance (if location provided)
### Persistence
- Store all fetched leads + call status + notes in SQLite so re-searching the same city doesn't lose progress
- Simple table: `leads(id, name, category, city, phone, address, rating, review_count, website_url, has_website, call_status, notes, created_at, updated_at)`
---
## 4. Feature spec — Part 2: Site Builder
The Site Builder has two distinct modes, triggered by two separate buttons. These are NOT the same feature with different prompts — they produce fundamentally different outputs and have different gating logic. Do not let these blur together during implementation.
### Button 1: "Build Demo Website"
**Available on:** any lead, any time (no client status required)
**Purpose:** cold-call / pitch artifact — a fast, throwaway mockup used to sell the prospect, not a deliverable
- Click → auto-fills an AI prompt with that business's name/category/rating/contact info
- Sends prompt to Anthropic API (Claude Sonnet), generates a single self-contained HTML file (inline CSS, no backend, no real functionality — forms don't submit anywhere real, booking widgets are visual only)
- Preview renders in an iframe immediately
- This is exactly the original "Site Builder" feature already specced below — kept as-is, just relabeled as "Build Demo Website" to distinguish it from Button 2
**Prompt template — no website:**
```
Build a modern, mobile-first landing page for "{business_name}", a {category}
business in {city}, FL. This business currently has no website — this is a
pitch-ready demo to show them what they're missing. Make it look premium,
trustworthy, and conversion-focused. Include: hero section with a clear
headline and CTA (call now / book now), services list, why-choose-us section,
star rating badge if rating is {rating}+, contact info ({phone}, {address}),
and a contact/booking form. Use a color palette appropriate for {category}
businesses. Keep it to a single page.
```
**Prompt template — has website (chatbot/redesign pitch):**
```
Build a modern landing page mockup for "{business_name}", a {category}
business in {city}, FL, to demonstrate what an upgraded site + AI chatbot
could look like. Include a hero section, an embedded-style chat widget
mockup in the corner, services list, and contact info ({phone}, {address}).
Make it look like a clear upgrade over a typical small-business website.
```
**Important honesty constraint:** the demo's forms, booking widgets, and chatbot mockups are visual only — they do not submit data anywhere or send notifications. This is fine for a pitch demo (the prospect is looking at it, not using it), but Demo output must never be delivered to a client as their final site. That's what Button 2 is for.
---
### Button 2: "Build Real Website"
**Available on:** client records only — grayed out / hidden on leads that haven't been marked as a client yet, since this needs to know what package they actually bought
**Purpose:** the actual paid deliverable. This has to genuinely do what DWM Media's pricing sheet promises for that client's tier — not a prettier mockup.
This is a meaningfully bigger feature than Button 1 and should not be built until Phase 1-3 (Lead Finder, Demo Builder, Client Tracking) are working. See Section 5 build order.
#### What "real" requires per feature (be honest about scope — see table below)
| Pricing-sheet feature | What "fully functional" actually means | Build complexity |
|---|---|---|
| Custom design / mobile responsive | AI-generated or templated HTML/CSS, no backend needed | Low — same as Demo |
| Contact form | Form submission must actually go somewhere — write to SQLite + send David an email/notification (via Resend or similar) | Low-Medium |
| Google Maps embed | Static embed using the business address — no API key even needed for basic embed | Low |
| Online booking / inquiry system | Needs a real backend: store bookings in SQLite, show available slots, send confirmation. NOT a full calendar sync (no Google Calendar integration in v1) — just a working request-and-confirm flow | Medium |
| Photo gallery | Static image upload/display — David or the client provides photos, store as files or URLs | Low |
| Basic/Advanced SEO | Real meta tags, sitemap.xml, proper heading structure, page speed basics — these are actually just "build it correctly," not a separate system | Low |
| E-commerce / online store | Needs Stripe Checkout integration for this to be real — cannot fake taking payment. If Stripe isn't connected yet for a given client, this feature should be explicitly marked "pending setup" rather than shipped fake | Medium-High |
| Email capture integration | Real form → stores email in SQLite or sends to an email service (Resend/Mailchimp-style) — same backend as contact form | Low-Medium |
| AI chatbot | Embed the actual chatbot widget being built for DWM's chatbot product (Claude API-powered) — reuse that work here rather than building a second chatbot | Medium (mostly reuse) |
#### Flow
1. On a client record, click **"Build Real Website"**
2. Tool reads the client's `service_type` and line items (from Section 9 client data) to know exactly which features apply — e.g. a Starter client gets contact form + booking + gallery + SEO; a Growth client additionally gets e-commerce + chatbot + email capture
3. Tool assembles the site from real, working components (not a single AI-generated HTML blob):
   - Use a small internal template/component library (one for each feature in the table above) rather than asking the AI to invent backend logic from scratch
   - AI (Claude Sonnet) is used for content generation and design customization — page copy, color scheme, layout choices, business-specific text — layered on top of the working components, not for generating the booking/payment/email logic itself
4. Output is a real small web app (not a single static HTML file): needs its own backend routes for form submissions, bookings, and (if purchased) Stripe checkout
5. Preview tab shows the live working site; there is no "Code" tab in the same sense as Demo mode, since this is a multi-file app, not one HTML file
6. **Deploy step:** unlike Demo (preview-only), Real sites need actual hosting per client — either:
   - A subdomain/path on infrastructure David controls (e.g. `clientname.dwmsites.com` or similar), or
   - Export as a deployable package the client can host themselves
   - Pick one approach and stay consistent — don't build both in v1
#### Explicit scope guardrail
If a client's purchased package includes a feature not yet built in the component library (e.g. Stripe isn't wired up yet but they bought e-commerce), the tool should clearly flag that feature as "not yet available — build manually" rather than silently generating a fake/non-functional version. **Never let this tool produce something that looks done but doesn't work** — that's the exact gap this two-button split exists to prevent.
---
### Shared infrastructure (both buttons)
- Save generated sites to SQLite: `sites(id, lead_id, client_id, mode, html_content_or_app_path, prompt_used, created_at)` — `mode` is `demo` or `real`, `client_id` is null for demo-only sites
- "Get shareable link" for Demo mode — host at `/preview/{site_id}` so David can text the live demo link
- Real sites get their actual deployed URL once live, stored on the client record
---
## 5. Build order (phases)
**Phase 1 — Lead Finder only**
- Search form → Google Places call → results table → SQLite persistence → call status tracking
- This alone replaces the Excel tracker and is useful standalone
**Phase 2 — Demo Site Builder**
- Add "Build Demo Website" button → prompt template → Anthropic API call → HTML generation → preview iframe
- This is the fast, pitch-only version — no backend functionality required
**Phase 3 — Client & Revenue Tracking**
- Add a simple "Clients" view, separate from the Leads table, for tracking actual signed business
- See Section 9 below for full spec
- Build this once Phase 1 + 2 are working — it's the natural next step once leads start converting
- Required before Phase 4, since "Build Real Website" needs client + package data to exist
**Phase 4 — Real Website Builder**
- The biggest single phase — build the component library (contact form backend, booking flow, photo gallery, SEO basics, email capture) one feature at a time, matching the table in Section 4
- Add Stripe Checkout integration only when a client actually needs e-commerce — don't build it speculatively
- Reuse the DWM chatbot widget (separate product work) rather than building a second chatbot here
- Add the "Build Real Website" button on client records once enough of the component library exists to honestly cover at least the Starter tier end-to-end
**Phase 5 (optional) — Polish**
- Shareable preview links for Demo mode
- Export/print lead list
- Move from local to VPS for phone access
- Per-client hosting/deployment automation
Do not build later phases until earlier ones are working and actually being used — avoid over-building before validating the workflow saves real time. Phase 4 in particular should be built incrementally, feature by feature, rather than attempted all at once.
---
## 6. API keys / credentials needed
- Google Places API key (Places API (New) enabled in Google Cloud Console — billing required, but cost is low at this volume; first $200/month is typically free credit)
- Anthropic API key (already in use for Jarvis — reuse the same key/account)
Both should be stored in a local `.env` file, never committed to git if this ever touches a repo.
---
## 7. Explicit non-goals
- No multi-user support, no login system for the internal tool itself
- No billing/payments for David's own use of the tool (Stripe is only used inside client-facing Real Websites that include e-commerce — not for the internal app)
- No CRM features beyond simple status + notes (don't rebuild HubSpot)
- No mobile app — responsive web is enough, accessed via phone browser
- Not being built as a product to sell or license — internal tool only
- No calendar sync (Google Calendar, etc.) in v1 booking flow — just a simple request-and-confirm system
---
## 8. Notes for Claude Code
- This is meant to be built iteratively — start with Phase 1, get it running, confirm it works with real Orlando searches, then move to Phase 2.
- Reuse the existing call-status categories David already uses in his Excel tracker (Not called / No answer / Voicemail / Sent pricing / Callback / Not interested / Booked) for consistency.
- Keep the UI fast and minimal — this is a working tool for one person, not a polished SaaS product. Prioritize function over design polish.
- David's other active projects (Jarvis, Kalshi bot) run on a DigitalOcean VPS — if/when this moves off localhost, it can likely share that same VPS rather than needing new infrastructure.
---
## 9. Client & Revenue Tracking
Once a lead converts, it should move out of the "Leads" pipeline into a separate **Clients** view that tracks actual signed business and recurring revenue — this is the layer that turns the tool from a call tracker into a lightweight business dashboard.
### Data model
New table: `clients(id, lead_id, business_name, category, city, phone,
  service_type, one_time_amount, monthly_retainer_amount,
  start_date, status, notes, created_at, updated_at)`
- `lead_id` links back to the original lead record (so you can see the full history: found → called → pitched → closed)
- `service_type` — Website / Website + Management / Ads Management / App Build / Chatbot / Bundle (matches the DWM Media pricing sheet packages)
- `status` — Active / Paused / Cancelled
- A client can have multiple line items if they bought a bundle (e.g. website + chatbot + ads) — either store as a JSON field listing each service + amount, or a separate `client_services` child table if you want cleaner reporting later. Start with the simpler JSON field unless reporting needs force the split.
### "Convert lead to client" action
- Button on a lead card: **"Mark as Client"**
- Opens a small form pre-filled with business name/phone/address from the lead
- David fills in: service(s) sold, one-time amount, monthly retainer amount (if any), start date
- Creates the client record, updates the original lead's `call_status` to "Booked"
### Clients dashboard view
Simple table/card view showing all current clients:
- Business name, category, service type(s)
- One-time revenue collected
- Monthly retainer amount
- Status (Active/Paused/Cancelled)
- Start date / how long they've been a client
### Revenue summary (top of Clients view, or a small dashboard widget)
Calculate and display:
- **Total one-time revenue** — sum of all `one_time_amount` across all clients (all-time)
- **Total active monthly recurring revenue (MRR)** — sum of `monthly_retainer_amount` for clients where `status = 'Active'`
- **Total clients** — count, split out Active vs Paused vs Cancelled
- **Projected annual recurring revenue** — Active MRR × 12 (simple, useful sanity-check number)
Optional, only if easy to add: a basic month-over-month chart of new clients signed and MRR growth — nice to have, not required for v1.
### Why this matters
This gives David a single place to see, at a glance: how many calls turned into real clients, what the business is actually worth in revenue terms, and which service lines (website vs ads vs chatbot vs app) are converting best — useful for deciding where to focus pitching effort over time.
---
## 10. Jarvis integration (build for this from day one, even though wiring happens later)
David's Jarvis assistant (Claude API + Whisper + Piper + Chroma, phone-first tap-to-talk) will eventually need to call this tool by voice — e.g. "find me HVAC leads in Sanford" or "build a site for that barbershop." Jarvis's own build order is voice loop → memory → tools → scheduler → agents, so this slots in at the **tools** phase, not immediately.
To avoid retrofitting later, build with this in mind now:
- **Expose core actions as simple REST endpoints**, not just UI-driven actions buried in frontend code:
  - `POST /api/search-leads` — body: `{category, city}` → returns lead list
  - `POST /api/leads/{id}/status` — body: `{call_status, notes}` → updates a lead
  - `POST /api/leads/{id}/build-demo-site` — generates and returns the demo pitch site (HTML + preview URL)
  - `GET /api/leads` — list/filter existing leads
  - `POST /api/leads/{id}/convert-to-client` — body: `{service_type, one_time_amount, monthly_retainer_amount, start_date}` → creates client record
  - `GET /api/clients` — list all clients with status filter
  - `POST /api/clients/{id}/build-real-site` — triggers the real site build for that client based on their purchased package (Phase 4 feature — only meaningful once the component library exists)
  - `GET /api/revenue-summary` — returns total one-time revenue, active MRR, projected ARR, client counts by status (so Jarvis can answer "what's my MRR right now" by voice)
- Keep these endpoints clean and callable independent of the frontend, so Jarvis's tool layer can hit them directly (likely as internal HTTP calls if co-located on the same VPS).
- No auth needed between Jarvis and this app if they're on the same private VPS network — just bind the API to localhost/internal network, not the public internet, until there's a real reason to expose it externally.
- Return clean, structured JSON (not HTML fragments) from these endpoints so Jarvis can read results back via voice (e.g. summarize "found 14 HVAC leads in Sanford, 9 without websites").
### Deployment sequencing
1. Build and test Phase 1 + 2 locally first — fastest iteration, no deployment friction.
2. Once working, deploy to the same DigitalOcean VPS Jarvis runs on (separate process/port, or containerized) rather than provisioning new infrastructure.
3. Wire into Jarvis's tool layer only once Jarvis itself reaches its "tools" build phase — don't block this app's usefulness on that timeline. It's fully usable standalone via browser in the meantime.
