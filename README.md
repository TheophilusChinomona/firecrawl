# Firecrawl Fork — Self-Hosted (Theochinomona.tech)

> Fork of [mendable-ai/firecrawl](https://github.com/mendable-ai/firecrawl).
> **Production:** Dokploy + [`docker-compose.dokploy.yaml`](docker-compose.dokploy.yaml) — API at `crawl.theochinomona.tech`, MCP at `mcp.theochinomona.tech`.
>
> **This README documents this fork** — patches vs upstream, how to build, and self-hosted quirks. Upstream docs: [firecrawl.dev/docs](https://docs.firecrawl.dev).

---

## What This Fork Changes

Two patches on top of upstream:

### 1. Screenshot support in Playwright microservice

**Files changed:** `apps/playwright-service-ts/api.ts`, `engines/playwright/index.ts`, `engines/index.ts`

Upstream's Playwright microservice had no screenshot capability. This fork adds:
- `api.ts` accepts `screenshot` and `screenshot_full_page` boolean params
- Calls `page.screenshot({ type: 'jpeg', quality: 80 })` and returns the result as a base64 data URL
- The playwright engine passes these params and maps the response
- `playwright.features.screenshot` is set to `true` in `engines/index.ts`

### 2. Screenshot format detection bug fix

**File changed:** `apps/api/src/controllers/v2/types.ts`

Upstream's `fromV1ScrapeOptions` converted `screenshot@fullPage` correctly but left plain `"screenshot"` as a raw string. This caused `hasFormatOfType` to never detect the screenshot format, so `buildFeatureFlags` never added the `screenshot` flag, playwright was never selected as the engine, and screenshots silently returned empty with `Engines tried: []`.

**Fix:** Added an explicit `"screenshot"` case in the format map alongside `"screenshot@fullPage"`.

---

## Architecture (self-hosted)

```
Docker Compose (Dokploy)
├── api                    — REST API + workers (port 3002)
├── playwright-service    — headless browser (maps 3000 → app 3003)
├── redis, rabbitmq, nuq-postgres
└── (MCP may be separate compose app — see firecrawl-mcp-server)
```

**MCP server** lives in sibling repo `firecrawl-mcp-server/` and calls this API over HTTPS.

**Engines (self-hosted only):**
- `playwright` — full browser, screenshots
- `fetch` — HTML-only

`fire-engine` (Firecrawl Cloud) is **not** available self-hosted.

---

## Build & deploy

### API image

```bash
# Context MUST be apps/api/ (sharedLibs/ lives there)
docker build -t firecrawl-api:latest -f apps/api/Dockerfile apps/api/
```

### Production

1. Configure env in Dokploy (`TEST_API_KEY`, `POSTGRES_PASSWORD`, etc.) — see parent [`DEPLOY-HANDOVER.md`](../DEPLOY-HANDOVER.md).
2. Point Dokploy at this repo and `docker-compose.dokploy.yaml`.
3. Deploy / redeploy after git push.

---

## Environment variables

Key variables for the API (set in Dokploy / compose):

| Variable | Required | Description |
|----------|----------|-------------|
| `TEST_API_KEY` | Yes | Auth for API (align with MCP / clients) |
| `PLAYWRIGHT_MICROSERVICE_URL` | Yes | Must end with **`/scrape`** (e.g. `http://playwright-service:3000/scrape`) |
| `REDIS_URL` | Yes | e.g. `redis://redis:6379` |
| `DATABASE_URL` / Postgres vars | Yes | Per compose template |
| `PORT` | No | Defaults to 3002 |

### Throughput and RAM tuning (self-hosted)

If you need lower RAM usage on smaller hosts, tune these down:

| Variable | Effect |
|----------|--------|
| `NUM_WORKERS_PER_QUEUE` | Queue worker fan-out in API container |
| `MAX_CONCURRENT_JOBS` | Max concurrent scrape jobs |
| `CRAWL_CONCURRENT_REQUESTS` | Crawl parallelism |
| `BROWSER_POOL_SIZE` | Browser instances kept in pool |
| `NUQ_WORKER_COUNT` | Number of NUQ workers spawned by API |

Example low-RAM profile:

```env
NUM_WORKERS_PER_QUEUE=1
MAX_CONCURRENT_JOBS=1
CRAWL_CONCURRENT_REQUESTS=2
BROWSER_POOL_SIZE=1
NUQ_WORKER_COUNT=1
```

`docker-compose.dokploy.yaml` now forwards `NUQ_WORKER_COUNT` into container env.

---

## Known quirks

### Healthchecks in minimal images

Some images do not include `curl` by default. Prefer Node-based health probes in compose healthchecks to avoid false `unhealthy` status caused by missing `curl`.


### `PLAYWRIGHT_MICROSERVICE_URL`

Must end in `/scrape`. Wrong path → `404 Cannot POST /`.

### Screenshots require playwright

`fetch` has no screenshots; requests with `formats: ["screenshot"]` must route through Playwright.

### No fire-engine

Gate tests with `!process.env.TEST_SUITE_SELF_HOSTED` that need fire-engine — they will not pass on this stack.

---

## Running tests locally

```bash
pnpm harness jest <test-file-pattern>
```

Do **not** use `pnpm start` manually for tests — `pnpm harness` starts the stack.

---

## Running locally with Docker Compose

```bash
cp .env.example .env
docker compose up
# API: http://localhost:3002
```

---

## Fork diff vs upstream

| File | Change |
|------|--------|
| `apps/playwright-service-ts/api.ts` | Screenshot params + base64 JPEG |
| Playwright engine files | Screenshot flags / mapping |
| `apps/api/src/controllers/v2/types.ts` | Plain `"screenshot"` format handling |

---

## Related

| Resource | Path / URL |
|----------|------------|
| MCP server (custom tools) | Sibling `firecrawl-mcp-server/` repo |
| Dokploy compose | [`docker-compose.dokploy.yaml`](docker-compose.dokploy.yaml) |
| Deployment handover | [`../DEPLOY-HANDOVER.md`](../DEPLOY-HANDOVER.md) |
| Deployment context | [`../docs/deployment-context.md`](../docs/deployment-context.md) |
| Upstream | https://github.com/mendable-ai/firecrawl |
