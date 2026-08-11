---
kind: testing-guide
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
---

# Testing Guide

**Canonical for how to write and generate automated tests** in GloX. Agents MUST read this before
generating tests for critical-area work. Humans use it when reviewing AI-written tests.

| Question | Read instead |
| --- | --- |
| Review gates, Testing Trophy, red-phase TDD | [REVIEW_GUIDE.md](./REVIEW_GUIDE.md) §2 |
| EARS rules → Gap / test rows in SDDs | [spec-authoring.md](../engineering/spec-authoring.md) §2–3 |
| Workflow / when full SDD applies | [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) |
| Who owns integration / CI / QA | [organization.md](../organization/organization.md) |

**Naming:** This repo uses the **Testing Trophy** (static → unit → **integration bulk** → thin E2E).
Do not introduce alternate shape names in specs or AGENTS.md.

---

## 1. Testing Trophy — GloX interpretation

Follow [Kent C. Dodds' Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
as stated in REVIEW_GUIDE §2:

```
        ╱╲
       ╱E2E╲          Thin — browser journeys (when Playwright is added)
      ╱──────╲
     ╱ Integr.╲       Bulk — server functions, domain helpers, real Postgres
    ╱──────────╲
   ╱    Unit    ╲     Narrow — pure transforms (FTML URI rewrite, text offsets)
  ╱──────────────╲
 ╱ Static analysis ╲  Always — `pnpm typecheck`, lint when added
╱────────────────────╲
```

### 1.1 Coverage goal

Do **not** chase 100% line coverage. Chase **feature coverage** on critical areas
([AGENTS.md](../../AGENTS.md)): auth & sessions, document ownership, FloDown block lifecycle,
symbol propagation, FTML/sTeX export, role gates — especially every SDD `MUST NOT`.

### 1.2 Layers

| Layer | Use for | Do not use for | Speed (guidance) |
| --- | --- | --- | --- |
| **Static** | `pnpm typecheck` | Business rules | PR gate |
| **Unit (Vitest)** | Pure functions (no I/O) | Prisma-wrapped helpers | < 50 ms / test |
| **Integration (Vitest + DB)** | `src/serverFns/*`, `src/server/*` with real Postgres | Full browser UI | 100–500 ms / test |
| **E2E (Playwright)** | Critical UI journeys | Branch matrices | Deferred — not configured yet |

**Critical-area mandate:** every `MUST NOT` in the governing SDD MUST have an automated negative test
(or explicit `Gap` + owner in the SDD Test mapping).

---

## 2. Layout and runners

GloX is a **single TanStack Start app** at repo root — not a monorepo with separate app packages.

| Kind | Location (target) | Runner |
| --- | --- | --- |
| Unit | Colocated `*.test.ts` next to pure helpers | `pnpm test` (Vitest) |
| Integration | `src/**/*.integration.test.ts` or `tests/integration/` | `pnpm test` + `DATABASE_URL` |
| E2E | `e2e/*.spec.ts` (future) | Playwright — **not configured yet** |

**Today:** Vitest is wired (`pnpm test`) but **no test files exist yet**. Priority seams for first
integration tests:

| Seam | Path | Why critical |
| --- | --- | --- |
| Auth / session | `src/serverFns/login.server.ts`, `src/server/auth/requireUser.ts` | JWT + password fingerprint |
| Document ownership | `src/serverFns/deleteDocument.server.ts`, `myDocuments.server.ts` | AGENTS.md guardrail |
| FloDown cascade | `src/server/floDownBlockDeletion.ts` | Symref rewrite on delete |
| FTML export | `src/server/ftml/generateStexFromFtml.ts` | MathHub URI correctness |
| LLM suggestions | `src/serverFns/llmSuggestion.server.ts` | Auth-scoped, no auto-persist (`E-OPENAI-03`) |

### 2.1 Naming

| Pattern | Meaning |
| --- | --- |
| `foo.test.ts` | Unit (no DB) |
| `foo.integration.test.ts` | Integration (real DB; externals mocked) |
| `e2e/bar.spec.ts` | Playwright (future) |

Name cases with **rule IDs** when mapped:

```ts
it("S-FLO-03 MUST NOT delete block without rewriting symrefs in sibling blocks", async () => {
  // …
});
```

---

## 3. Spec → test workflow

SDD **Test mapping** (`SDD rule | PRD rule | Test`) is the backlog.

### 3.1 For each `Gap` row

1. Read the EARS rule (and **Rationale**).
2. Choose layer (§1.2).
3. Write the smallest test that **fails if the rule is deleted or inverted**.
4. One focused case per rule when practical.
5. After CI green, replace `Gap` with a file pointer + rule id.

### 3.2 Positive vs negative

| Rule shape | Test shape |
| --- | --- |
| `MUST <do X>` | Assert X (DB row, redirect, exported sTeX fragment) |
| `MUST NOT <do Y>` | Assert deny signal **and** no forbidden side effect |

### 3.3 Red phase vs backfill

- **New behavior (full SDD):** tests fail before implementation (REVIEW_GUIDE §2.3).
- **Backfill:** tests may pass against current code but MUST fail under delete-the-implementation check.

---

## 4. Negative tests (`MUST NOT`)

A negative test proves the forbidden outcome is unreachable.

### 4.1 Required assertions (all that apply)

1. **Deny signal** — thrown error, forbidden UI state, or empty result set.
2. **No side effect** — e.g. `document.ownerId` unchanged; no FloDown block deleted; no symref rewritten incorrectly.
3. **Invariant** — role unchanged; block version history intact.

### 4.2 Example (document ownership)

```ts
const doc = await createTestDocument({ ownerId: userA });
await expect(
  deleteDocumentAsUser({ documentId: doc.id, userId: userB }),
).rejects.toThrow(/forbidden|not authorized/i);
const still = await prisma.document.findUnique({ where: { id: doc.id } });
expect(still).not.toBeNull();
```

### 4.3 Waivers

Keep `Gap` + owner + reason in the SDD Test mapping. Do not silently skip.

---

## 5. Fixtures and roles

GloX uses **roles**, not multi-tenant deployments:

| Role | Typical capabilities |
| --- | --- |
| `EXTRACTOR` | Upload, extract, annotate |
| `CURATOR` | Curation, symbol management, export prep |
| `ADMIN` | User management, cross-user reads where allowed |

### 5.1 Builders (target)

| Builder | Seeds |
| --- | --- |
| `createTestUser({ email, role, verified? })` | `User` |
| `createTestDocument({ ownerId, … })` | `Document` + pages |
| `createFloDownBlock({ documentId, statement })` | `FloDownBlock` |

Unique emails per test; truncate/cleanup with **localhost URL guard** on `DATABASE_URL`.

### 5.2 Database state

| Suite | Pattern |
| --- | --- |
| Vitest integration | Wipe/re-seed allowlisted tables before each test or `describe` |
| Future E2E | Isolated fixtures per test — no shared global users |

---

## 6. Mocking

### 6.1 Rules

- Mock **third-party** systems at the boundary: OpenAI, MathHub HTTP, nodemailer.
- Use a **real database** for integration tests.
- **Never mock the thing under test** (whole Prisma client, or the deletion helper you claim to prove).
- LLM output tests: assert caching and auth boundaries — not exact model wording.

### 6.2 Where to mock

| Call site | Technique |
| --- | --- |
| Vitest integration | Stub `openai` module or inject fake client |
| FloDown / MathHub | Stub `fetch` or mock `initFloDown` boundary in UI tests |
| Email | Stub nodemailer in auth/signup tests |

---

## 7. Harness — current vs near-term

| Capability | Status |
| --- | --- |
| Vitest runner | **Adopted** — `pnpm test` |
| Test files | **Missing** — zero `*.test.ts` in repo |
| Vitest + Postgres integration | **Missing** — priority |
| Fixture builders | **Missing** |
| Playwright E2E | **Not configured** |
| CI test job | **Missing** |

Agents MUST NOT pretend missing harness already exists.

### 7.1 Minimum viable integration harness

1. Vitest config with `DATABASE_URL` → localhost test DB.
2. `tests/integration/helpers/db.ts` — truncate allowlisted tables; refuse non-localhost URLs.
3. Fixture builders (§5.1).
4. Call server handlers or exported `src/server/` functions directly.
5. One sample test: create user + document, assert ownership gate.

**Exit criteria:** one integration test runs in CI against ephemeral Postgres.

---

## 8. Seam selection (GloX examples)

| Concern | Preferred seam | Layer |
| --- | --- | --- |
| Login before email verified | `login.server.ts` | Integration |
| Password fingerprint invalidation | `requireUser.ts` | Integration |
| Document upload ownership | `upload.server.ts` | Integration |
| FloDown block delete + symref cascade | `floDownBlockDeletion.ts` | Integration |
| Symbol propagation URI replace | `SymbolPropagation.server.ts` | Integration |
| sTeX URI rewrite | `generateStexFromFtml.ts` | Unit + integration |
| LLM suggestion auth scope | `llmSuggestion.server.ts` | Integration |
| FloDown preview mount | `FtmlPreview.tsx` | E2E (future) |

---

## 9. Anti-patterns (agents)

| Do not | Why |
| --- | --- |
| Mock the helper under test | Tautology |
| Assert only toast copy for authz | Misses DB side effects |
| Use non-localhost `DATABASE_URL` in tests | Safety |
| Auto-persist LLM output in tests | Violates `E-OPENAI-03` product model |
| Skip role-gate tests because “admin can do anything” | EXTRACTOR vs CURATOR gaps |
| Chase line coverage % | Wrong goal (§1.1) |
| Weaken a `MUST NOT` to green CI | Needs superseding ADR |

---

## 10. Validating AI-written tests

1. **Delete-the-implementation:** guard removed → test fails for the right reason.
2. Assert **outcomes**, not private call order.
3. Humans review **assertions + fixtures**, not coverage %.

---

## 11. Relationship to other docs

| Doc | Role |
| --- | --- |
| [REVIEW_GUIDE.md](./REVIEW_GUIDE.md) | Testing Trophy **strategy** + review gates |
| **This guide** | How agents generate tests for GloX |
| SDD Test mapping | Per-rule backlog / evidence |
| [backend-skill](../../.cursor/skills/backend-skill/SKILL.md) | Server function conventions |
| [organization.md](../organization/organization.md) | Accountability |
