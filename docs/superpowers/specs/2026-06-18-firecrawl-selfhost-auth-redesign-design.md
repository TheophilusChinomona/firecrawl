# Self-Hosted Firecrawl — Auth Redesign (Cloudflare Access → Keycloak + auth.md/ID-JAG)

- **Date:** 2026-06-18
- **Status:** Design approved (brainstorm). Phase 0 spec is build-ready; later phases are scoped, not yet specced.
- **Interactive preview:** [`docs/auth-redesign-preview.html`](../../auth-redesign-preview.html)
- **Workspace:** `/home/theo/Documents/Theochinomona.tech/firecrawl/` (multi-repo; operational stack lives in the inner `firecrawl/` git repo)

---

## 1. Goal

Replace **Cloudflare Access** on both gated surfaces of the self-hosted Firecrawl stack with a **fully self-hosted** identity layer, with **zero WorkOS cloud dependency**:

- `enrich.theochinomona.tech` — the fire-enrich dashboard (**humans**)
- `crawl.theochinomona.tech/mcp` — the MCP endpoint (**AI agents**)

## 2. Key finding (researched, not assumed)

- **WorkOS itself cannot be self-hosted** — its core (AuthKit backend, identity/session store, ID-JAG signing) is closed cloud SaaS. Only its client SDKs and the `auth.md` reference implementation are open source.
- **The standards WorkOS composes are open and self-hostable:** OAuth 2.1/OIDC, `auth.md` (explicitly "not tied to WorkOS infrastructure"), and **ID-JAG** (`draft-ietf-oauth-identity-assertion-authz-grant-04`, an open IETF draft).
- **Infisical (already self-hosted) is a secrets manager, not an IdP** — it cannot be the access gate. It complements the design by storing the new secrets.

## 3. Locked decisions

| # | Decision |
|---|---|
| 1 | Both surfaces (humans + agents) move off Cloudflare Access |
| 2 | Self-host the standards (no WorkOS cloud) |
| 3 | **Keycloak** (Apache-2.0) as the IdP + OAuth 2.1 authorization server |
| 4 | Agent auth via **`auth.md` + ID-JAG**, layered on standard MCP OAuth |
| 5 | **Keycloak self-issues the ID-JAG** via RFC 8693 token exchange (100% self-hosted; KC 26.5 identity-chaining is *preview*) |
| 6 | **Infisical** stores Keycloak + stack secrets (complement, not replacement) |
| 7 | Dashboard auth = **app-level OIDC** (not an `oauth2-proxy` sidecar) |
| 8 | Keycloak hostname = **`id.theochinomona.tech`** |
| 9 | **Start with Phase 0** (runnable + E2E baseline) before any auth change |
| 10 | **Execution environment = Crabbox** — the stack runs on the remote Crabbox box (`crabbox-runner`, `provider: ssh`), **not** on this local machine. `crabbox init` + `crabbox run` sync the checkout and run there |
| 11 | **Sequencing = baseline → sync → auth.** Fork is **38 ahead / 256 behind `upstream/main`**. Order: (a) baseline the *current* fork green on Crabbox, (b) merge upstream as its own phase gated by the same smoke suite, (c) then the auth phases on the current base |

## 4. Target architecture (umbrella — for context)

Keycloak is added as the single IdP + authorization server, Postgres-backed (isolated DB/schema in `nuq-postgres`), exposed via Traefik at `id.theochinomona.tech`. `cf-access-verifier` is deleted; Cloudflare is kept for DNS/TLS only.

- **Human → dashboard:** fire-enrich's existing `OperatorIdentity` abstraction (`cf-access | admin-token`) gains a `keycloak-oidc` source; OIDC auth-code + PKCE; authorize on the `operators` group (migrated from `OPERATOR_EMAILS`).
- **Agent → MCP (standard OAuth):** MCP server becomes an OAuth 2.1 resource server — serves Protected Resource Metadata (RFC 9728), returns `401 + WWW-Authenticate`, validates bearer tokens against Keycloak's JWKS with audience binding (RFC 8707). Keycloak handles authorize/token/DCR/PKCE.
- **Agent → MCP (auth.md/ID-JAG):** publish `crawl.theochinomona.tech/auth.md`; new `/agent/auth` endpoint validates ID-JAGs (`iss` = Keycloak, `aud`, `exp ~5min`, `jti` replay-guard, `email_verified`). Keycloak mints the ID-JAG via token exchange.

**Standards:** OAuth 2.1 + PKCE(S256), RFC 9728, RFC 8414/OIDC Discovery, RFC 7591 (DCR), RFC 8707, RFC 8693, RFC 7523, ID-JAG draft-04.

## 5. Phase decomposition (each = its own spec → plan → build)

| Phase | Sub-project | Outcome |
|---|---|---|
| **0** | **Self-host bring-up + E2E baseline** | Current fork runs on Crabbox; existing pipeline verified green **before** any change. Produces the reusable smoke suite |
| **0.5** | **Upstream sync (256 commits)** | Fork merged up to current `upstream/main`; 38 custom commits + CI/compose customizations preserved; **same smoke suite re-green** = no regression |
| 1 | Keycloak stand-up | Keycloak + `firecrawl` realm + `operators` group, alongside (nothing removed) |
| 2 | Dashboard → Keycloak OIDC | Human login off CF Access |
| 3 | MCP → standard OAuth resource server | Agents via OAuth 2.1 + PKCE + DCR |
| 4 | `auth.md` + ID-JAG self-issuance | Agent-native flow via Keycloak token exchange |
| 5 | Decommission CF Access + full E2E | `cf-access-verifier` gone, allowlist migrated, full test pass |

---

# PHASE 0 SPEC — Self-host bring-up + E2E baseline

> This is the immediate, build-ready unit of work. It deliberately contains **no auth changes** — its job is to get the existing stack running locally and prove the data pipeline end-to-end, establishing a green baseline so every later phase has a known-good reference.

## P0.1 Objective

Onboard the inner `firecrawl/` repo to **Crabbox**, sync the checkout to the **remote Crabbox box** (`crabbox-runner`), bring the **core Firecrawl stack** up there, and verify the full scrape/crawl/extract/search/map pipeline plus the fire-enrich dashboard enrichment flow — all running on the box. Capture the result as a documented, repeatable baseline (a short runbook + a re-runnable smoke script that executes via `crabbox run`).

## P0.2 Current state (verified)

**Execution model — Crabbox (remote box), not local:**
- `crabbox` is installed (`/home/linuxbrew/.linuxbrew/bin/crabbox`); `crabbox doctor` is all-green; provider is **`ssh` static** → host `crabbox-runner`, user `crabbox`, workRoot `/home/crabbox/crabbox` (a persistent box — state survives between runs, suited to a long-running stack).
- Workflow: `crabbox init` writes `.crabbox.yaml` + `.github/workflows/crabbox.yml` + `.agents/skills/crabbox/SKILL.md` into the repo → `crabbox warmup` leases/prepares the box → `crabbox run -- <cmd>` rsyncs the dirty checkout and runs the command on the box, streaming output (`-download remote=local` pulls artifacts back; `-capture-stdout` saves logs).
- **Docker availability on the box is unverified** — first execution step is to confirm Docker + Compose exist on `crabbox-runner` (`crabbox run -- docker version && docker compose version`). The local Docker-permission issue on this machine is now **irrelevant** (we don't run here).

**Stack facts (verified, apply wherever it runs):**
- **`.env` has `CHANGE_ME` placeholders:** `POSTGRES_PASSWORD`, `BULL_AUTH_KEY`, `LLM_API_KEY`.
- **`docker-compose.yaml`** (in inner `firecrawl/`) defines: `api` (:3002), `playwright-service`, `redis`, `rabbitmq`, `nuq-postgres`, plus edge services `cf-access-verifier`, `firecrawl-mcp`, `fire-enrich-web`. The edge services and routing depend on an **`external: true` `traefik` network** and Cloudflare Access config.
- `fire-enrich/.env.local` already has a real `FIRECRAWL_API_KEY` and points at the live `crawl.theochinomona.tech`; `OPENAI_API_KEY` is empty (dashboard synthesis needs an LLM key).

## P0.3 Scope

**In scope**
1. `crabbox init` in the inner `firecrawl/` repo (adds `.crabbox.yaml` + workflow + skill); confirm the repo syncs cleanly (sensible ignores so `node_modules`/build output aren't rsynced — box builds fresh).
2. Verify the box is capable: `crabbox warmup` + `crabbox run -- docker version && docker compose version`.
3. Populate required secrets — sourced from **Infisical** where possible — to remove `CHANGE_ME` values. Secrets land in the synced `.env`; ensure they are never printed to logs.
4. Define a **bring-up strategy** that starts the core pipeline **without** the Traefik-/CF-dependent edge services (a compose `override`/`profiles`, and/or a throwaway `traefik` network on the box so compose resolves). Runs via `crabbox run -- docker compose … up -d`.
5. Bring the core stack up on the box; pass health checks.
6. Run an **E2E smoke pass** of the API pipeline on the box: `scrape`, `crawl` (+ status), `map`, `search`, `extract`.
7. Run the **dashboard enrichment** flow against the box-local API (requires an LLM key).
8. Optional MCP smoke: run `firecrawl-mcp-server` on the box (stdio) pointed at the box-local API and call one tool.
9. Capture a **baseline artifact**: a runbook (`docs/.../phase0-baseline.md`) recording exact `crabbox`/compose commands, box versions, what passed, and a re-runnable smoke script (invoked as `crabbox run -- ./scripts/smoke.sh`).

**Out of scope (explicitly deferred to later phases)**
- Any change to authentication/authorization (Keycloak, OIDC, `auth.md`, ID-JAG, removing `cf-access-verifier`).
- Production deployment / Traefik / Cloudflare changes.
- Standing up the public edge services (`fire-enrich-web` + `firecrawl-mcp` *behind Traefik/CF*). Box-local equivalents are used for verification only.

## P0.4 Components & boundaries

| Unit | Responsibility | Verification handle |
|---|---|---|
| **Crabbox onboarding** | Repo synced to `crabbox-runner`; box reachable | `crabbox run -- echo ok` streams `ok` |
| **Box capability** | Docker + Compose present on the box | `crabbox run -- docker compose version` succeeds |
| **Secrets** | No `CHANGE_ME` in the effective env; secrets pulled from Infisical | `crabbox run -- docker compose config` shows resolved values; nothing secret printed to logs |
| **Compose layer** | Bring up core only, no external `traefik` dep | `docker compose … up -d` on box succeeds; only intended services start |
| **Core services** | api, playwright, redis, rabbitmq, nuq-postgres healthy | `crabbox run -- docker compose ps` healthy |
| **API pipeline** | scrape/crawl/map/search/extract return valid results | smoke script (on box) asserts HTTP 200 + expected shape |
| **Dashboard** | fire-enrich web enriches a sample row via box-local API | browser/manual check via tunnel or on-box curl; one row enriched |
| **MCP (optional)** | mcp server reaches box-local API, one tool works | one tool call returns data |
| **Baseline doc** | Repeatable runbook + smoke script committed | file exists; `crabbox run -- ./scripts/smoke.sh` re-runs clean |

## P0.5 Test / success criteria (definition of "green baseline")

The baseline is **green** when, from documented commands:
1. `crabbox run -- docker compose version` succeeds on `crabbox-runner` (box is Docker-capable).
2. Core stack starts on the box and all core services report healthy.
3. API smoke script passes for **all** of: scrape, crawl (submit → poll → complete), map, search, extract.
4. Dashboard enriches at least one sample record end-to-end against the **box-local** API.
5. (If included) one MCP tool call succeeds against the box-local API.
6. A runbook + re-runnable smoke script are committed; a second operator could reproduce the baseline via `crabbox` from them alone.

**Negative/robustness checks:** smoke script fails loudly (non-zero exit) if any step returns a non-2xx or an unexpected shape; no secret values are emitted to stdout/logs.

## P0.6 Risks & mitigations

| Risk | Mitigation |
|---|---|
| Box may lack Docker/Compose, or have an incompatible version | First step verifies `docker compose version` on the box; if absent, provision it (or pick a box class that includes it) before proceeding |
| `crabbox run` rsync pulls huge `node_modules`/build dirs → slow sync | Configure ignores in `.crabbox.yaml` (and/or rely on `.gitignore`) so only source syncs; the box builds fresh via compose |
| Synced `.env` carries secrets to the box | Acceptable (box is yours); ensure compose/logs never echo values; keep secrets out of the repo and the runbook |
| Ports bind on the box, not reachable from here | Run the smoke script **on the box** (`crabbox run -- ./scripts/smoke.sh`, curl `localhost`); for the dashboard, use an SSH tunnel or `crabbox desktop`/`-browser` |
| Compose references `external: true` traefik network → `up` fails even for core | `docker compose -f docker-compose.yaml -f docker-compose.local.yml` override that removes edge services / external net, or `docker network create traefik` as a throwaway on the box |
| Static box persists state between runs (stale volumes/containers) | Document a clean-reset (`docker compose down -v`) in the runbook; baseline must reproduce from clean |
| `nuq-postgres` runs both queue + fire-enrich schemas; first-run init ordering | Verify init SQL ran; check both schemas exist before pipeline tests |
| Dashboard synthesis needs `OPENAI_API_KEY`/`LLM_API_KEY` (currently empty) | Source from Infisical; if unavailable, mark the dashboard-enrichment criterion as blocked and proceed with API + MCP criteria |
| Self-host auth mode (whether the API requires a bearer key) unclear | Determine auth mode from config during bring-up; set `TEST_API_KEY` accordingly for the smoke script |
| Building images is heavy (api needs 4 CPU/8 GB) | Pick a sufficient box class (default `beast`); allow longer first-build; redirect build logs to a file and tail |

## P0.7 Assumptions / open items to confirm during execution

- The inner `firecrawl/` repo is the operational source of truth (compose + nested `fire-enrich`/`firecrawl-mcp-server`) and the repo we run `crabbox init` in. Top-level sibling copies are not used for the running stack.
- `crabbox-runner` is a persistent box with enough resources for the stack; Docker/Compose can be made available on it.
- Infisical can supply `POSTGRES_PASSWORD`, `BULL_AUTH_KEY`, `LLM_API_KEY`, and an LLM key for the dashboard. If a value isn't in Infisical, we generate it and store it there as part of P0.3.
- Work happens on a **feature branch** in the inner `firecrawl/` repo (per workspace git rules); pre-existing uncommitted changes are surfaced, not bundled. CI/pipeline files are not touched. *(Note: `crabbox init` generates `.github/workflows/crabbox.yml` — this is Crabbox onboarding scaffolding, not a change to the project's existing CI pipelines, and is reviewed before commit.)*

## P0.8 Deliverables

1. `.crabbox.yaml` (+ generated workflow/skill) from `crabbox init`, with sync ignores tuned.
2. A `docker-compose.local.yml` override (or documented `--profile` invocation) that brings up the core pipeline without the Traefik/CF edge services.
3. A re-runnable E2E smoke script (`scripts/smoke.sh`) that asserts the full pipeline, invoked via `crabbox run`.
4. `phase0-baseline.md` runbook: exact `crabbox`/compose steps, box versions, pass/fail record.
5. Any newly generated secrets stored in Infisical (not committed to the repo).

---

# PHASE 0.5 SPEC — Upstream sync (256 commits)

> Its own sub-project, run **after** the Phase 0 baseline is green and **before** the auth phases. The Phase 0 smoke suite is the regression gate: the merge is "done" only when the same suite passes again.

## P05.1 Objective

Merge `upstream/main` (256 commits ahead) into the fork's `main` while **preserving all 38 custom commits** and their customizations, then prove no regression by re-running the Phase 0 smoke suite on Crabbox.

## P05.2 Current state (verified)

- `origin` = `TheophilusChinomona/firecrawl`; `upstream` = `firecrawl/firecrawl`. Branch `main` tracks `origin/main`.
- `git rev-list --left-right --count main...upstream/main` → **38 ahead / 256 behind**. Upstream default branch is `main`.
- Prior upstream merges exist in history (`merge: pull upstream/main …`, `merge: reconcile origin/main + upstream/main`) → this is a repeatable, known operation.
- The 38 custom commits include the **subtree folds** of `fire-enrich` + `firecrawl-mcp-server`, the **self-host deploy** automation, `cf-access-verifier`, `notifyOnCompletion`, and **CI rewired to self-hosted runners + own GHCR org**.

## P05.2a Upstream change analysis (verified 2026-06-18)

- **Range:** merge-base `af8adaf67` (2026-05-12) → upstream tip `a12798466` (2026-06-18), ~5 weeks.
- **Magnitude:** 496 files, **+42,920 / −15,878**. No `BREAKING`/`!:` markers. Mix: 98 fix · 45 feat · 33 merge · chores. Churn concentrated in `apps/api` (334 files); remainder is SDK + CI.
- **Conflict surface is bounded to 30 files** (intersection of fork-touched 484 ∩ upstream-touched 496). Much of it is cherry-pick overlap (the fork pulled several upstream SDK/api PRs) that may resolve clean/empty.
- **🟢 FoundationDB queue rebuild is OPT-IN, not a replacement.** Upstream added ~5,000 lines of `nuq-fdb/*` worker code + a `foundationdb`/`foundationdb-init` service to `docker-compose.yaml`, **gated behind `NUQ_BACKEND=fdb`**, defaulting to Postgres. `apps/nuq-postgres` still exists. **Decision: stay on `nuq-postgres` (leave `NUQ_BACKEND` unset) through Phase 0 and the merge** — do not adopt FoundationDB now.
- **New env keys (additive/optional):** `PRODUCT_EXTRACTION_SERVICE_URL`, `NUQ_BACKEND`, `FDB_CLUSTER_FILE`.
- **Notable upstream features (context, not blockers):** Supabase→Drizzle migration (#3698), fire-privacy, deterministic-JSON format, `product` format, `/interact`→`/browser` alias, billing changes, Spur IP-reputation.

## P05.3 Scope & sequencing

1. Do the merge on a **dedicated branch** off `main` (never on `main` directly) so the baseline `main` stays intact for comparison.
2. Merge `upstream/main`; resolve conflicts with explicit attention to the high-risk files (see risks).
3. **Re-run the Phase 0 smoke suite** via `crabbox run` on the merged branch → must be green.
4. Only then fast-forward/merge into `main` and push to `origin`.

**Out of scope:** any auth change; any upstream code beyond what the merge brings; rewriting fork history.

## P05.4 High-risk conflict zones (verified — the 30-file conflict set)

| Zone | Conflict shape (verified) | Severity | Guard |
|---|---|---|---|
| **`.github/workflows/`** (`deploy-image.yml` +127, `deploy-image-staging.yml`, `test-server.yml` +84, `npm-audit.yml`, `publish-js-sdk.yml`) | **Both sides heavily edited the same workflow logic** | 🔴 Highest | Preserve fork's self-hosted-runner + GHCR-org config line-by-line; take upstream job logic only where it doesn't revert that |
| **`docker-compose.yaml`** | Upstream added FDB services (+52) in different regions than fork's `cf-access-verifier`/`firecrawl-mcp`/`fire-enrich-web` + traefik | 🟡 Resolvable | Keep BOTH sets of services + networks + volumes; leave `NUQ_BACKEND` unset (Postgres default) |
| **`apps/api` v2 controllers + worker** (`scrape/crawl/search/batch-scrape/scrape-browser/types`, `fire-engine/*`, `transformers`, `crawl-logic.ts`, `scrape-worker.ts`, `config.ts`, `types.ts`) | Fork's agent-API + `notifyOnCompletion` vs. upstream's heavy api churn (incl. Drizzle migration, FDB worker plumbing) | 🟡 Medium | Smoke suite is the safety net; verify `notifyOnCompletion` + agent-API survive |
| **SDK types** (`go-sdk` options/parse, `js-sdk` v2 client/search/types, `python-sdk` v2 types) | Fork cherry-picked upstream SDK PRs upstream now also has | 🟢 Low | Often auto-resolves / empty; verify no double-apply |
| **`CLAUDE.md`, `README.md`** | Fork rewrote for self-host; upstream tweaked | 🟢 Low | Take fork's |
| Subtree-folded `fire-enrich/`, `firecrawl-mcp-server/` | Not in upstream → not in the 30-file conflict set; confirmed conflict-free | 🟢 None expected | Verify untouched; subtrees updated separately, not by this merge |
| `.env.example` / config keys | Upstream adds optional `PRODUCT_EXTRACTION_SERVICE_URL`, `NUQ_BACKEND`, `FDB_CLUSTER_FILE` (additive) | 🟢 Low | Append; reconcile with fork's `CHANGE_ME` set + Infisical-managed keys |

## P05.5 Success criteria

1. Merge branch contains `upstream/main` and **all 38 custom commits** (verify `git log --oneline merge-branch --not upstream/main` still lists the fork commits).
2. CI customizations (self-hosted runners, GHCR org) intact in `.github/workflows`.
3. Custom services still present in `docker-compose.yaml`.
4. **Phase 0 smoke suite passes** on the merged branch on Crabbox (scrape/crawl/map/search/extract + dashboard).
5. `main` updated + pushed only after the above; the pre-merge baseline `main` ref retained for rollback.

## P05.6 Risk / rollback

- Keep the pre-merge `main` SHA recorded; the merge lives on a branch until smoke-green, so rollback = abandon the branch.
- If conflicts are too tangled to resolve safely in one pass, fall back to an **incremental** merge (upstream in chunks, smoke between chunks) — history shows a prior `pull upstream/main (45 commits)` style chunked merge.

---

## Next phases (summary only — separate specs to follow)

- **Phase 1:** Keycloak service + `firecrawl` realm + `operators` group at `id.theochinomona.tech`, token exchange enabled, running alongside.
- **Phase 2:** `keycloak-oidc` source on `OperatorIdentity`; dashboard login via Keycloak.
- **Phase 3:** MCP server as OAuth 2.1 resource server (PRM, 401 challenge, JWKS + audience validation, DCR).
- **Phase 4:** `auth.md` + `/agent/auth` ID-JAG endpoint; Keycloak token-exchange issuance (validate KC preview → GA before prod reliance).
- **Phase 5:** Remove `cf-access-verifier` + `CF_ACCESS_*` + forwardAuth; migrate allowlist; full positive + negative E2E.
