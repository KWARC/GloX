---

## kind: review-guide
canonical_for:
  - review-process
  - testing-trophy
informed_by:
  - /specs/engineering/spec-authoring.md
  - /specs/ai-native-development-architecture.md
  - /AGENTS.md
see_also:
  - /specs/DEVELOPER_GUIDE.md
  - /specs/review/TESTING_GUIDE.md
applies_to:
  - intent-contracts
  - opsx-delta
  - plan-mode
  - verify-post-review
  - code-pr

# Review Guide

Two review regimes:

1. **Upstream review (strict)** — specs, deltas, plans: line-by-line, nothing missed, mutual understanding.
2. **Code review (tiered)** — depth scales with **cost of failure**, not line count.

**Canonical for review process** (upstream checklists, **Testing Trophy**, tiered code review, sign-off).
Product rules in `/specs/`; spec craft in
`[spec-authoring.md](../engineering/spec-authoring.md)`; workflow in
`[DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)`.

---

## Part 1 — Upstream review (strict)

Applies to:

- PRDs in `/specs/prds/`
- OPSX delta specs in `/specs/changes/` (`clarify.md`, `proposal.md`, `design.md`, `tasks.md`) — **full SDD plan of record; one set per branch**
- Plan Mode output — **lightweight plan of record** (IDE session; optional scratch during full SDD Explore)
- Changes to canonical SDDs in `/specs/engineering/features/` at Archive time

**Bar:** Author and reviewer must understand every line. Reviewer can explain each rule without
reading code. No “LGTM” without completing the checklist.

### 1.1 When upstream review is required

| Artifact                                                            | Required before                                                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| OPSX delta (`clarify.md`, `proposal`, `design`, `tasks`) — full SDD | **Propose** after signed `clarify.md`; **Apply** after approved deltas |
| Plan Mode output — lightweight only                                 | **Any code generation** (plan MUST include Archive / spec sync)      |
| PRD change                                                          | **Merge** of the PR that depends on it                                 |
| Verify (post-review) — full SDD                                     | **Archive** (fold + move to `archive/`)                              |
| Archive (fold delta → canonical + dated archive)                    | **Merge** of implementation PR                                         |

Full SDD: upstream review targets the **committed delta files**, not an IDE-only Plan Mode draft.
Lightweight: Plan Mode output is the approval artifact ([DEVELOPER_GUIDE §3](../DEVELOPER_GUIDE.md#3-lightweight-path-default)).

### 1.2 Upstream review checklist

Agent preparation: use skill [`opsx-propose`](../../.cursor/skills/opsx-propose/SKILL.md). Checklists below remain canonical — execute every item.

Reviewer signs off only when **all** items pass:

- [ ] **Completeness:** Every open question from Clarify is resolved in `clarify.md` or explicitly deferred with an owner and date.
- [ ] **EARS / rules:** Each critical-area rule uses EARS (or plain bullets where allowed). Every `MUST NOT`
      has a planned negative test, or an explicit waiver with an accountable owner.
- [ ] **Rationale:** Non-obvious rules include a **Rationale** note (see [spec-authoring §2.1](../engineering/spec-authoring.md#21-expectation--rationale)).
- [ ] **Decision alignment:** The spec does not conflict with `/specs/engineering/decisions/`. If it supersedes an existing `D-*` atom, add or supersede in a decision file.
- [ ] **Compliance:** The spec does not conflict with `/specs/prds/compliance/`. On contradiction, halt and escalate per
      [`organization.md`](../organization/organization.md).
- [ ] **DRY / links:** Each rule is defined once. Cross-references and frontmatter `upstream`, `compliance`, and `code`
      fields resolve to real files.
- [ ] **PRD precision:** Each **Product** rule can be taught back without reading the SDD. Exceptions name the rule ID they apply to. Rules that block access state the user-visible outcome. Business rules use `### Product outcomes` and `### Binding operator / compliance promises` (Binding may be N/A). Each Binding rule is thin and its Rationale **names an incident class**. PRD EARS lines have no stack nouns (routes, algorithms, impl flags) — [spec-authoring §3.1.1](../engineering/spec-authoring.md#prd-layering). See also [§3.1.1 precision](../engineering/spec-authoring.md#311-prd-precision-anti-vagueness) and [§7](../engineering/spec-authoring.md#what-belongs-in-prd-sdd-and-code). For PRD changes, `pnpm run specs:check-prd-prose` passes.
- [ ] **SDD prose:** Architecture boundaries use a **Layer | Responsibility** table with a full sentence in each Responsibility cell. See [spec-authoring §3.2.1](../engineering/spec-authoring.md#321-sdd-prose). For SDD changes, `pnpm run specs:check-sdd-prose` passes.
- [ ] **Agent-authored specs:** Make sure that the specc doesn't have common errors made by AI agents. See [spec-authoring §3.4](../engineering/spec-authoring.md#agent-review-gate).
- [ ] **Glossary:** Preferred labels and term IDs match `[domain-dictionary.yaml](../meta/domain-dictionary.yaml)`.
      Binding specs do not use `deprecated_synonyms`. New or reused domain phrases have dictionary entries
      ([spec-authoring §8.2](../engineering/spec-authoring.md#82-when-to-add-or-change-a-term)). See [spec-authoring §8](../engineering/spec-authoring.md#8-domain-dictionary--glossary).
- [ ] **Tasks:** Each step in `tasks.md` is atomic, ordered, and checkable one at a time.
- [ ] **Test mapping:** Each EARS rule traces to a test (integration preferred) or a documented gap with an owner.
- [ ] **Structure:** The document matches `[prds/_TEMPLATE/](../prds/_TEMPLATE/)` or `[features/_TEMPLATE/](../engineering/features/_TEMPLATE/)` section order. When a featured
      example exists for that doc type, it mirrors the [`feature.md`](../engineering/feature.md) layout: rule IDs,
      Traceability and Test mapping tables, and no forbidden language per [spec-authoring §2.3](../engineering/spec-authoring.md#23-forbidden-language-in-binding-specs).
- [ ] **Teach-back:** The reviewer can paraphrase each rule and its rationale to the author without notes.

#### 1.2.0 Clarify (`clarify.md`)

Canonical: [CLARIFY_AND_PROPOSE.md](../changes/CLARIFY_AND_PROPOSE.md). Template:
`[changes/_TEMPLATE/clarify.md](../changes/_TEMPLATE/clarify.md)`. No `proposal.md`, `design.md`, or
`tasks.md` until `clarify.md` is signed (**Lock it**).

- [ ] The feature request (input) matches the work you received.
- [ ] **Restatement:** The PM or requester approved the restatement. The stated outcome matches what they asked for, or the adjustment is documented.
- [ ] **Upstream audit:** The author completed the upstream audit. Specs were read, ADR alignment was checked, and compliance passed or HALT was escalated with an owner.
- [ ] **Open questions:** No blocking questions remain unresolved. Every deferral has an owner and a date.
- [ ] **Options:** An approach was chosen (with the PM when tradeoffs matter), or the section is marked N/A and the recommendation was accepted.
- [ ] **v1 scope:** v1 is minimal and shippable. When scope was split or deferred, **non-goals / v2** are recorded.
- [ ] **PRD change decision:** The author confirmed either a PRD delta or **No PRD change**.
- [ ] **Accepted tradeoffs:** When the feature request was adjusted (P2), the engineer and PM agreed on the tradeoffs.
- [ ] **Human decisions:** The human decisions checklist is complete and **Lock it — sign-off** is present.

#### 1.2.1 `proposal.md` (what)

Template: `[changes/_TEMPLATE/proposal.md](../changes/_TEMPLATE/proposal.md)`.

- [ ] **Intent and scope:** The section states why the work is needed and what v1 delivers. It matches the signed `clarify.md`.
- [ ] **Non-goals** and **Iteration plan:** Both sections match `clarify.md`. v1 rules contain no v2 work.
- [ ] **Upstream audit:** The specs-read list is complete for this domain.
- [ ] **PRD delta:** The section uses **outcome** EARS or an explicit `**No PRD change`** statement, with governing links listed.
- [ ] **Resolved questions:** This section matches `clarify.md`, including options, tradeoffs, and engineer + PM decisions when the feature request was adjusted.
- [ ] **Upstream links:** Links point at compliance, commercial, product, and existing PRDs. Canon is not duplicated here.
- [ ] The proposal contains no implementation detail that belongs in `design.md`.

#### 1.2.2 `design.md` (how)

Template: `[changes/_TEMPLATE/design.md](../changes/_TEMPLATE/design.md)`.

- [ ] **SDD delta:** The section states policy and phase order in prose, not pseudo-code. See [spec-authoring §7](../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).
- [ ] **Boundaries:** The section names the files, data, tenants, and blast radius affected.
- [ ] **Decision alignment:** The section cites relevant `D-*` atoms or names a superseding decision draft.
- [ ] **Operations:** The section links vendor or deployment facts, or states N/A.
- [ ] **Test mapping:** The table lists every rule from `proposal.md` and `design.md` with a mapped test. Every `MUST NOT` has a planned negative test.
- [ ] Every PRD rule in `proposal.md` traces to design and to a test.

#### 1.2.3 `tasks.md` (do)

Template: `[changes/_TEMPLATE/tasks.md](../changes/_TEMPLATE/tasks.md)`.

- [ ] **Red phase:** Red-phase tasks precede implementation tasks. Tests must fail before implementation code is written.
- [ ] Each step cites `proposal.md` or `design.md` and introduces **no new requirements**.
- [ ] Steps are atomic, ordered, and checkable one at a time.

### 1.3 Plan Mode review (lightweight only)

Applies when the author chose **lightweight** mode ([DEVELOPER_GUIDE §3](../DEVELOPER_GUIDE.md#3-lightweight-path-default)).
In **full SDD**, review the OPSX delta files per §1.2 instead; Plan Mode during Explore is scratch
work and does not gate Apply.

Plan review uses the same strict bar, scoped to the plan:

- [ ] The plan scope matches the chosen mode (lightweight vs full SDD).
- [ ] The plan names the files and boundaries to touch. For critical areas, blast radius is acknowledged.
- [ ] The plan states the test approach, including negative tests when the work touches a critical area.
- [ ] **Archive (spec sync):** The plan includes a step to check whether any canonical specs need updating
      for the code change, and either update them in the PR or record **No spec change**.
- [ ] No code is written until the reviewer explicitly approves the plan.

### 1.4 Upstream sign-off

Record in PR description or delta folder (e.g. `proposal.md` footer):

```
Upstream review: <reviewer name> — <date>
Scope: <delta | plan | contract | archive>
Teach-back: confirmed
```

### 1.5 Verify (post-review, full SDD)

<a id="15-verify-post-review-full-sdd"></a>

**When:** After Apply, the agent has confirmed tests run, the human has made the PR ready for review,
and **tiered code review + fixes are complete**. Verify is the last gate before Archive.

**Who:** The agent runs the checklist and reports results. The human gives a **cursory** sign-off
(enough to confirm the report is plausible — not a second line-by-line upstream review).

**Agent execution:** skill [`opsx-verify`](../../.cursor/skills/opsx-verify/SKILL.md). Checklist below remains canonical.

**Mismatch:** If Verify finds a gap, the agent **informs the human**. The human decides whether to
fix **code** to match the signed deltas or update the **deltas** to match the accepted implementation.
Re-run Verify after the fix.

Agent checklist (all must pass or have an explicit human-owned waiver):

- [ ] Every `tasks.md` implementation item is done (or explicitly deferred with owner).
- [ ] Mapped tests are green; every `MUST NOT` has a passing negative test (or waiver with owner).
- [ ] `design.md` decisions are reflected in the shipped code (not only “tests passed”).
- [ ] `proposal.md` PRD delta (or **No PRD change**) matches what shipped.
- [ ] Teach-back: agent can summarize each shipped rule without relying only on the git diff.

**Sign-off** (PR description or `tasks.md` footer):

```
Verify: <agent run date>
Human sign-off (cursory): <name> — <date>
Outcome: pass | waivers: <list>
```

**Blocks Archive** until human cursory sign-off is recorded.

---

## Part 2 — Testing Trophy (full SDD)

**Canonical for test strategy.** Follow the [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications):
static analysis at the base, **integration tests as the bulk**, unit tests for pure logic only, thin E2E on top.

**Operational playbook** (layout, fixtures, mocking, E2E Mocked vs Live, CI budgets, deferred items):
`[TESTING_GUIDE.md](./TESTING_GUIDE.md)`. Onboarding backfill priorities: Cursor plan _Onboarding Tests Backfill_.

- **Static analysis foundation** — TypeScript strict + ESLint/Biome before tests.
- **Integration tests (bulk)** — API routes, auth enforcement, DB boundaries with real Postgres
  (CI ephemeral Postgres / Testcontainers — see TESTING_GUIDE §9 / §11 for what exists today).
- **Unit tests** — pure logic only (calculations, transforms, validation).
- **Thin E2E** — **E2E Mocked** on PR (`USE_MOCKS` + `smartRoute`); **E2E Live** nightly/pre-deploy
  (TESTING_GUIDE §8). Both required; Live is not a PR gate.
- **Coverage goal** — critical-area feature coverage (esp. every `MUST NOT`), not 100% lines
  (TESTING_GUIDE §2.1).
- **Mandatory negative testing** — violate every `MUST NOT` in EARS rules.

### 2.1 Mocking

- Mock **third-party APIs** (Stripe, WorkOS, LLMs) at the system boundary for integration and
  **E2E Mocked**; Playwright MUST use `smartRoute` / `USE_MOCKS` (TESTING_GUIDE §8). **E2E Live**
  continues routes (no intercepts). MSW for Node outbound remains deferred (TESTING_GUIDE §15).
- Use **real database** for integration tests.
- **Never mock the thing under test** — tautology tests pass when implementation is deleted.

### 2.2 Validating AI-written tests

- **Delete-the-implementation heuristic:** if you delete the implementation, does the test fail for the right reason?
- **Mutation testing** on AI-generated suites when stakes are high.
- Human review focuses on **assertions**, not coverage %.

### 2.3 Test-first sequence (full SDD)

1. Human locks EARS rules in the delta spec.
2. AI generates integration/E2E tests.
3. **Red phase:** tests **must fail** before implementation.
4. Human audits assertions (§2.2).
5. AI writes code to satisfy tests.

---

## Part 3 — Code review (tiered by cost of failure)

Not all code is equal. **Review depth follows impact**, not vanity metrics like lines changed.

**Override:** Any change in an `[AGENTS.md](../../AGENTS.md)` **critical area** (LLM routing, sanitization,
auth/tenancy, billing, encryption, onboarding flows, etc.) is reviewed at **Tier 1** minimum for the affected layers —
even if the diff is small.

### 3.1 Review tiers (low → high impact)

| Tier  | Layer                               | Review depth   | Sufficient evidence                                                                                                                                           |
| ----- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5** | CSS / styling                       | **Smoke**      | Run app; check layout at mobile, tablet, desktop. Visual regression acceptable. Author has demonstrated CSS competence — no line-by-line CSS review required. |
| **4** | HTML / JSX structure                | **Light**      | Correct semantics and accessibility basics; spot-check key flows in browser.                                                                                  |
| **3** | Frontend state management           | **Moderate**   | Trace data flow for the feature; verify loading/error/empty states; no obvious stale closures or missing deps on critical paths.                              |
| **2** | Client API calls                    | **Moderate+**  | Correct endpoints, payloads, error handling; auth headers not leaked; aligns with API contract.                                                               |
| **1** | General API / server code           | **Thorough**   | Logic, edge cases, observability, failure modes; integration tests pass.                                                                                      |
| **1** | Database queries (Prisma/SQL)       | **Thorough**   | Query correctness, N+1, tenant scoping, migration safety; integration tests with real DB.                                                                     |
| **0** | API authorization checks            | **Exhaustive** | Every route re-validates authz (not middleware alone); negative tests for forbidden access; cross-tenant isolation verified.                                  |
| **0** | Database schema (Prisma migrations) | **Exhaustive** | Discussed before implementation; reviewer understands every column/index/RLS implication; rollback considered.                                                |

**Mnemonic (low → high):** CSS → JSX → state → client fetch → server/API → DB queries → **authz** → **schema**.

### 3.2 What each tier means in practice

**Tier 5 — CSS (vibe-code friendly)**

- LLM-generated or hand-written CSS is fine if the author understands CSS fundamentals.
- Reviewer does **not** read every rule. **Do** run the UI at multiple viewport sizes and confirm the feature works.
- Escalate to Tier 4+ if CSS touches layout that affects security-sensitive UI (e.g. hiding paywalls, admin controls).

**Tier 4 — JSX**

- Spot-check structure, conditional rendering, and user-visible copy.
- No need to review every presentational component if Tier 5 smoke passes.

**Tier 3 — Frontend state**

- Focus on state that crosses API boundaries or affects billing/auth/engine selection.
- Hooks and context that only affect local UI can stay lighter.

**Tier 2 — Client API calls**

- Verify the call matches server contract; errors surfaced to user; no secrets in client bundle.

**Tier 1 — Server code & DB queries**

- Read logic carefully; require integration tests for new behavior.
- Prisma changes that are **data-only** (no authz) stay Tier 1; **schema shape** changes bump to Tier 0.

**Tier 0 — Authz & schema (non-negotiable)**

- Must be **understood, discussed, and reviewed** before merge.
- Schema migrations: review in a dedicated pass; author explains rollout and backfill.
- Authz: reviewer traces caller → permission check → data scope; mandatory negative tests for `MUST NOT`
  paths in critical areas.

### 3.3 Code review checklist (by PR)

**Always (every PR):**

- [ ] CI is green (types, lint, tests).
- [ ] If critical-area behavior changed, the spec was updated in the same commit.
- [ ] The highest tier touched in the PR is identified in the PR description or review thread.

**Tier 5–4 (presentation):**

- [ ] The app was run locally and the feature was verified at multiple breakpoints.
- [ ] Admin-only UI is not accidentally exposed.

**Tier 3–2 (client logic):**

- [ ] The happy path and primary error path were exercised.
- [ ] Client logs contain no secrets or PII.
- [ ] New/changed UI follows [frontend-skill](../../.cursor/skills/frontend-skill/SKILL.md) (TanStack Query, MUI `sx`, typed `interfaces/spec` wrappers).

**Tier 1 (server / queries):**

- [ ] Integration tests cover new seams. Mocks are used only at external providers.
- [ ] The delete-the-implementation heuristic passes for new tests (§2.2).
- [ ] New/changed API routes follow [backend-skill](../../.cursor/skills/backend-skill/SKILL.md) (auth from token, status codes, `interfaces/spec`).

**Tier 0 (authz / schema):**

- [ ] Pre-implementation discussion occurred and is linked in the PR.
- [ ] Negative tests cover forbidden access and cross-tenant leakage.
- [ ] A migration plan is stated (deploy order, backfill, rollback).
- [ ] When the author is junior on that layer, a second reviewer for Tier 0 is recommended.

### 3.4 Critical-area bump

If the PR touches a critical area (`[AGENTS.md](../../AGENTS.md)` § Critical areas), apply:

| Layer in PR                                      | Minimum review tier                              |
| ------------------------------------------------ | ------------------------------------------------ |
| Any                                              | Upstream spec/plan review completed (Part 1)     |
| Routing, sanitization, billing, encryption logic | **Tier 1** for code; **Tier 0** for authz/schema |
| New API route                                    | **Tier 0** for authz on that route               |
| `schema.prisma` change                           | **Tier 0** always                                |

### 3.5 Code review sign-off

```
Code review: <reviewer name> — <date>
Highest tier: <0–5>
Critical area: yes | no
Tier 0 discussed pre-impl: yes | n/a
```

---

## Part 4 — Relationship between upstream, testing, code review, and Verify

| Stage                     | Strict? | Why                                     |
| ------------------------- | ------- | --------------------------------------- |
| Spec / PRD / delta / plan | **Yes** | Cheap to fix; errors compound in code   |
| CSS / presentation code   | **No**  | Low blast radius; visual smoke suffices |
| Authz / schema            | **Yes** | Incidents, compliance, data loss        |
| Verify (post-review)      | **Cursory human + agent checklist** | Confirms artifacts ↔ implementation before Archive |

Upstream review catches _wrong problem_. Tiered code review catches _wrong implementation_ — with effort
proportional to risk. Verify catches _drift between signed deltas and what shipped_ before folding
into canonical specs.

---

## Part 5 — Future exploration (not formalized yet)

Use the review tiers and checklists **informally** for now. Let practice evolve before adding GitHub
automation, required labels, or branch-protection rules. Revisit this section when informal trial
feels stable.

### Process habits worth trying now (no tooling required)

| Practice                                                     | Notes                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Call out highest tier** in PR description or review thread | e.g. "tier-5 CSS only" or "tier-0 schema"                                                   |
| **Upstream sign-off** in PR text for full SDD                | Use the blocks in §1.4 and §3.5                                                             |
| **Verify sign-off** before Archive (full SDD)                | Use the block in §1.5                                                                       |
| **Stacked PRs for full SDD**                                 | Spec/delta PR first, implementation PR second — avoids reviewing code before spec is locked |
| **Discuss Tier 0 before code**                               | Slack/issue thread or draft PR before authz/schema work                                     |
| **Second reviewer on Tier 0**                                | Especially when author is junior on that layer                                              |

### Formalization to explore later

When the team is ready, consider promoting informal habits into repo tooling:

| Idea                           | What it would add                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **PR template**                | Checklist for mode, tier, upstream/code sign-off, Tier 0 discussion link                                                  |
| **GitHub labels**              | `review-tier-0` … `review-tier-5`, `critical-area`, `needs-upstream-review`, `upstream-approved`, `needs-second-reviewer` |
| `CODEOWNERS`                   | Auto-request review on `schema.prisma`, migrations, `src/serverFns/`, `src/server/`, compliance specs                   |
| **Branch protection**          | 2 approvals for tier-0 PRs; dismiss stale approvals on Tier 0 pushes                                                      |
| **PR title prefixes**          | `[critical]`, `[tier-0]`, `[spec-only]` for a scannable queue                                                             |
| **Break-glass label**          | `hotfix-exempt` with post-merge spec debt ticket                                                                          |
| **Monthly tier-0 audit**       | Sample merged authz/schema PRs — calibrate review depth                                                                   |
| **Contradiction-halt on-call** | Named owner from [`organization.md`](../organization/organization.md) for OPSX blocks                                     |

**Already elsewhere:** spec links in commit messages ([architecture §10](../ai-native-development-architecture.md#10-preventing-spec-drift)).

---

## Maintenance

| Trigger                          | Action                                                        |
| -------------------------------- | ------------------------------------------------------------- |
| New critical area in `AGENTS.md` | Update §3.4 bump table                                        |
| Review practice change           | Edit this file; link from `DEVELOPER_GUIDE.md`                |
| Accountability proposition       | Link here from `organization.md`; do not duplicate checklists |
