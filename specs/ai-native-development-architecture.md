---

## canonical_for:

- sdd-system-design
- spec-taxonomy
- ai-failure-modes
- agent-context-policy
- git-policy-critical-areas
informed_by: []
see_also:
- /specs/engineering/spec-authoring.md
- /specs/DEVELOPER_GUIDE.md
- /specs/review/REVIEW_GUIDE.md
- /specs/traced-knowledge-graph.md
- /AGENTS.md

# AI-Native Spec-Driven Development (SDD) Architecture

**Canonical for system design** — why we built this, how layers fit, failure modes, dependency policy,
and agent git rules for critical areas.


| Question                                    | Read instead                                                     |
| ------------------------------------------- | ---------------------------------------------------------------- |
| What do I do next? (workflow)               | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)                       |
| How do I write this spec? (EARS, templates) | [engineering/spec-authoring.md](./engineering/spec-authoring.md) |
| How do I review?                            | [review/REVIEW_GUIDE.md](./review/REVIEW_GUIDE.md)               |
| What are node kinds and upstream edges?     | [traced-knowledge-graph.md](./traced-knowledge-graph.md)         |




## 1. Executive Summary

The Git repository is the **central nervous system** of the organization. We practice **Docs-as-Contracts**:
durable rules live in `/specs/` and change in the same commits as the code they govern.

Truth is **layered, not monolithic**. No single file holds everything an agent needs — and no agent
should load everything at once. Each layer owns one kind of fact:


| Layer            | Location                                    | Role                                                               |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| **Product docs** | `/specs/product/`                           | Orientation — vision, roadmap, shipped inventory. **Not binding.** |
| **PRDs**         | `/specs/prds/`                              | Binding **what** must be true (two-filter classifier — §4.6).      |
| **Engineering**  | `/specs/engineering/`                       | Binding **how** we wire the stack; external facts (`E-*`), deployment, decisions (`D-*`). |
| **Meta**         | `/specs/organization/`, guides, `AGENTS.md` | Who owns what; how to read and update the repo.                    |


**A core goal of this system is complete, trustworthy agent context.** Agents should not guess at
invisible state (ClickOps dashboard toggles, Secret Manager wiring, LaunchDarkly flags, vendor ZDR
posture) or undocumented tribal knowledge. That knowledge must live somewhere durable — in
`/specs/engineering/external-deps/`, `/specs/engineering/deployment/`, tech-spec ClickOps sections, executable constraints (§7), or live MCP queries
— and be **reachable** via the dependency graph (§5), not dumped into every prompt.

**Complete ≠ load everything.** Context dilution (§3) is real: the architecture captures *all* needed
facts in the repo, but agents **traverse** only what the task requires (frontmatter `upstream` /
`code`, links, per-app `AGENTS.md`). Missing context is a spec bug; overloaded context is a workflow bug.

**Flow on the implementation path:** PRDs inform engineering tech specs, which in turn inform code.
External-deps and deployment docs supply vendor and runtime constraints along the way. Product docs sit beside this
chain: they prioritize work and describe shipped UX, but they do not gate implementation.

Because AI agents are probabilistic, this architecture adds **structural circuit breakers** around known
LLM failure modes (§3). We are **lightweight by default**; the full protocol is the correct process for
high-stakes work, not mandatory ceremony for every change (§2).

---



## 2. Operating Modes

We are a small, fast-moving team. Full SDD pays off when the *cost of drift* is high; it is pure
overhead for prototypes and simple features.

**Two modes:**

- **Lightweight (default):** paragraph goal, **Plan Mode** (must include Archive / spec sync), tests.
  Plain bullets; no delta spec, no EARS ceremony. Prototypes, spikes, UI/copy, simple CRUD without
  security/compliance.
- **Full SDD (critical areas):** OPSX delta specs, EARS on PRDs/tech specs, decision audit, Red-phase TDD,
  post-review Verify, dependency graph traversal (§5), dated archive under `/specs/changes/archive/`.

**Choosing the mode — author's judgment, per PR.** Audit retroactively: if lightweight work needed
significant rework (compliance bug, security regression, churn), use full SDD next time in that area.

**Strong signals for full SDD** (any one is usually enough):

- Privacy/compliance (ZDR routing, Privacy Pro, E2E encryption)
- Auth, tenancy, cross-tenant data (RLS, WorkOS)
- Billing/entitlements
- Onboarding flows (signup, activation, first-run, plan-tier gates at account creation)
- External contract or invisible state (LaunchDarkly, Secret Manager, ClickOps)
- Multiple domains or expensive to regenerate

**EARS** only in critical-area specs (`[AGENTS.md](../AGENTS.md)`). Goal: leverage, not ceremony.


| Mode                          | Summary                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| **Lightweight (default)**     | Paragraph goal, Plan Mode (must include Archive / spec sync), tests. Product docs optional for vocabulary. |
| **Full SDD (critical areas)** | OPSX delta specs, EARS on PRDs, decision audit, Red-phase TDD, Verify after review, dependency graph traversal (§5), dated `archive/`. |


**Critical area:** security, compliance, billing, tenancy, encryption, onboarding flows, or
error-prone high-impact logic — see [AGENTS.md](../AGENTS.md). **Blast radius:** traverse `upstream` /
`code` in frontmatter (§5).

### How the five failure modes map to modes


| Failure mode                   | Circuit breaker                                  | Applies in                                   |
| ------------------------------ | ------------------------------------------------ | -------------------------------------------- |
| Error compounding              | Human phase transitions; `tasks.md` as RAM       | **Full SDD**                                 |
| Context dilution               | Tiered ingestion; dependency graph (§5)          | **Full SDD** (graph); lightweight skims less |
| Specification gaming           | Red-phase TDD; Testing Trophy; adversarial tests | **Full SDD**                                 |
| Non-deterministic environments | Execution budgets; MCP for live logs             | **Full SDD**                                 |
| Grounding / contradiction      | Compliance PRD supremacy; [`organization.md`](./organization/organization.md) | **Always** (even lightweight)                |


---



## 3. The Five Fundamental AI Failure Modes

We do not assume AI autonomy; we design for AI limitations.

### Error Compounding (Long-Horizon Degradation)

AI success probability drops exponentially over long tasks.

**Solution:** Human-initiated phase transitions (Goal → Plan → Tests → Code). The AI uses `tasks.md`
as deterministic "RAM."

### Context Dilution ("Lost in the Middle")

Raw signals and oversized specs bury edge cases.

**Solution:** Tiered ingestion and distillation. Raw signals (VCs, Slack) are never fed to the coding
agent. The AI loads only required context via the dependency graph (§5) — but every fact the task
*does* need must already exist in the repo or be queryable live (MCP). Gaps are spec debt, not
prompt-engineering problems.

### Specification Gaming ("Who tests the tests?")

The same AI writes spec, code, and tests.

**Solution:** TDD circuit breakers and the **Testing Trophy** (see [REVIEW_GUIDE §2](./review/REVIEW_GUIDE.md#part-2--testing-trophy-full-sdd)).
In full SDD, the AI writes tests from the tech spec, runs them, and
**proves they fail (Red Phase)** before writing implementation.

### Non-Deterministic Environments (State Space Explosion)

Agents confuse logic bugs with infrastructure flakes.

**Solution:** Execution budgets (e.g. 2 retry attempts) and read-only MCP tools (Sentry, Datadog) so
the AI queries live state instead of guessing.

### The Grounding Problem (Contradiction & Sycophancy)

Political contradictions ("ship Friday" vs "7-day audit") cannot be resolved by AI.

**Solution:** **Compliance PRDs are supreme authority** among specs.
[`organization.md`](./organization/organization.md) names who to escalate to. On contradiction, halt
work and ping the human domain owner.

---



## 4. Layered Spec Model

All paths live under `/specs/` (not `/docs/`). **Meta** governs how to read the repo; **four content
layers** partition facts so agents load only what a task needs.

```
/specs
  ├── ai-native-development-architecture.md   # This file — north star
  ├── /organization                           # Meta: people, accountability
  ├── /product                                # Product docs — NOT binding, NOT PRDs
  ├── /prds                                   # Binding product requirements (docs-as-contracts)
  │   ├── /compliance                         # Supreme authority (auditor/customer promises)
  │   ├── /commercial                         # SKUs, plan gates, tenant branding
  │   └── /domains                            # Platform-agnostic feature PRDs (as needed)
  ├── /engineering                            # How we build it (current stack)
  │   ├── /features                           # Tech specs / SDDs (critical areas)
  │   ├── /decisions                          # Engineering decisions (`D-*`)
  │   ├── /external-deps                      # External facts (`E-*`) — vendors + library quirks
  │   │   ├── /vendors
  │   │   └── /libraries
  │   ├── /deployment                         # Secrets, flags, release runbook
  │   └── domain-dictionary.yaml (via ../meta/), ml-backend.md, …
  └── /changes                                # OPSX deltas (work-in-flight); archive/; _TEMPLATE/
```



### How layers relate

```
Product docs (orient, prioritize)
        │
        ▼
PRDs (what MUST be true) ──upstream──┐
        │                            │
        ▼                            │ compliance PRDs supreme
Engineering tech specs (how, current stack)
        │                            │
        ▼                            │
Code + tests ◄── constraints ── Engineering (external-deps, deployment)
```

**Example split (tenancy and billing):** [pricing_and_entitlements.md](./prds/commercial/pricing_and_entitlements.md)
(commercial PRD) and [engineering/features/billing/](./engineering/features/billing/) (tech specs).

### 4.1 Meta — how agents navigate the repo


| Artifact             | Location                                                                                                                | Role                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Agent constitution   | [AGENTS.md](../AGENTS.md) (+ per-app `AGENTS.md`)                                                                       | Lean rules every session loads                   |
| Ubiquitous language  | `[/specs/meta/domain-dictionary.yaml](./meta/domain-dictionary.yaml)`                                                   | Preferred terms; technical anchors; alias policy |
| Accountability       | [organization.md](./organization/organization.md) | Who owns critical areas and escalation targets      |
| Operating manual     | [engineering/spec-authoring.md](./engineering/spec-authoring.md)                                                        | EARS, templates, cross-domain DRY (canonical)    |
| Developer onboarding | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)                                                                              | Linear workflow and OPSX (canonical)             |
| Review rubrics       | [review/REVIEW_GUIDE.md](./review/REVIEW_GUIDE.md)                                                                      | Strict upstream; tiered code review (canonical)  |
| Knowledge graph      | [traced-knowledge-graph.md](./traced-knowledge-graph.md)                                                                  | Node kinds, upstream edges, pure-function audit (companion) |


**Companion:** [traced-knowledge-graph.md](./traced-knowledge-graph.md) names node kinds and multi-parent
edges explicitly ([§4 resolved policy](./traced-knowledge-graph.md#4-resolved-policy)). Architecture
owns layers and workflow; the graph doc owns traversal and “what inputs are missing?” audits.

**Meta-doc frontmatter** (developer/review guides — not PRDs or tech specs): `canonical_for` names what
the file owns; `informed_by` lists sources it synthesizes without duplicating; `see_also` links
sibling meta docs. PRDs and feature tech specs use a different schema (`upstream`, `compliance`, `code`).

**Keep** `AGENTS.md` **lean (instruction budget):** rides in every agent session — target **~300 lines /
~150–200 standing instructions**. Structure WHAT / WHY / HOW; progressive disclosure via per-app
`AGENTS.md`; no rot-prone file paths or lint rules; maintain continuously when conventions change.

### 4.2 Product docs — orientation only

**Location:** `/specs/product/`. **Not on the implementation path.**

Briefs, roadmap, shipped-feature inventory. No EARS. No delta specs. Updated on product rhythm, not
per PR.


| Doc               | Example                                                                     | Update trigger                                     |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| Product brief     | `wald-saas.md` — vision, roadmap Now/Next/Later, metric *definitions*, gaps | Priority shift, quarterly review                   |
| Feature inventory | `wald-saas-features.md` — shipped behavior in product language              | After Archive (audit task) or `Last verified` pass |
| Feedback streams  | `feedback.md`                                                               | Process change                                     |


Roadmap entries **prioritize** work — they do not create binding MUST rules and do not auto-spawn PRDs.

### 4.3 PRDs — binding requirements

**Location:** `/specs/prds/`. **On the implementation path for full SDD.** EARS in critical areas.
Atomic update with code.


| Doc         | Location                  | Example                                                   |
| ----------- | ------------------------- | --------------------------------------------------------- |
| Compliance  | `/specs/prds/compliance/` | **Supreme authority** — SOC2, data privacy, customer data |
| Commercial  | `/specs/prds/commercial/` | `pricing_and_entitlements.md` — SKUs, plan gates          |
| Domain PRDs | `/specs/prds/domains/`    | Product-outcome MUST rules (two-filter classifier — §4.6) |


**Product doc vs PRD vs tech spec — same feature:**


| Product (`wald-saas-features.md`)          | PRD / tech spec                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| "Pre-LLM redaction before external models" | `WHEN sanitization fails… MUST NOT send original prompt to non-secure engine` |
| Describes shipped UX                       | Defines testable behavior                                                     |
| Not cited as build spec                    | Tests trace here                                                              |




### 4.4 Engineering — how we build it

**Location:** `/specs/engineering/`. Wire current vendors and stack to fulfill PRDs.


| Doc                       | Location                                      | Role                                                         |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Feature tech specs (SDDs) | `/specs/engineering/features/`                | EARS rules, data contracts, API/DB wiring for critical areas |
| Decisions (`D-*`)         | `/specs/engineering/decisions/`                    | Locked choice + rationale; cite atoms not file paths           |
| Sibling design            | e.g. `ml-backend.md`, `database-standards.md` | Cross-repo technical design and DB discipline                |


Do **not** document vendor API shapes in specs — fetch live schemas via MCP. Document decisions and
constraints only (§9).

Live database **shape** is `prisma/schema.prisma`; **naming and migration discipline** is
`database-standards.md`.

### 4.5 External deps and deployment — runtime and vendor state

**Location:** `/specs/engineering/external-deps/` and `/specs/engineering/deployment/`. Physical boundaries, third-party limits, shadow infrastructure.

**Why this layer exists for agents:** Code and PRDs rarely encode *where* secrets live, which
LaunchDarkly flag gates a path, or which Stripe dashboard toggle must be on. Without external-deps and
deployment docs, agents hallucinate infrastructure. Capture **invisible knowledge** here (or in
tech-spec ClickOps sections that link here) — see [spec-authoring §3](./engineering/spec-authoring.md#3-recommended-tech-spec-sections)
and §13 (bootstrapping step 3).


| Doc                 | Location                                | Role                                            |
| ------------------- | --------------------------------------- | ----------------------------------------------- |
| External compliance   | `/specs/engineering/external-deps/vendors/<vendor>.md` | ZDR, residency — feeds routing (not API shapes) |
| Deployment          | `/specs/engineering/deployment/`         | Secrets, LaunchDarkly, environment              |
| Rate limits         | `system_rate_limits.md` (planned)       | Hard platform ceilings                          |
| ClickOps registries | `click_ops_registries/` (planned)       | WorkOS, LD dashboards not in Git                |


Prefer **live MCP** (LaunchDarkly API, vendor OpenAPI) over hand-maintained registries where possible;
use Markdown registries when the dashboard is the only source of truth.

### 4.6 Classifying a rule (two-filter + wording constraint)

<a id="46-classifying-a-rule-magic-black-box-test"></a>
<a id="46-classifying-a-rule-two-filter--wording-constraint"></a>

**Primary classifier — two-filter decision tree** (full authoring rules:
[spec-authoring §7](./engineering/spec-authoring.md#what-belongs-in-prd-sdd-and-code)):

1. Would a **power user**, **team admin**, or **storefront / sales promise** need this to use or
   explain the product correctly? → **PRD** under Product outcomes.
2. Else: would violating this be a **customer, partner, or compliance incident** even with no UI?
   → **PRD** under Binding operator / compliance promises (one thin outcome rule; rationale names
   the incident class).
3. Else → **SDD** (or code).
4. PRD wording MUST NOT name routes, algorithms, columns, or impl flags — that detail belongs in
   the SDD (wording constraint below).

**Slogan:** PRD = product promises and observable outcomes (user, admin, or sold capability), plus
thin binding incident-risk rules that remain true after a stack rewrite. SDD = how this stack keeps
those promises.

**Deliberately opaque knobs are not Binding.** Hiding a dial from the UI (context budget, thinking
effort, Auto Router maps) does **not** put the dial in the PRD. Put the **knob and algorithm in the
SDD** (or code). Add a **thin Product** rule only when you bind an honest outcome or limit users may
hit — never the secret constant. Opacity ≠ security Binding; Binding is for silent incidents
(storefront breach, operator can read DAR, CEO-locked unit-economics breach), not for routine
cost/quality tuning.

**Functional / non-functional and business / user-facing (same tree):** These classic lenses do
**not** replace the two-filter — they explain *why* a rule lands where it does. Full mapping:
[spec-authoring §7 requirement lenses](./engineering/spec-authoring.md#requirement-lenses).

| Kind | Example | Typical home |
| --- | --- | --- |
| User-facing functional | PIN unlock before Secure chat | PRD — Product |
| User-facing non-functional (sold) | Privacy+ E2EE / “Wald can’t read chats” | PRD — Product (and Binding for silent operator side) |
| Business non-functional (not user-facing) | Control LLM COGS via truncation / thinking=`low` | **Goal** in Clarify / SDD rationale; **mechanisms** in SDD; thin Product only for honest side effects; Binding only if finance locks a named unit-economics MUST |
| Security non-functional (silent) | No retained server decrypt after request | PRD — Binding |

**Wording constraint (magic-black-box style):** Imagine all infrastructure were a magic black box.
Would this *wording* still be stated the same way?


| Answer                                                          | Put it in                                  |
| --------------------------------------------------------------- | ------------------------------------------ |
| **Yes** — outcome/incident still holds without tech-stack nouns | Keep in PRD (after two-filter inclusion)   |
| **No** — depends on current vendors, APIs, or file paths        | Tech spec (`/specs/engineering/features/`) |
| **Neither** — describes shipped UX or roadmap                   | Product doc (`/specs/product/`)            |
| **Neither** — ZDR/residency/deployment fact                     | Engineering (`/specs/engineering/external-deps/`, `/specs/engineering/deployment/`) |


**Gold examples:**


| Rule                                                                                             | Layer         |
| ------------------------------------------------------------------------------------------------ | ------------- |
| Secure users must set a custom PIN before chat unlocks                                           | PRD — Product |
| Wald must not retain server-side ability to decrypt stored Secure chat after a request completes | PRD — Binding |
| Derive `chatKey` via HKDF over `chatId[:8]` and `userSymmetricKey`                               | SDD           |
| Long threads MUST remain usable (no overflow failure); early turns MAY be dropped                | PRD — Product (optional honest limit) |
| Truncate when conversation tokens exceed 200k; drop-oldest then tail-trim                        | SDD (not PRD) |
| Default model thinking effort to `low` for cost/latency                                          | SDD or code (not PRD; not Binding) |
| Control per-seat LLM COGS (business goal; not shown in UI)                                       | Clarify / SDD rationale — not Product; Binding only if CEO/finance locks a named MUST |
| Summarize or truncate history to meet that COGS goal                                             | SDD (mechanism) |


---



## 5. Dependency Architecture (Keeping it DRY)

Never duplicate rules across layers. Use **transclusion by reference**.

### Hybrid linking model


| Doc type                           | Mechanism                    | Why                              |
| ---------------------------------- | ---------------------------- | -------------------------------- |
| Product docs                       | Markdown links only          | Human-readable; low ceremony     |
| PRDs & tech specs (critical areas) | YAML frontmatter **+** links | Machine-traversable blast radius |


**Minimal frontmatter schema** (PRDs and feature tech specs only):

```yaml
---
id: feature-sanitization-secure-tier
upstream: [pricing_and_entitlements, compliance-data-privacy]
compliance: [SOC2-CC6.3]
code: [apps/next-js-app/pages/api/chat/]
---
```

Use **semantic slugs**, not opaque `PRD-102` numbering.

**AI traversal rule (full SDD):** On critical-area work, start from the spec's `id`, traverse
`upstream` to PRDs and compliance, then traverse `code` to assess blast radius. Product docs are not
part of this graph. For **missing parent nodes** (platform, flags, precedent code, incidents), run the
[pure-function audit](./traced-knowledge-graph.md#01-pure-function-audit-major-nodes) and list gaps in
Clarify upstream ([graph §4](./traced-knowledge-graph.md#4-resolved-policy)).

**CI:** Fail build if frontmatter references or `@` links point at missing files.

---



## 6. Execution Overview

High-level flows. **Step-by-step OPSX:** [DEVELOPER_GUIDE.md §4](./DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas) and [OPSX skills](./DEVELOPER_GUIDE.md#opsx-skills-cursor). **Onboarding path:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

**Agent harness:** Cursor skills under `.cursor/skills/opsx-*` and `lightweight-plan-archive` execute procedure; this file and `/specs` own policy. Validated by `pnpm run specs:check-opsx-skills`.

### Lightweight path (default)

Use author judgment, state a one-paragraph goal (optionally skimming the product brief or glossary),
get human approval in Plan Mode, then write code and tests and open a PR.

**Plan Mode MUST include an Archive (spec sync) step:** before the work is done, check whether any
canonical specs (PRDs, SDDs, operations, product inventory) need updating for the code change; update
them in the same PR, or record **No spec change**. Lightweight does not use `/specs/changes/` deltas;
dated archive folders are full-SDD only. Step-by-step: [DEVELOPER_GUIDE §3](./DEVELOPER_GUIDE.md#3-lightweight-path-default).

```
Author judgment → paragraph goal → Plan Mode (must include Archive / spec sync)
                      ↑ optional skim: product brief, glossary
        ↓
code + tests → PR ready → human review / fixes → Archive (update canonical specs or No spec change) → merge
```



### Full SDD path (critical areas)

Start from a feature request. Use **`opsx-mode`** then **`opsx-*`** skills — see [DEVELOPER_GUIDE §4](./DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas). Maintain
`clarify.md` until signed, then Propose delta files in `/specs/changes/`. Upstream review, Red-phase tests, Apply, code review, **Verify**, then **Archive**.

```
Feature request → Clarify → Propose → upstream review → Red → Apply → code review → Verify → Archive
```

Detail, gates, and git policy: [DEVELOPER_GUIDE §4](./DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas), [changes/README](./changes/README.md).

Canonical Clarify and Propose principles and prompts: [CLARIFY_AND_PROPOSE.md](./changes/CLARIFY_AND_PROPOSE.md).
Verify checklist and Archive mapping: [DEVELOPER_GUIDE §4](./DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas),
[REVIEW_GUIDE](./review/REVIEW_GUIDE.md), [changes/README.md](./changes/README.md).

If ingestion surfaces a PRD contradiction, halt work and ping the owner listed in
[organization.md](./organization/organization.md).

### Keeping docs updated


| Subtype                   | Owner                   | Trigger                        | Required with code PR?     |
| ------------------------- | ----------------------- | ------------------------------ | -------------------------- |
| Roadmap                   | CEO / Product Lead      | Priority shift, quarterly      | No                         |
| Brief                     | Product Lead            | Strategy, new product          | No                         |
| Feature inventory         | Product Lead + engineer | Archive; `Last verified` audit | No                         |
| Entitlements / compliance | Product Lead / CTO      | SKU change, audit finding      | **Yes**                    |
| PRDs & tech specs         | Author                  | Critical-area behavior change  | **Yes** — via OPSX Archive |
| Spec sync (lightweight)   | Author                  | Any code change that drifts docs | **Yes** — Plan Mode Archive step |


After Archive: update `[product]-features.md` if user-visible behavior changed.

### Git policy (tiered)

**Canonical policy** for agent sessions:


| Mode                          | Agent may commit?                                            | Agent may create/switch branches? |
| ----------------------------- | ------------------------------------------------------------ | --------------------------------- |
| **Full SDD / critical areas** | **No** — human commits after reviewing diff                  | **No** — unless human instructs   |
| **Lightweight**               | **Yes** — after explicit human approval in session           | **No** — unless human instructs   |
| **Always**                    | Never force-push, rebase, or amend without human instruction |                                   |


---



## 7. Capturing "Dark Matter" (Tribal Knowledge)

Undocumented quirks defeat AI agents. §1's **complete agent context** goal applies here: tribal
knowledge must graduate from Slack and memory into durable, discoverable form. Prefer executable
boundaries over prose that will rot:

- **Executable architecture:** Custom ESLint rules for vendor quirks (e.g. `no-unthrottled-stripe-search`).
- **Inline annotations:** `@agent-constraint` tags on load-bearing code (Chesterton's fences).
- **External-deps + ClickOps sections:** Dashboard toggles, secret locations, flag names — in
`/specs/engineering/external-deps/` or `/specs/engineering/deployment/` or linked from tech specs ([spec-authoring §3](./engineering/spec-authoring.md#3-recommended-tech-spec-sections)).
- **Dynamic context (MCP):** Query Sentry, LaunchDarkly, live vendor schemas when Markdown would go stale.
- **Proactive grids:** Cron probes for third-party rate limits → update `system_rate_limits.md`.

When bootstrapping specs from existing code, the human audit step is explicitly to add what the AI
could not see in the diff (§13).

---



## 9. External Services & MCP

Document **decisions**, never **API shapes**.

- **Never document API shapes** — fetch live schemas via MCP (e.g. Stripe OpenAPI MCP).
- **Do document choices and why** — vendor selection, flow trade-offs MCP cannot provide.
- **Non-discoverable facts** in `/specs/engineering/external-deps/vendors/`: ZDR, residency, rate limits, quirks.

**Test:** if the AI could learn it from a live schema, leave it out. If it's a human decision or
constraint, write it down.

---



## 10. Preventing Spec Drift

Pair process habits with **machine-checkable CI gates** for critical-area specs.

**Process habits:**

- **Atomic commits:** business logic / env / flag changes include spec update in the **same commit**.
- **Cite spec in commits:** e.g. `feat(auth): magic link, refs specs/engineering/features/...`
- **DRY cross-referencing:** frontmatter `upstream` / `compliance`; `@file` mentions.
- **Semantic conflict checks:** audit related specs for contradictions before planning cross-domain work.
- **Archive retention:** after Verify, fold deltas into canonical specs and move the active change set
  to `/specs/changes/archive/YYYY-MM-DD-<feature-slug>/` (do not leave stale actives under `/specs/changes/`).

**CI gates** (critical areas; start cheap):

- **Reference resolution:** `pnpm run specs:check-links` — broken `@` refs and frontmatter fail CI.
- **OPSX skills ↔ docs:** `pnpm run specs:check-opsx-skills` — manifest, skill files, and gate tokens aligned with DEVELOPER_GUIDE.
- **Spec linting (later):** EARS parse + required sections on critical-area specs.
- **Pre-flight checklists (later):** security / a11y / observability before implementation.
- **Hash-drift detection (defer):** code changed without spec edit — only at scale.

---



## 11. Infrastructure & Deployment State

Document what agents cannot infer from code:

- **Statelessness (Cloud Run):** ephemeral filesystem — GCS, no local writes.
- **Connection pooling (Cloud SQL):** how DB connections are managed to avoid serverless limits.
- **Secrets:** local `.env` vs GCP Secret Manager at runtime.
- **Feature flags (LaunchDarkly):** active flags, types, required wrapper/hook; remove flag doc when code ships.

Location: `/specs/engineering/deployment/`.

---



## 12. Scaling Parallel Work: Git Worktrees

For **parallel or long-running agent work**, prefer `git worktree add ../feature-a` for isolation.
**Optional** — everyday single-task work often does not justify duplicated `node_modules`/caches.

---



## 13. Bootstrapping Specs for Existing Code

Reverse-engineer **critical areas** just-in-time — do not halt all development to document everything:

1. `@`-mention core files of the feature in Cursor.
2. Prompt: declarative spec — Domain, Architecture, Data Contracts, Business Rules, External Integrations; no pseudo-code.
3. **Human audit:** add invisible knowledge — Secret Manager, ClickOps, ZDR, LaunchDarkly flags.
4. Commit to `/specs/` and continue with SDD workflow.

---



## 14. Related Documents


| Document                                                              | Role                                          |
| --------------------------------------------------------------------- | --------------------------------------------- |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)                            | Workflow navigation (canonical onboarding)    |
| [engineering/spec-authoring.md](./engineering/spec-authoring.md)      | EARS, templates, cross-domain DRY (canonical) |
| [review/REVIEW_GUIDE.md](./review/REVIEW_GUIDE.md)                    | Review process + Testing Trophy (canonical)   |
| [review/TESTING_GUIDE.md](./review/TESTING_GUIDE.md)                  | How to write/generate tests; CI + deferred    |
| [AGENTS.md](../AGENTS.md)                                             | Agent constitution and critical areas         |
| [/specs/README.md](./README.md)                                       | Directory index                               |
| [/specs/organization/organization.md](./organization/organization.md) | Accountability defaults                       |


