# Firecrawl Fork — Self-Hosted (Theochinomona.tech)

> Fork of [mendable-ai/firecrawl](https://github.com/mendable-ai/firecrawl).
> Self-hosted on GCE k3s at `34.12.138.228`.
>
> **This README documents this fork specifically** — what was changed vs upstream, how to build and deploy, and how the cluster works. For the upstream product docs, see [firecrawl.dev/docs](https://docs.firecrawl.dev).

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

## Architecture

```
GCE VM: 34.12.138.228
└── k3s cluster (namespace: firecrawl)
    ├── firecrawl-api        — core REST API + worker queues (Node.js)
    ├── playwright           — headless browser microservice (port 3003 on pod, 3000 on service)
    ├── redis                — job queues
    ├── rabbitmq             — message broker
    ├── postgres             — persistent storage
    └── ingress              — TLS termination, routes external traffic
```

**MCP server** lives separately at `../firecrawl-mcp-server/` and calls this API over HTTP.

**Engines available (self-hosted only):**
- `playwright` — full browser rendering, JS execution, screenshots
- `fetch` — lightweight HTML-only scraping

`fire-engine` (Firecrawl Cloud's proprietary browser fleet) is **not available** on self-hosted.

---

## Build & Deploy

SSH key: `~/.ssh/google_compute_engine`

### Build the API image

```bash
# Must use apps/api/ as the Docker build context (not repo root — sharedLibs/ lives inside apps/api/)
docker build -t firecrawl-api:latest -f apps/api/Dockerfile apps/api/
```

### Push to k3s (no registry — direct image import)

```bash
# Export image locally
docker save firecrawl-api:latest | gzip > /tmp/firecrawl-api.tar.gz

# Copy to VM
scp -i ~/.ssh/google_compute_engine /tmp/firecrawl-api.tar.gz theoc@34.12.138.228:/tmp/

# SSH into VM and import
ssh -i ~/.ssh/google_compute_engine theoc@34.12.138.228
sudo k3s ctr images import /tmp/firecrawl-api.tar.gz
exit

# Restart the deployment
kubectl rollout restart deployment/firecrawl-api -n firecrawl
kubectl rollout status deployment/firecrawl-api -n firecrawl
```

### Apply k8s manifests

Manifests live in `../k8s/` (project root, not this directory).

```bash
# Apply secrets first (never commit secrets — use apply-secrets.sh)
bash ../scripts/apply-secrets.sh

# Apply all manifests
kubectl apply -f ../k8s/ -n firecrawl

# Verify
kubectl get pods -n firecrawl
```

---

## Environment Variables

Key variables the API pod needs (set via k8s secret):

| Variable | Required | Description |
|----------|----------|-------------|
| `FIRECRAWL_API_KEY` | Yes | API key for authenticating requests to this instance |
| `PLAYWRIGHT_MICROSERVICE_URL` | Yes | Must be `http://playwright:3000/scrape` — **include the `/scrape` path** |
| `REDIS_URL` | Yes | `redis://redis:6379` |
| `DATABASE_URL` | Yes | Postgres connection string |
| `PORT` | No | Defaults to 3002 |

> **`PLAYWRIGHT_MICROSERVICE_URL` must include `/scrape`** — without it all playwright requests return `404 Cannot POST /`. The service port is 3000 (which `targetPort`s to pod port 3003).

---

## Known Quirks

### Playwright port mismatch

The `playwright-scraper-api` pod listens on **port 3003**, not 3000. The k8s Service uses `targetPort: 3003` → `port: 3000`. This is intentional and matches the deployed config. If you see `ECONNREFUSED` on playwright scrapes:

```bash
kubectl get service playwright -n firecrawl -o jsonpath='{.spec.ports[0].targetPort}'
# Should be 3003. Fix if wrong:
kubectl patch service playwright -n firecrawl --type='json' \
  -p='[{"op":"replace","path":"/spec/ports/0/targetPort","value":3003}]'
```

### PLAYWRIGHT_MICROSERVICE_URL path suffix

Must end in `/scrape`. Correct value: `http://playwright:3000/scrape`.
Without `/scrape`, the API gets `404 Cannot POST /` for every playwright scrape.

### Screenshots require playwright

The `fetch` engine has no screenshot capability. Any scrape request with `formats: ["screenshot"]` must go through playwright. The format detection fix in this fork ensures the correct engine is selected automatically when screenshot is requested.

### No fire-engine

Self-hosted only has `playwright` and `fetch`. Tests gated on `!process.env.TEST_SUITE_SELF_HOSTED` require fire-engine and will fail on this cluster — skip them.

---

## Running Tests Locally

```bash
# Start the full stack (API + workers + dependencies)
pnpm harness jest <test-file-pattern>

# Do NOT run pnpm start manually — harness manages startup
```

Test gating:
- `!process.env.TEST_SUITE_SELF_HOSTED` — requires fire-engine, skip on self-hosted
- `process.env.OPENAI_API_KEY || process.env.OLLAMA_BASE_URL` — AI tests, need a key

---

## Running Locally with Docker Compose

```bash
# Copy and fill in env vars
cp .env.example .env

# Start everything
docker compose up

# API available at http://localhost:3002
```

---

## Fork Diff vs Upstream

| File | Change |
|------|--------|
| `apps/playwright-service-ts/api.ts` | Added `screenshot` / `screenshot_full_page` params, returns base64 JPEG |
| `apps/playwright-service-ts/` (engine files) | Passes screenshot params, maps response, sets `features.screenshot = true` |
| `apps/api/src/controllers/v2/types.ts` | Fixed `fromV1ScrapeOptions` to handle plain `"screenshot"` format string |

---

## Related

| Resource | Path |
|----------|------|
| MCP server (custom tools) | `../firecrawl-mcp-server/` |
| Kubernetes manifests | `../k8s/` |
| Deployment scripts | `../scripts/` |
| OpenClaw agent workspaces | `../openclaw/` |
| Upstream repo | https://github.com/mendable-ai/firecrawl |
| Upstream docs | https://docs.firecrawl.dev |
