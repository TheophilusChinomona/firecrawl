Firecrawl is a web scraper API. The directory you have access to is a monorepo:
 - `apps/api` has the actual API and worker code
 - `apps/js-sdk`, `apps/python-sdk`, `apps/rust-sdk` and `apps/java-sdk` are various SDKs

When making changes to the API, here are the general steps you should take:
1. Write some end-to-end tests that assert your win conditions, if they don't already exist
  - 1 happy path (more is encouraged if there are multiple happy paths with significantly different code paths taken)
  - 1+ failure path(s)
  - Generally, E2E (called `snips` in the API) is always preferred over unit testing.
  - In the API, always use `scrapeTimeout` from `./lib` to set the timeout you use for scrapes.
  - These tests will be ran on a variety of configurations. You should gate tests in the following manner:
    - If it requires fire-engine: `!process.env.TEST_SUITE_SELF_HOSTED`
    - If it requires AI: `!process.env.TEST_SUITE_SELF_HOSTED || process.env.OPENAI_API_KEY || process.env.OLLAMA_BASE_URL`
2. Write code to achieve your win conditions
3. Run your tests using `pnpm harness jest ...`
  - `pnpm harness` is a command that gets the API server and workers up for you to run the tests. Don't try to `pnpm start` manually.
  - The full test suite takes a long time to run, so you should try to only execute the relevant tests locally, and let CI run the full test suite.
4. Push to a branch, open a PR, and let CI run to verify your win condition.
Keep these steps in mind while building your TODO list.

---

## Self-Hosted Deployment (Dokploy / Docker Compose)

Production is deployed via **Dokploy** using [`docker-compose.dokploy.yaml`](docker-compose.dokploy.yaml) in this repo. Full operator steps: [`DEPLOY-HANDOVER.md`](../DEPLOY-HANDOVER.md) (parent product folder) and [`docs/deployment-context.md`](../docs/deployment-context.md).

### Build API image locally

`sharedLibs/` lives inside `apps/api/` — use `apps/api/` as the Docker build context, NOT the repo root:

```bash
docker build -t firecrawl-api:latest -f apps/api/Dockerfile apps/api/
```

Push to Git and **redeploy in Dokploy** so the stack rebuilds and restarts.

### Known Self-Hosted Quirks

**Playwright port:** The `playwright-scraper-api` listens on port **3003** inside the container; the compose service maps **host/target port 3000 → 3003**. Set `PLAYWRIGHT_MICROSERVICE_URL` to include `/scrape`, e.g. `http://playwright-service:3000/scrape`. If you see `ECONNREFUSED` on playwright scrapes, confirm that URL and that the playwright container is healthy.

**Screenshot format bug (fixed in this fork):** Upstream `fromV1ScrapeOptions` in `apps/api/src/controllers/v2/types.ts` converts `screenshot@fullPage` to `{ type: "screenshot", fullPage: true }` but leaves plain `"screenshot"` as a raw string. This causes `hasFormatOfType` to never detect the screenshot format, so `buildFeatureFlags` never adds the `screenshot` feature flag, playwright is never selected as the engine, and screenshots silently fail with `Engines tried: []`. Fixed by adding an explicit case for `"screenshot"` in the format map.

**No fire-engine:** Self-hosted only has `playwright` and `fetch` engines. `fire-engine` (Firecrawl Cloud's browser fleet) is not available. Screenshot requires playwright; simple HTML scraping uses fetch.

**Screenshot support added to playwright (this fork):** The playwright microservice (`apps/playwright-service-ts/api.ts`) was extended to accept `screenshot` and `screenshot_full_page` boolean params, call `page.screenshot({ type: 'jpeg', quality: 80 })`, and return the result as a base64 data URL. The playwright engine (`engines/playwright/index.ts`) passes these params and maps the response. `playwright.features.screenshot` is set to `true` in `engines/index.ts`.

**`PLAYWRIGHT_MICROSERVICE_URL`:** Must include the `/scrape` path suffix (see `docker-compose.dokploy.yaml`). Without `/scrape`, all playwright requests return 404 "Cannot POST /".
