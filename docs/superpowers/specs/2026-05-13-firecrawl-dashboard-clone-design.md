# fire-enrich Dashboard — firecrawl.dev Clone Design

**Date:** 2026-05-13  
**Branch:** claude/determined-gagarin-db63b9  
**Status:** Approved

---

## Goal

Redesign the fire-enrich Next.js web app (`apps/web/`) to look and feel identical to the firecrawl.dev dashboard, connected to the user's self-hosted Firecrawl instance via existing `FIRECRAWL_API_URL` + `FIRECRAWL_API_KEY` environment variables.

---

## Visual Design System

### Colors (replacing current fire-enrich theme)
| Token | Value | Use |
|---|---|---|
| `background` | `#0a0a0a` | Sidebar, topbar, page bg |
| `surface` | `#0d0d0d` | Main content area |
| `surface-raised` | `#111111` | Cards, input cards |
| `border` | `#1f1f1f` | All dividers and borders |
| `border-subtle` | `#161616` | Section separators |
| `accent` | `#f97316` | Primary buttons, active nav, logo |
| `accent-hover` | `#ea6c0a` | Button hover state |
| `text-primary` | `#ffffff` | Headings, active items |
| `text-secondary` | `#888888` | Nav labels, body text |
| `text-muted` | `#555555` | Subtitles, metadata |
| `text-disabled` | `#333333` | Section labels, placeholders |

### Typography
- Font: system sans-serif stack (`-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI'`)
- Page titles: `24–28px`, `font-weight: 700`, `letter-spacing: -0.4px`
- Nav items: `13px`
- Subtitles/metadata: `11–12px`
- Monospace (API keys, code): `SF Mono`, `Fira Code`, fallback `monospace`

### Key Components
- **Nav item active state:** `background: #1a1a1a`, `color: #f97316`
- **Input card:** `background: #111`, `border: 1px solid #1f1f1f`, `border-radius: 12px`
- **Primary button:** `background: #f97316`, `border-radius: 7px`, `font-weight: 600`
- **Badge NEW:** `background: #1c1c1c`, `color: #555`, `border: 1px solid #2a2a2a`
- **Badge count:** `background: #f97316`, `color: #fff`, rounded pill

---

## Layout Shell

### Top Header Bar (48px)
- Background: `#0a0a0a`, `border-bottom: 1px solid #1f1f1f`
- **Left:** Firecrawl flame logo + "Firecrawl" wordmark
- **Right:** Bell icon · Monitor icon · Help (text) · Docs (text) · Upgrade (orange button)
- No team switcher (single self-hosted instance)

### Sidebar (220px, collapsible)
Background: `#0a0a0a`, `border-right: 1px solid #1f1f1f`

**Navigation structure:**

```
PLAYGROUND
  Search the web          → /playground/search
  Scrape a web page       → /playground/scrape
  Interact with a page    → /playground/interact
  Parse a file      [NEW] → /playground/parse
  fire-enrich       [CSV] → /fire-enrich
  Crawl entire website
    Map all links         → /playground/map
    Crawl                 → /playground/crawl

RESEARCH PREVIEW
  Agent                   → /playground/agent

ACCOUNT
  Activity Logs           → /activity-logs
  Usage                   → /usage
  API Keys                → /api-keys
  Settings                → /settings
  What's New      [badge] → /whats-new

ADMIN
  Ops Dashboard           → /admin/ops
  Principals              → /admin/principals
```

Footer: user avatar + email + Collapse button

---

## Pages

### Overview (`/`)
Replaces current redirect to `/playground/scrape`. Full dashboard home.

**Sections (top to bottom):**
1. **Hero** — "Explore our endpoints" heading + subtitle
2. **Endpoint cards grid (4 col)** — Search, Scrape, Interact, Crawl — each links to its playground page
3. **Stats row (2 col):**
   - Left: "Scraped pages — Last 7 days" with count + line chart (recharts, data from self-hosted API)
   - Right: "API Key" display (masked, copy/reveal) + "Agent Integrations" (SKILL.md copy, CLI command, MCP Config)
4. **Concurrent Browsers (LIVE)** — live poll of active browser sessions from self-hosted instance
5. **Integrations grid** — Python SDK, JS/TS SDK, n8n, Langchain, Make, CrewAI, etc. (static links to docs)

### Playground pages (Search, Scrape, Map, Crawl, Extract, Batch Scrape)
Rebuilt to match firecrawl.dev's pattern:

**Top:** Tab-pill navigation bar grouped under category labels:
- `DISCOVER`: Search | Scrape  
- `EXTRACT`: Parse  
- `CRAWL`: Map | Crawl

**Main area:** Dark input card with URL field, option toggles, "Get code" + primary action button.

**Below card (Scrape only):** Format selector grid — Markdown, Summary, Question, Links, HTML, Screenshot, JSON, Branding, Images.

Existing page logic and API calls are preserved; only the visual layer changes.

### Interact (`/playground/interact`) — NEW
Matches firecrawl.dev's Interact page exactly.

- **Header tabs:** Interact Playground | Sessions | Profiles
- **Empty state:** centered icon + headline + description + URL input + Start button
- **Feature cards (3 col):** Click & Fill · Prompt your actions · Extract behind login
- **API:** `POST /v1/scrape` with `actions` array (already supported by self-hosted Firecrawl)

### Parse (`/playground/parse`) — NEW
- File drop zone accepting PDF, DOCX, XLSX, HTML
- Format selector: Markdown dropdown
- "Start parsing" button
- **API:** `POST /v1/parse` multipart upload

### Agent (`/playground/agent`) — NEW
Matches firecrawl.dev's Agent page (full-screen layout, collapsed icon sidebar).

- Left panel: session list + "New session" button
- Main area: "What data do you want to gather?" prompt input
- Model selector pill (Spark 1 Mini or configured model)
- "Add URLs" + "CSV" attachment buttons
- "Run Agent" orange button
- Prompt suggestion cards (3)
- **API:** self-hosted agent endpoint (user has already added agent mode)

### Activity Logs (`/activity-logs`) — NEW
- Large page title + subtitle
- Filters: search input, endpoint dropdown, API key dropdown, date range
- Table of API requests (empty state if none)
- **API:** existing log endpoint on self-hosted instance (or local DB query via existing fire-enrich DB)

### Usage (`/usage`) — NEW
- "Credits Remaining" → shows "Self-hosted — unlimited" (no credit concept)
- "Recent Usage" with time filter pills (1 day / 7 days / 30 days / Custom)
- Line chart (recharts) of request volume over time
- "Browser Concurrency" section with concurrency chart
- **API:** self-hosted stats endpoint or aggregated from local DB

### API Keys (`/api-keys`)
- Replaces current token management. Shows `FIRECRAWL_API_KEY` from env (masked).
- Read-only — key is set via env, not managed in UI.

### Settings (`/settings`)
- Matches firecrawl.dev's Settings page structure: Team | Advanced tabs
- Self-hosted context: remove Billing tab, add "Self-hosted Instance" section showing `FIRECRAWL_API_URL`

### Admin (Ops Dashboard, Principals)
- Existing pages restyled with new dark theme — no logic changes.

---

## Implementation Phases

### Phase 1 — Shell (highest visual impact, ~5 files)
1. Update `tailwind.config.ts` color tokens
2. Update `styles/globals.css` CSS variables
3. Rebuild `app/layout.tsx` — dark shell, new header, remove old `SidebarProvider`
4. Rebuild `components/app/AppSidebar.tsx` — new nav structure
5. Build new `app/page.tsx` — Overview dashboard

### Phase 2 — Rebuild existing playground pages
Restyle Search, Scrape, Crawl, Map, Extract, Batch Scrape to use input-card + tab-pill pattern. Preserve all existing API call logic.

### Phase 3 — New pages
Add Interact, Parse, Agent, Activity Logs, Usage pages. Wire each to `FIRECRAWL_API_URL`.

### Phase 4 — Admin/ops restyling
Apply new dark theme to existing Ops Dashboard, Principals, API Keys, Settings pages.

---

## Error Handling
- All API calls use existing error patterns in the codebase (toast via Sonner, `ErrorAlert` component)
- New pages follow same pattern: loading spinner → result or error alert
- Self-hosted instance unreachable: show `MissingTokenBanner`-style warning

## Testing
- No new unit tests required — this is a pure UI redesign
- Existing E2E snips cover API correctness; visual correctness verified in browser
- Each phase shipped independently to allow incremental verification
