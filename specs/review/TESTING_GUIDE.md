---

## kind: testing-guide

canonical_for:

- automated-testing
- agent-test-generation
informed_by:
- /specs/review/REVIEW_GUIDE.md
- /specs/engineering/spec-authoring.md
- /AGENTS.md
- /specs/organization/organization.md
see_also:
  - /specs/DEVELOPER_GUIDE.md
applies_to:
- full-sdd
- critical-areas
- backfill-tests

# Testing Guide

**Canonical for how to write and generate automated tests** in this monorepo. Agents MUST read this
before generating tests for critical-area work. Humans use it when reviewing AI-written tests.

> **GloX adaptation (2026-08-11):** GloX is a single TanStack Start app at repo root — not the Wald
> `apps/next-js-app` layout referenced below. Replace paths as follows:
>
> | Wald reference | GloX equivalent |
> | --- | --- |
> | `apps/next-js-app/` | `src/` (routes in `src/routes/`, APIs in `src/serverFns/`) |
> | `libs/` | N/A — shared code in `src/lib/`, `src/server/` |
> | Playwright E2E | Not configured yet — add under `e2e/` or use Vitest integration tests |
> | `pnpm exec nx e2e next-js-app` | `pnpm test` (Vitest — no tests written yet) |
>
> Priority integration-test seams: `src/serverFns/login.server.ts`, document ownership in
> `deleteDocument.server.ts` / `myDocuments.server.ts`, FloDown cascade delete in
> `src/server/floDownBlockDeletion.ts`. All SDD test-mapping rows currently show `Gap`.


| Question                                               | Read instead                                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Review gates, Testing Trophy principles, red-phase TDD | `[REVIEW_GUIDE.md](./REVIEW_GUIDE.md)` §2                                                                                                      |
| How to map EARS rules → Gap / test rows in SDDs        | `[spec-authoring.md](../engineering/spec-authoring.md)` §2–3                                                                                   |
| Onboarding backfill priorities                         | Cursor plan *Onboarding Tests Backfill*; per-rule evidence in onboarding SDD Test mapping tables |
| Workflow / when full SDD applies                       | `[DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)`                                                                                                  |
| Who owns integration / CI / exploratory QA             | `[organization.md](../organization/organization.md)`                                                                                           |


**Naming:** This repo uses the **Testing Trophy** (static → unit → **integration bulk** → thin E2E). Do
not introduce alternate shape names in specs or AGENTS.md.

---



## 1. Is the Testing Trophy enough?

**No — not for agents generating tests.**

`[REVIEW_GUIDE.md](./REVIEW_GUIDE.md)` §2 states the **strategy**. This guide is the **operational
playbook** (layout, fixtures, mocking, CI budgets, anti-patterns). Domain backlogs (Cursor plans or
non-binding inventories) MUST NOT redefine the Trophy.


| Gap in REVIEW_GUIDE alone                                         | This guide    |
| ----------------------------------------------------------------- | ------------- |
| File layout; Vitest vs Playwright                                 | §3            |
| Spec Gap → concrete case                                          | §4            |
| `MUST NOT` assertion shape                                        | §5            |
| Multi-tenant fixtures                                             | §6            |
| Mocking boundaries (today vs target)                              | §7            |
| E2E Mocked vs E2E Live (`USE_MOCKS`, `smartRoute`, Live seed API) | §8 (required) |
| E2E assertion principles (what to assert)                         | §8.5          |
| Harness reality                                                   | §9            |
| Seam selection                                                    | §10           |
| CI velocity budgets                                               | §11           |
| Explicitly deferred work                                          | §15           |


---



## 2. Testing Trophy — repo interpretation

Follow [Kent C. Dodds' Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
as stated in REVIEW_GUIDE §2:

```
        ╱╲
       ╱E2E╲          Thin — E2E Mocked on PR; E2E Live nightly/pre-deploy (§8)
      ╱──────╲
     ╱ Integr.╲       Bulk — API routes, helpers, SSR decision seams, real DB
    ╱──────────╲
   ╱    Unit    ╲     Narrow — pure transforms, classifiers, seat math
  ╱──────────────╲
 ╱ Static analysis ╲  Always — tsc, lint (Biome/ESLint)
╱────────────────────╲
```



### 2.1 Coverage goal

Do **not** chase 100% line coverage. Chase **100% feature coverage** on critical areas
(`[AGENTS.md](../../AGENTS.md)`): billing/entitlements, auth/tenancy, onboarding, encryption,
LLM routing, sanitization — especially every SDD `MUST NOT`.

Human review of AI tests focuses on **assertions and fixtures**, not coverage %.

### 2.2 Layers


| Layer                         | Use for                                                                           | Do not use for                                    | Speed budget (guidance)                 |
| ----------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------- |
| **Static**                    | Types, lint                                                                       | Business rules                                    | PR gate                                 |
| **Unit (Vitest)**             | Pure functions (no I/O)                                                           | Prisma-wrapped helpers; prop-mirroring components | Prefer < 50 ms / test                   |
| **Integration (Vitest + DB)** | API handlers, domain helpers, SSR decision seams; real Postgres; externals mocked | Full browser wizards; exhaustive UI               | Prefer 100–500 ms / test                |
| **E2E Mocked (Playwright)**   | Critical UI journeys; dialogs; blocked screens                                    | Branch matrices (use integration)                 | Prefer 5–15 s / test                    |
| **E2E Live (Playwright)**     | Staging/dev wiring smoke (keys, real network)                                     | Every PR (too slow / stateful)                    | Prefer 20–45 s / test; run sequentially |


**Critical-area mandate:** every `MUST NOT` in the governing SDD MUST have an automated **negative**
test (or explicit `Gap` + owner in the SDD Test mapping).

---



## 3. Layout and runners



### 3.1 Current layout (`apps/next-js-app`)


| Kind        | Location                                          | Runner                                      |
| ----------- | ------------------------------------------------- | ------------------------------------------- |
| Unit        | Colocated `*.test.ts` or `utils/tests/`           | `pnpm exec nx test next-js-app` (Vitest)    |
| E2E Mocked  | `apps/next-js-app/e2e/*.spec.ts` + `e2e/helpers/` | `pnpm exec nx e2e next-js-app` (Playwright) |
| Integration | **Mostly missing** — see §9                       | Target: Vitest + real Postgres              |


Vitest excludes `e2e/**`. Do not put Playwright specs under Vitest `include`.

### 3.2 Target layout

```
apps/next-js-app/
  e2e/                              # Playwright — Mocked (PR) + Live (nightly)
    helpers/
      database.ts
      fixtures/
      smart-route.ts                # USE_MOCKS-aware page.route wrapper (§8)
      seed-api.ts                   # client for Live transactional seed/teardown (§8)
  lib/…/foo.test.ts                 # unit — pure
  tests/
    integration/                    # NEW — API/DB bulk
      helpers/
        db.ts
        fixtures/
        auth.ts
        http.ts                     # node-mocks-http (or equivalent) for Pages handlers
      onboarding/
        *.integration.test.ts
```

Prefer a shared harness PR (§9) before one-off DB setup per file. Until then, colocated
`*.integration.test.ts` is allowed only with a top-of-file DB requirement comment.

### 3.3 Naming


| Pattern                               | Meaning                                             |
| ------------------------------------- | --------------------------------------------------- |
| `foo.test.ts`                         | Unit (no DB)                                        |
| `foo.integration.test.ts`             | Integration (real DB; externals mocked)             |
| `e2e/bar.spec.ts`                     | Playwright (Mocked by default via `USE_MOCKS=true`) |
| `e2e/live/*.spec.ts` (or `@live` tag) | Playwright E2E Live (`USE_MOCKS=false`)             |


Name cases with **rule IDs** when mapped:

```ts
it("S-OPEN-08 MUST NOT accept open invitation when user is on another team", async () => {
  // …
});
```



### 3.4 Core technologies (adopted vs deferred)


| Tool                                  | Role                                                        | Status                                                 |
| ------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| **Vitest**                            | Unit + integration runner                                   | Adopted                                                |
| **Playwright**                        | E2E Mocked + E2E Live                                       | Adopted                                                |
| **Real Postgres**                     | Integration + E2E DB                                        | Adopted (localhost); CI ephemeral — near-term §9 / §11 |
| `node-mocks-http` **(or equivalent)** | Pages API `req`/`res` in Vitest                             | Near-term with harness                                 |
| `USE_MOCKS` **+** `smartRoute`        | Toggle Playwright intercepts for Mocked vs Live             | **Required** — §8                                      |
| `TEST_ENV`                            | Target base URL (`local` / `dev` / `staging`)               | **Required** — §8                                      |
| **Live seed/teardown control API**    | Isolated transactional fixtures for E2E Live                | **Required** with Live — §8                            |
| **Playwright** `page.route`           | Underlying browser mocks (via `smartRoute`, not raw ad hoc) | Adopted                                                |
| **MSW**                               | Preferred long-term mock for outbound HTTP from Node        | Deferred — §15                                         |
| **JSON mock capture dumper**          | Record real payloads → fixture files                        | Deferred — §15                                         |


---



## 4. Spec → test workflow

SDD **Test mapping** (`SDD rule | PRD rule | Test`) is the backlog.

### 4.1 For each `Gap` row

1. Read the EARS rule (and **Rationale**).
2. Choose layer (§2 / §10).
3. Write the smallest test that **fails if the rule is deleted or inverted**.
4. One focused case per rule when practical.
5. After CI green, replace `Gap` with a file pointer + rule id.



### 4.2 Positive vs negative


| Rule shape        | Test shape                                          |
| ----------------- | --------------------------------------------------- |
| `MUST <do X>`     | Assert X (DB, status, redirect, props)              |
| `MUST NOT <do Y>` | Assert deny signal **and** no forbidden side effect |
| Precedence tables | One test per row; assert winning branch             |




### 4.3 Red phase vs backfill

- **New behavior (full SDD):** red-phase — tests fail before implementation (REVIEW_GUIDE §2.3).
- **Backfill:** tests may pass against current code, but MUST fail under delete-the-implementation /
mutation check before merge.

---



## 5. Negative tests (`MUST NOT`)

A negative test proves the forbidden outcome is unreachable — not a vague `expect(…).toThrow()`.

### 5.1 Required assertions (all that apply)

1. **Deny signal** — 403/409/404, redirect, or SSR props for `AppBlockedView`.
2. **No side effect** — e.g. `teamId` unchanged; no acceptance row; subscription not linked.
3. **Invariant** — seats; cross-team membership.



### 5.2 Example

```ts
const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
const res = await acceptOpenInvitation({ userId, invitationId: teamBInvite });
expect(res.status).toBe(409);
const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
expect(after.teamId).toBe(before.teamId);
expect(
  await prisma.openInvitationAcceptance.count({ where: { openInvitationId: teamBInvite } }),
).toBe(0);
```



### 5.3 Waivers

Keep `Gap` + owner + reason (SDD Implementation gaps, Cursor plan, or PR note). Do not silently skip.

---



## 6. Fixtures and multi-tenancy

Tenants: `wald`, `bluehost`, `networkSolutions`, `hglatam`. Never assert tenant-specific behavior
without setting the tenant under test.

### 6.1 Builders (target)


| Builder                                                           | Seeds                                |
| ----------------------------------------------------------------- | ------------------------------------ |
| `createTestUser({ email, teamId? })`                              | `User`                               |
| `createTestTeam({ subscriptionStatus? })`                         | `Team`                               |
| `createPartnerSubscription({ email, skuId, status, teamId? })`    | `BluehostSubscription`               |
| `createEmailInvitation({ email, teamId, status: SENT })`          | `Invitation`                         |
| `createOpenInvitation({ teamId, limitToPrimaryDomain?, status })` | `OpenInvitation`                     |
| `createMarketplaceAccount({ email, entitlementStatus? })`         | `MarketplaceAccount` ± `Entitlement` |


Unique emails per test; truncate/cleanup with **localhost URL guard**
(`[e2e/helpers/database.ts](../../apps/next-js-app/e2e/helpers/database.ts)`).

### 6.2 Tenant under test

- Integration: inject via env / `getTenantConfig` boundary.
- E2E: document tenant env in file header.
- Partner purchase-required / Secure PIN: partner fixture required — Wald-direct E2E is not enough.



### 6.3 Database state


| Suite                 | Pattern                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Vitest integration    | Wipe/re-seed (or truncate allowlisted tables) before each test or `describe`             |
| Playwright E2E Mocked | `cleanDatabase` (localhost) + unique emails; mocks via `smartRoute`                      |
| Playwright E2E Live   | **Isolated transactional seeding** via control API (§8.3); cascade-delete in `afterEach` |


---



## 7. Mocking



### 7.1 Rules (always)

- Mock **third-party** systems at the boundary when running **E2E Mocked** or Vitest integration:
Stripe, WorkOS, LLMs, GCP Procurement, etc.
- Use a **real database** for integration and both E2E modes (Live uses staging/dev DB via seed API).
- **Never mock the thing under test** (Prisma client wholesale, or the helper whose behavior you claim to prove).
- **E2E Live:** do **not** intercept third-party traffic — `USE_MOCKS=false` and `smartRoute` must
`route.continue()`.



### 7.2 Where to mock


| Call site                                   | Technique                                                            |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Vitest integration (Node → Stripe/WorkOS/…) | Stub module / inject fake client; prefer small adapters              |
| Playwright E2E Mocked                       | `smartRoute` **only** — never raw `page.route` in new specs (§8.2)   |
| Playwright E2E Live                         | `smartRoute` no-ops intercepts (`USE_MOCKS=false`)                   |
| Auth in Mocked tests                        | `/api/fake-user/login` (or equivalent test auth)                     |
| Auth in Live tests                          | Real auth path for the target `TEST_ENV` (document secrets handling) |


Existing specs that call `page.route` directly MUST migrate to `smartRoute` when touched.

### 7.3 MSW (Node outbound) — deferred

MSW for Next.js **server→server** outbound HTTP (and dynamic handler control) remains **deferred §15**.
Browser-level Mocked vs Live is handled by `smartRoute` + `USE_MOCKS`, not MSW.

---



## 8. E2E: Mocked vs Live

Both modes are **first-class**. Agents writing Playwright specs MUST use the env + `smartRoute`
contract below — do not invent a second toggle.


| Kind           | When                       | Externals                     | Frequency                                     | Speed                      |
| -------------- | -------------------------- | ----------------------------- | --------------------------------------------- | -------------------------- |
| **E2E Mocked** | Critical UI journeys       | Intercepted via `smartRoute`  | PR + local (`USE_MOCKS=true`)                 | 5–15 s / test              |
| **E2E Live**   | Wiring smoke on real infra | Real (`smartRoute` continues) | Nightly / pre-deploy only (`USE_MOCKS=false`) | 20–45 s / test; sequential |


Keep journeys **thin**: a handful per domain (e.g. ≤4 for onboarding). Put branch matrices in
integration tests.

**Multi-role flows** (admin + member): use **separate Playwright browser contexts** in one test —
do not login/logout/login.

### 8.1 Environment variables


| Variable              | Values                                         | Meaning                                                  |
| --------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| `USE_MOCKS`           | `true` (default for PR) / `false`              | Whether `smartRoute` installs intercepts                 |
| `TEST_ENV`            | `local` / `dev` / `staging` (extend as needed) | Selects base URL and Live secrets profile                |
| `PLAYWRIGHT_BASE_URL` | URL                                            | Overrides base URL when set (existing Playwright config) |


Same spec file SHOULD be runnable under both modes when the journey is meaningful Live; otherwise
tag or place under `e2e/live/` and document why Mocked-only.

### 8.2 `smartRoute` (required helper)

Avoid raw `page.route` in new tests. Provide `e2e/helpers/smart-route.ts` (name flexible) that:

1. Reads `USE_MOCKS`.
2. If `USE_MOCKS` is true — registers the intercept and fulfills/continues as the test requests.
3. If `USE_MOCKS` is false — **must** call `route.continue()` (or skip registering) so Live runs do
  not hang on unhandled routes.

```ts
// Pseudocode contract
async function smartRoute(
  page: Page,
  url: string | RegExp,
  handler: (route: Route) => Promise<void>,
) {
  await page.route(url, async (route) => {
    if (process.env.USE_MOCKS === "false") {
      await route.continue();
      return;
    }
    await handler(route);
  });
}
```



### 8.3 E2E Live seeding (required with Live)

Do **not** share mutable global users across Live tests. Use **isolated transactional seeding**:

1. Hidden (or internal-only) Next.js control route(s) — e.g. under `/api/test-utils/…` — callable only
  when `NEXT_PUBLIC_ENVIRONMENT` / a dedicated test flag allows it (never in production).
2. Playwright `beforeEach`: create a unique user/team/subscription via that API.
3. Playwright `afterEach`: cascade-delete the same fixture via the API.

Document auth for the control API (shared secret header, etc.) in `e2e/README.md` when implemented.

### 8.4 CI wiring


| Pipeline             | Runs                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| PR                   | Static → unit → integration → **E2E Mocked** (`USE_MOCKS=true`)          |
| Nightly / pre-deploy | **E2E Live** (`USE_MOCKS=false`, `TEST_ENV=staging` or `dev`) sequential |


Live MUST NOT block every PR commit.

### 8.5 E2E assertion principles

**Principle:** Assert **user-observable outcomes** that prove the journey succeeded — not incidental
control states that happen for unrelated reasons. Prefer [Playwright web-first assertions](https://playwright.dev/docs/best-practices)
and [Testing Library’s guidance](https://testing-library.com/docs/guiding-principles): *The more your
tests resemble the way your software is used, the more confidence they give you.*

#### What to prove (outcome checklist)

Before writing locators, name the **claims** the test must establish. Example — chat after send:


| Claim                         | Why it matters                                      | Prefer asserting…                                                                 |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| LLM / chat request succeeded  | Wiring + auth + provider path works                 | `waitForResponse` on `/api/chat` with `response.ok()`                             |
| User turn persisted           | Prompt was accepted into the thread                 | Visible user message text (the prompt) in the conversation                        |
| Assistant response non-empty  | Stream produced content (not a silent/empty finish) | Stable UI that only appears when assistant `content` exists (e.g. export / copy)  |
| Streaming finished            | Idle after stream; not stuck mid-flight             | Send control **visible again** (replaces stop), or response actions visible       |
| User ready for next turn      | Composer usable again                               | Input **cleared** (`#chat-input-field` empty); send control visible again         |


Do **not** treat “send button enabled” as “stream finished.” Send is also disabled when the input is
empty (`input.trim().length === 0`). After send the app clears the input, so a disabled send is
**expected** and proves almost nothing about streaming.

#### Rules of thumb (community + this repo)

1. **Assert outcomes, not implementation details** — Prefer roles, labels, and visible copy over CSS
   classes or internal React state. Stable `id`s (`#pin-input`, `#chat-send-buttons`) are OK as
   explicit test hooks, not as a substitute for “what did the user achieve?”
2. **One claim → one strong signal** — Don’t stack redundant checks that all fail for the same root
   cause (e.g. empty input ⇒ disabled send ⇒ “not ready”).
3. **Combine network + UI for Live smoke** — Network proves the request path; UI proves the client
   finished streaming and re-entered an idle composer. Neither alone is enough for chat.
4. **Mocked vs Live content** — Mocked MAY assert exact assistant copy. Live MUST NOT depend on
   exact LLM wording; assert **shape** (non-empty response surfaced, stream idle, composer ready).
5. **Auto-wait; avoid sleeps** — Use Playwright `expect(…).toBeVisible()` / `toHaveValue()` with
   timeouts sized for Live (LLM latency). Do not `waitForTimeout` to “let the stream finish.”
6. **Prefer user-facing readiness** — “Ready to type again” = composer cleared + send visible
   again. Do not use placeholder-based roles for the composer: after the first message the
   placeholder changes (e.g. “Ask me anything…” → “Ask follow up…”). Use stable hooks such as
   `#chat-input-field`.
7. **Avoid brittle proxies** — If a control is gated by empty input, plan tier, or feature flags, do
   not use its enabled/disabled state as the sole completion signal.

## 9. Harness — current vs near-term



### 9.1 What exists today


| Capability                               | Status                                                               |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Vitest unit                              | Yes — few files; no DB harness                                       |
| Playwright E2E Mocked                    | Yes — `chat.spec.ts` (`smartRoute`), `maintenance.spec.ts`           |
| `smartRoute` + `USE_MOCKS` | **Adopted** — `e2e/helpers/smart-route.ts`, `e2e/helpers/e2e-config.ts` |
| E2E Live (`TEST_ENV=dev`) | **Adopted** — `nx e2e next-js-app --configuration=live-dev` |
| Live seed/teardown control API | **Missing** — required §8.3 for isolated Live fixtures (dev uses unique fake-user emails today) |
| `cleanDatabase` + localhost guard        | E2E Mocked only today                                                |
| Fake-user login                          | Yes (Mocked)                                                         |
| Vitest + real Postgres integration suite | **Missing**                                                          |
| Shared fixture builders                  | **Missing**                                                          |
| `node-mocks-http` helper                 | **Missing**                                                          |
| CI ephemeral Postgres for integration    | **Missing**                                                          |
| MSW Node bridge                          | Deferred §15                                                         |


Agents MUST NOT pretend missing or deferred harness already exists — but MUST follow §8 when adding
or migrating Playwright specs (`smartRoute`, not raw `page.route`).

### 9.2 Minimum viable integration harness (do this before large suites)

1. Vitest path with `POSTGRES_URL` → localhost or CI Postgres.
2. `tests/integration/helpers/db.ts` — truncate allowlisted tables; refuse non-localhost URLs.
3. Fixture builders (§6.1).
4. Call exported helpers **or** invoke Pages handlers via `node-mocks-http` (or equivalent).
5. Document CI `POSTGRES_URL` (service container or reuse E2E DB).

**Exit criteria:** one sample integration test creates a user (+ optional partner subscription) and
asserts a DB side effect in CI.

### 9.3 SSR decision logic

For precedence-heavy pages (e.g. `/onboarding`): extract a testable resolver when needed; integration-
test the matrix; keep one thin E2E for visible blocked vs invite vs redirect. Do not put the full
matrix only in Playwright.

---



## 10. Seam selection cheat sheet (onboarding example)


| Concern                       | Preferred seam                                     | Layer                                |
| ----------------------------- | -------------------------------------------------- | ------------------------------------ |
| Post-auth redirect            | `getPostAuthRedirectPath`                          | Unit                                 |
| Email access gate             | `checkEmailAccessForAuth`                          | Integration                          |
| Auto-provision / partner link | `createTeamForUser`                                | Integration                          |
| Open invitation               | accept guards + handler                            | Integration                          |
| `/onboarding` precedence      | Extracted resolver / SSR                           | Integration                          |
| Purchase-required UI          | SSR props + thin E2E                               | Integration + E2E Mocked             |
| First-run PIN / terms         | `get-user-information` / `accept-terms` + thin E2E | Integration + E2E Mocked             |
| Stripe CreateTeamFlow         | Payment helpers + `create-team`; mock Stripe       | Integration; avoid full Elements E2E |


UI chrome without a `MUST NOT`: no dedicated tests.

---



## 11. CI velocity (adopted intent)

Goal: high ship rate with high confidence on critical paths
(`[organization.md](../organization/organization.md)` — Product Lead owns API/DB integration tests;
DevOps owns CI that runs them on protected paths).


| Practice                          | Intent                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| **Fail fast**                     | Static → unit → integration → E2E Mocked; stop on first stage failure                |
| **PR time budget**                | Aim for PR checks to finish in **< 10–12 minutes** once harness exists               |
| **Ephemeral DB**                  | Integration tests against temporary Postgres in CI (Docker service / Testcontainers) |
| **E2E Mocked on PR**              | `USE_MOCKS=true`; no Live on every commit                                            |
| **E2E Live nightly / pre-deploy** | `USE_MOCKS=false`; sequential; staging/dev secrets                                   |
| **Shard E2E Mocked**              | Playwright sharding when Mocked suite size justifies it                              |


Wire Live into a scheduled (or pre-deploy) workflow when §8.2–§8.3 land — do not block the first
integration harness PR on Live CI, but do not treat Live as optional forever.

Release mechanics (feature flags, canary %, migration expand/contract) are **DevOps / deploy
policy**, not this guide — see §15.

---



## 12. Traceability and PR expectations

1. Update SDD **Test mapping** (`Gap` → path + rule id).
2. Name tests with rule IDs (§3.3).
3. PR description: review tier + whether negative tests were added.
4. Full SDD new work: red-phase evidence before implementation.
5. Domain indexes (e.g. onboarding Test inventory) are non-binding; SDD table wins.

---



## 13. Anti-patterns (agents)


| Do not                                            | Why                                                  |
| ------------------------------------------------- | ---------------------------------------------------- |
| Snapshot entire React trees for SSR branches      | Brittle; no DB proof                                 |
| Mock the helper under test                        | Tautology                                            |
| One giant E2E per Gap row                         | Wrong layer; flaky; blows PR budget                  |
| Assert only copy/toasts for authz                 | Misses side effects                                  |
| Use non-localhost DB URLs                         | Safety guard                                         |
| Invent MSW mid-feature without a harness decision | Overhead; use `smartRoute` for E2E Mocked            |
| Raw `page.route` in new Playwright specs          | Bypasses `USE_MOCKS`; breaks Live — use `smartRoute` |
| Run E2E Live on every PR                          | Blows time budget; use nightly / pre-deploy          |
| Assert send enabled after chat send (Live)        | Input clears → send stays disabled; see §8.5         |
| Exact LLM copy in Live E2E                        | Non-deterministic; assert shape / idle / ready (§8.5)|
| Skip partner/GMP because local tenant is `wald`   | Critical gaps                                        |
| Chase line coverage %                             | Wrong goal (§2.1)                                    |
| Weaken a `MUST NOT` to green CI                   | Needs superseding ADR                                |


---



## 14. Validating AI-written tests

1. **Delete-the-implementation:** guard removed → test fails for the right reason.
2. Assert **outcomes**, not private call order (E2E: §8.5).
3. Humans review **assertions + fixtures**, not coverage %.
4. Spot-mutate one condition (invert `if`, drop seat check) when stakes are high.

---



## 15. Deferred (explicit)

Do **not** implement these in the first onboarding/integration harness PRs unless a PR is
specifically scoped to them. Agents MUST NOT scaffold them “while here.”

**Not deferred:** E2E Mocked vs E2E Live, `USE_MOCKS`, `smartRoute`, `TEST_ENV`, and the Live
seed/teardown control API — those are **required** (§8). Land them as dedicated E2E-harness work
alongside or right after the Vitest integration harness.


| Item                                                                                   | Why defer                                                                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **MSW** as default Node outbound mock (incl. `--require` into Next dev server)         | Platform work; Vitest stubs + `smartRoute` cover Mocked E2E browser traffic                                |
| **Hidden** `/api/test-utils/msw-control` to flip MSW handlers from Playwright          | Couples app to MSW; not needed for Mocked/Live toggle                                                      |
| **JSON response dumper** (record real payloads → fixture files)                        | Nice-to-have after fixtures exist by hand                                                                  |
| **Playwright matrix sharding in CI**                                                   | After Mocked E2E count justifies runner cost                                                               |
| **Canary traffic %, feature-flag release decoupling, migration expand/contract rules** | Deploy/release policy — own under DevOps docs / `[engineering/deployment/](../engineering/deployment/)`, not agent test generation |
| **Full Stripe Elements CreateTeamFlow E2E**                                            | Flaky; cover payment APIs in integration                                                                   |
| **Real WorkOS OAuth / live GCP Procurement inside E2E Mocked**                         | Mocked mode uses fakes; Live may hit real providers only where the journey requires it                     |


When a deferred item is adopted, update this section (move the row into §3.4 / §7 / §11) in the same
PR that lands the tooling.

---



## 16. Relationship to other docs


| Doc                                                  | Role                                                    |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `[REVIEW_GUIDE.md](./REVIEW_GUIDE.md)`               | Canonical Testing Trophy **strategy** + review gates    |
| **This guide**                                       | How agents generate tests; CI/mocking ops for this repo |
| SDD Test mapping                                     | Per-rule backlog / evidence                             |
| Cursor domain plans                                  | Prioritized case lists — must not redefine Trophy       |
| `[organization.md](../organization/organization.md)` | Product Lead / DevOps / Manual QA accountability        |
| `apps/next-js-app/e2e/README.md`                     | How to run Playwright locally                           |


