# CS Dashboard — Full Project Handover Document
*Generated: 18 March 2026. Use this document to resume the project in a fresh session with zero context loss.*

---

## 1. PROJECT PURPOSE

This is an internal **Customer Service Dashboard** for an Australian e-commerce company that sells arcade machines, pool tables, pinball machines, and similar entertainment products. The company uses **Gorgias** as their helpdesk/ticketing system.

**Problem it solves:** The CS team (currently Pauline and Justin) had no easy way to review their ticket data — volume trends, recurring issues, courier failures, ops faults, refunds, product-line breakdowns — without manually digging through Gorgias. This dashboard pulls live data from Gorgias and presents it in a structured, role-specific reporting format.

**Who uses it:** Internal team only. Access is restricted to approved Google accounts via Supabase Auth + Google OAuth.

**Live URL:** Deployed on Vercel (exact URL not stored here — check the user's Vercel dashboard or their `.env.local`).

**GitHub repo:** The folder `cs-dashboard` is pushed to GitHub and connected to Vercel for auto-deploy on every push to `main`.

---

## 2. CURRENT STATE

### ✅ Working / Fully Built

- **Authentication** — Google OAuth via Supabase. Users hit `/login`, sign in with Google, get redirected to `/dashboard`. Unauthorised users are blocked. Sign-out works.
- **Run Report** — The core "fetch and render" action. User selects a period (7/14/30/60/90 days), clicks Run Report, and the dashboard fetches all tickets from Gorgias (paginated), resolves custom field IDs, then renders all sections. Shows a progress overlay with log lines while loading. Auto-refreshes every 60 minutes with a countdown timer.
- **Overview section** — Total tickets, status breakdown (open/closed/pending), delta chips comparing vs previous period, average resolution time, agent filter bar (filter by Pauline / Justin / All), period comparison badge.
- **Product sections** — Pool Tables, Gao Arcades, Kelvin Pinball. Each is a separate sidebar section that filters tickets by the Product custom field and shows status counts, breakdown by contact reason, delta vs prev period.
- **Courier Issues section** — Filters tickets by configurable contact reasons (set in Settings). Shows breakdown by courier/reason.
- **Ops Issues section** — Same pattern as Courier Issues, with its own configurable filter list.
- **Refunds & Replacements section** — Filters by refund-related contact reasons. Shows refund amounts summed from custom fields, breakdown by type.
- **MoM Comparison section** — Side-by-side comparison of two user-defined date ranges. Uses the React `DashboardApp` component's own fetch (`fetchTickets`), not the module-level `runReport` function.
- **Custom Sections** — Users can create custom report sections from Settings. Each section has a label, icon, optional product filter, and any number of custom blocks.
- **Custom Blocks** — Within any section, users can add blocks that filter by a Gorgias custom field value and optionally group by another field. Supports `::` hierarchical values (e.g. `WISMO::Item Delayed::Ops fault`) with configurable depth (full path / first N levels / last segment).
- **Settings Panel** — Full UI for configuring field name mappings, courier/ops filter lists, adding/editing/deleting custom sections and blocks, drag-and-drop reordering of filter values.
- **Field name mappings** — Because Gorgias custom field labels vary per account, all field names (Product, Contact Reason, Order Number, etc.) are configurable in Settings and saved to localStorage as `__dashConfig`.
- **Export PDF** — Browser print, styled with `@media print` CSS. Injects a print header (section name + date range).
- **AI Insights section** — Sends a structured summary of the current report data to the Anthropic API (`/api/ai-report`) and renders the markdown response. Has a Generate button and displays the report with a "Generated at" timestamp.
- **Spam/deleted ticket filtering** — Gorgias API call now includes `&spam=false` so deleted inbound emails (not real CS tickets) are excluded.
- **Error banner** — Fixed/centred overlay at top of screen for report errors. Shows specific error messages from both the Gorgias fetch and Anthropic API.

### ⚠️ Partially Working / Unresolved

- **AI Insights — 404 model error**: The Anthropic model has been changed three times trying to resolve a 404:
  1. `claude-3-5-haiku-20241022` → 404
  2. `claude-3-haiku-20240307` → 404
  3. `claude-haiku-4-5-20251001` → most recent attempt, **not yet confirmed working** — user needs to push and test

  The error message now shows the full Anthropic error detail (not just the status code), so the next test will reveal exactly what Anthropic is complaining about. Current model in `pages/api/ai-report.js` is `claude-haiku-4-5-20251001`.

  **Likely cause:** The user's Anthropic API key may only have access to a specific set of models. All three attempted models returned 404. If `claude-haiku-4-5-20251001` also fails, try `claude-sonnet-4-6` next.

### 🔲 Not Yet Started

- **Supplier Evidence Reports** (next priority — documented in README.md Roadmap): Export a PDF/Word report for a date range that includes order numbers, order details, photos attached to the ticket, ticket descriptions, and resolution notes — grouped by supplier. Goal: hand the report directly to a supplier as formal documented evidence of recurring product defects.

---

## 3. FILE AND FOLDER STRUCTURE

```
cs-dashboard/
├── pages/
│   ├── _app.js                  # Next.js app wrapper — just imports globals.css
│   ├── index.js                 # Root route — checks auth, redirects to /dashboard or /login
│   ├── login.js                 # Login page — Google OAuth button via Supabase
│   ├── dashboard.js             # THE MAIN FILE — entire dashboard UI and logic (~1800 lines)
│   └── api/
│       ├── tickets.js           # API route: proxies Gorgias ticket list to client
│       ├── custom-fields.js     # API route: proxies Gorgias custom fields list to client
│       └── ai-report.js        # API route: sends report summary to Anthropic, returns markdown
├── lib/
│   └── supabaseClient.js        # Creates and exports the Supabase client (browser-side)
├── styles/
│   └── globals.css              # Minimal global reset; almost all styles are inline in dashboard.js
├── .env.local                   # Local secrets (NOT committed to git)
├── .env.local.example           # Template showing required env var names (committed)
├── package.json                 # next@14, react@18, @supabase/supabase-js@2
├── README.md                    # Setup guide + Roadmap section (Supplier Evidence Reports)
└── HANDOVER.md                  # This file
```

### How the files connect

```
Browser
  └─ /login        → pages/login.js        → supabase.auth.signInWithOAuth (Google)
  └─ /             → pages/index.js        → redirects based on session
  └─ /dashboard    → pages/dashboard.js
       ├─ React layer: Dashboard() component handles auth check, exposes authFetch/authPost
       ├─ DashboardApp() component: all React UI (settings panel, topbar, sidebar, section views)
       ├─ Module-level JS (non-React): all rendering functions, state, runReport, fetchAllTickets
       │    These functions are assigned to window.__ in useEffect so inline HTML onclick handlers can call them
       ├─ /api/tickets          → pages/api/tickets.js     → Gorgias API (tickets list)
       ├─ /api/custom-fields    → pages/api/custom-fields.js → Gorgias API (field definitions)
       └─ /api/ai-report        → pages/api/ai-report.js   → Anthropic API (claude model)
```

---

## 4. KEY DECISIONS MADE

### Architecture: Mixed React + Module-level JS
**Decision:** The dashboard uses React for the settings panel UI (complex interactive forms) but uses plain module-level JavaScript functions for all the report rendering (which generates raw HTML strings injected into `div` containers).

**Why:** The report sections contain a LOT of dynamic HTML built from ticket data. Rebuilding all of it as React components would be a large rewrite. The hybrid approach lets React handle stateful settings UI while vanilla JS handles rendering. The module-level functions are assigned to `window.__xxx` in `useEffect` so that inline `onclick` attributes in the generated HTML can call them.

**Critical lesson learned (from a previous bug):** All dashboard functions MUST be at module level (compiled by Next.js/SWC). An earlier approach stored all the logic as a template literal string (`const DASHBOARD_LOGIC = \`...\``) and injected it as a `<script>` tag at runtime. This worked locally but silently failed in Vercel's production environment — the script injection was blocked. The fix was to convert everything to proper module-level JavaScript. **Never go back to the script injection approach.**

### Authentication: Supabase + Google OAuth
**Decision:** Supabase handles auth with Google OAuth. Every API call from the client attaches the Supabase JWT (`Authorization: Bearer <token>`). Server-side API routes verify the token using `supabase.auth.getUser(token)` with the service role key.

**Why:** Simple to set up, handles token refresh, and Supabase's Row Level Security could be used later. The service role key on server side means the verification is authoritative (not just trusting the client's claimed identity).

### API Proxy Pattern
**Decision:** All Gorgias and Anthropic API calls go through Next.js API routes (`/api/tickets`, `/api/custom-fields`, `/api/ai-report`) rather than calling those APIs directly from the browser.

**Why:** Keeps API credentials (Gorgias token, Anthropic key) server-side only, never exposed to the browser. Also means CORS is not an issue.

### Config in localStorage
**Decision:** Dashboard configuration (field name mappings, courier/ops filter lists, custom sections/blocks) is stored in `localStorage` under key `__dashConfig`.

**Why:** No database schema needed, instant reads, persists across sessions. Acceptable trade-off given this is a single-team internal tool. If multi-user config sync is ever needed, it would need to move to Supabase.

### Pagination Strategy
**Decision:** The client paginates through ALL Gorgias tickets (100 per page) ordered by `created_datetime:desc`, stopping when it hits a ticket older than the selected lookback period × 2.

**Why:** Gorgias doesn't support date-range filtering on the list endpoint (or the filter syntax wasn't reliable). Fetching newest-first and stopping at the cutoff is reliable. The ×2 multiplier fetches both "current period" and "previous period" data in one pass so comparisons work.

### Spam Filter
**Decision:** Added `&spam=false` to the Gorgias API query in `pages/api/tickets.js`.

**Why:** Gorgias was returning deleted/spam inbound email tickets that aren't real CS tickets, inflating counts significantly. The actual ticket count should be ~300 total with ~50 open. The `spam=false` parameter tells Gorgias to exclude spam/deleted tickets.

---

## 5. EXACT CURRENT PROGRESS

**Last thing completed:** Added `&spam=false` to the Gorgias tickets API to exclude deleted/spam tickets (commit `a72a1c2`).

**Latest git log (most recent first):**
```
a72a1c2  fix: exclude spam/deleted tickets from Gorgias fetch
d7f27e5  docs: add supplier evidence reports to roadmap
5ab02dc  fix: switch to claude-haiku-4-5-20251001 model
e9ad7fc  fix: surface Anthropic error details in AI report response
f546ce3  fix: use claude-3-haiku-20240307 model (fixes 404 on AI Insights)
18c9737  fix: replace script injection with module-level JS
5fe2d2f  fix: resolve Run Report script injection failure
2c854c7  debug: improve error visibility for Run Report failures
b799129  fix: pass authPost as prop to DashboardApp (fixes client-side crash)
befda1f  fix: revert authFetch to original signature, add separate authPost
e67b3b0  fix: move print-header inside #main + guard renderAIReport
01a773a  feat: PDF Export + AI Insights reporting
...
```

**Very next thing to do:**
1. Push pending commits to GitHub: `git push origin main` (the user needs to do this from their Mac terminal — Claude's VM cannot push to GitHub due to network restrictions)
2. After Vercel redeploys (~1 min), test AI Insights again
3. If `claude-haiku-4-5-20251001` still returns 404, try `claude-sonnet-4-6` in `pages/api/ai-report.js` line 59
4. Once AI Insights is confirmed working, begin **Supplier Evidence Reports** (see Roadmap below)

---

## 6. KNOWN ISSUES AND BLOCKERS

### AI Insights — 404 model error (UNRESOLVED)
- **File:** `pages/api/ai-report.js`, line 59
- **Current value:** `model: 'claude-haiku-4-5-20251001'`
- **Symptom:** Anthropic API returns HTTP 404 with message referencing the model name
- **Root cause theory:** User's Anthropic API key may only have access to newer Claude 4.x/4.5 models, but the exact right model string hasn't been found yet. Both Claude 3 Haiku variants returned 404.
- **What to try next:** If `claude-haiku-4-5-20251001` also fails, try `claude-sonnet-4-6`. The error message now shows the full Anthropic error detail in the UI (not just "404") so the next failure will be more informative.
- **Alternative if all models fail:** The user may need to check their Anthropic console (console.anthropic.com) to see which models their API key has access to.

### git push restriction
- Claude's VM cannot `git push` to GitHub due to proxy/network restrictions in the sandbox environment.
- **Workaround:** User must always run `git push origin main` from their own Mac terminal after Claude commits changes.

### Ticket counts before spam filter
- Before the `&spam=false` fix (commit `a72a1c2`), the dashboard was pulling in deleted/spam inbound emails, making counts far higher than actual. The fix is committed but needs to be pushed and tested.

---

## 7. DEPENDENCIES

### Runtime / Deployment
- **Next.js 14** (Pages Router — NOT App Router)
- **React 18**
- **@supabase/supabase-js v2**
- **Vercel** — hosting, auto-deploys from GitHub `main` branch
- **Node.js** — via Vercel serverless functions

### External APIs
- **Gorgias** — helpdesk/ticketing system. Used via REST API (Basic auth: email + API token)
  - Endpoints used: `GET /api/tickets`, `GET /api/custom-fields`
  - Pagination: cursor-based via `meta.next_cursor`
- **Anthropic API** — for AI Insights report generation
  - Endpoint: `POST https://api.anthropic.com/v1/messages`
  - API version header: `anthropic-version: 2023-06-01`
- **Supabase** — authentication only (not used as a database for app data)
  - Google OAuth provider configured in Supabase project
- **Google OAuth** — for login (configured in Google Cloud Console)
- **Google Fonts** — Syne (headings), DM Sans (body), JetBrains Mono (data)

### Environment Variables (all must be set in Vercel dashboard)
```
NEXT_PUBLIC_SUPABASE_URL          # e.g. https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key (server-side only)
GORGIAS_DOMAIN                    # e.g. yourstore.gorgias.com
GORGIAS_EMAIL                     # Email address for Gorgias Basic Auth
GORGIAS_TOKEN                     # Gorgias API token
ANTHROPIC_API_KEY                 # Anthropic API key (for AI Insights)
```

### Local Development
- `.env.local` file (not committed) holds the same values for `npm run dev`
- `npm install` to install dependencies
- `npm run dev` to run locally at `http://localhost:3000`

---

## 8. ROADMAP (Next Features)

### Supplier Evidence Reports (next priority)
Export a formatted PDF/Word report for a selected date range that includes:
- Order number + order details (product, customer, date) — from Gorgias custom fields
- Photos attached to the ticket (photo evidence of the defect/issue) — from Gorgias ticket messages/attachments
- Ticket description and resolution notes
- Grouped by supplier so the report can be handed directly to the supplier as a formal evidence package
- Goal: give suppliers clear, documented proof of recurring product issues to hold them accountable

**Implementation notes to think about:**
- Will need to fetch ticket messages/attachments from Gorgias (`GET /api/tickets/{id}/messages`) to get photo URLs
- The PDF/Word export will need a new API route (probably `/api/supplier-report`) that fetches full ticket data including attachments
- Can use a library like `pdfmake`, `puppeteer`, or `@react-pdf/renderer` for PDF generation server-side
- Or: generate an HTML report that the user prints to PDF (simpler, consistent with current "Export PDF" approach)

---

## 9. THE FIRST PROMPT

Copy and paste this exactly into a fresh Claude Code / Cowork session under the new Team account:

---

> I'm resuming work on a project called **cs-dashboard** — an internal customer service reporting dashboard for an Australian e-commerce company (sells arcade machines, pool tables, pinball machines). The project folder is already mounted and you should be able to read it. Please start by reading `HANDOVER.md` in the project root — it has full context for everything built so far, all known issues, and exactly where we left off.
>
> After reading HANDOVER.md, here is the current status:
>
> **Two things need doing right now:**
>
> 1. **AI Insights is returning a 404 from the Anthropic API.** The model in `pages/api/ai-report.js` is currently `claude-haiku-4-5-20251001`. If this still returns 404 after a fresh deploy, we need to try `claude-sonnet-4-6` next, or ask me to check the Anthropic console for which models my API key can access. The error detail is now shown in the UI (not just "404") so we'll be able to see exactly what Anthropic says.
>
> 2. **Spam/deleted ticket filter** — a `&spam=false` param was added to the Gorgias API call in `pages/api/tickets.js`. This needs to be pushed and tested — it should bring the total ticket count down to ~300 (from a much higher inflated number) with ~50 open tickets split between Pauline and Justin.
>
> **Note:** I need to run `git push origin main` from my own terminal — please just commit any changes you make and tell me to push.
>
> Once those two issues are resolved, the next major feature to build is **Supplier Evidence Reports** — details are in the HANDOVER.md Roadmap section and in README.md.
>
> The project uses: Next.js 14 Pages Router, React 18, Supabase Auth (Google OAuth), Gorgias API (helpdesk), Anthropic API (AI insights). Deployed on Vercel. All dashboard logic is in `pages/dashboard.js`. Never use script injection / dynamic `<script>` tag creation — all JS must be at module level and assigned to `window.__xxx` in a `useEffect`.

---

*End of handover document.*
