Firecrawl is a web scraper API. The directory you have access to is a monorepo:
 - `apps/api` has the actual API and worker code
 - `apps/js-sdk`, `apps/python-sdk`, and `apps/rust-sdk` are various SDKs

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

## Self-Hosted Deployment (GCE k3s)

**Cluster:** `34.12.138.228` | namespace: `firecrawl` | SSH key: `~/.ssh/google_compute_engine`

### Build & Deploy

`sharedLibs/` lives inside `apps/api/` — use `apps/api/` as the Docker build context, NOT the repo root:

```bash
# Build (from firecrawl-fork/)
docker build -t firecrawl-api:latest -f apps/api/Dockerfile apps/api/

# Export → SCP → import into k3s (imagePullPolicy: Never)
docker save firecrawl-api:latest | gzip > /tmp/firecrawl-api.tar.gz
scp -i ~/.ssh/google_compute_engine /tmp/firecrawl-api.tar.gz theoc@34.12.138.228:/tmp/

# On the VM:
ssh -i ~/.ssh/google_compute_engine theoc@34.12.138.228
sudo k3s ctr images import /tmp/firecrawl-api.tar.gz

# Restart the deployment:
kubectl rollout restart deployment/firecrawl-api -n firecrawl
kubectl rollout status deployment/firecrawl-api -n firecrawl
```

### Known Self-Hosted Quirks

**Playwright port:** The `playwright-scraper-api` listens on port **3003**, not 3000 (despite the Helm chart default). The k8s service must have `targetPort: 3003`. If you see `ECONNREFUSED` on playwright scrapes, check:
```bash
kubectl get service playwright -n firecrawl -o jsonpath='{.spec.ports[0].targetPort}'
# Should be 3003. Fix: kubectl patch service playwright -n firecrawl --type='json' -p='[{"op":"replace","path":"/spec/ports/0/targetPort","value":3003}]'
```

**Screenshot format bug (fixed in this fork):** Upstream `fromV1ScrapeOptions` in `apps/api/src/controllers/v2/types.ts` converts `screenshot@fullPage` to `{ type: "screenshot", fullPage: true }` but leaves plain `"screenshot"` as a raw string. This causes `hasFormatOfType` to never detect the screenshot format, so `buildFeatureFlags` never adds the `screenshot` feature flag, playwright is never selected as the engine, and screenshots silently fail with `Engines tried: []`. Fixed by adding an explicit case for `"screenshot"` in the format map.

**No fire-engine:** Self-hosted only has `playwright` and `fetch` engines. `fire-engine` (Firecrawl Cloud's browser fleet) is not available. Screenshot requires playwright; simple HTML scraping uses fetch.

**Screenshot support added to playwright (this fork):** The playwright microservice (`apps/playwright-service-ts/api.ts`) was extended to accept `screenshot` and `screenshot_full_page` boolean params, call `page.screenshot({ type: 'jpeg', quality: 80 })`, and return the result as a base64 data URL. The playwright engine (`engines/playwright/index.ts`) passes these params and maps the response. `playwright.features.screenshot` is set to `true` in `engines/index.ts`.

**`PLAYWRIGHT_MICROSERVICE_URL`:** Must be set in the API pod env with the `/scrape` path suffix. Correct value: `http://playwright:3000/scrape` (service port 3000, which forwards to pod port 3003 via targetPort). Without `/scrape`, all playwright requests return 404 "Cannot POST /".
