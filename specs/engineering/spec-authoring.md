---
canonical_for:
  - spec-authoring
  - ears-syntax
  - spec-templates
informed_by:
  - /specs/ai-native-development-architecture.md
  - /specs/traced-knowledge-graph.md
see_also:
  - /specs/DEVELOPER_GUIDE.md
  - /specs/review/REVIEW_GUIDE.md
  - /AGENTS.md
---

# Spec authoring

**Canonical for how to write PRDs and tech specs** — declarative style, EARS, recommended sections,
and cross-domain DRY patterns.

| Question | Read instead |
| --- | --- |
| Why does this system exist? | [ai-native-development-architecture.md](../ai-native-development-architecture.md) |
| What do I do next? (workflow, OPSX) | [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) |
| How do I review? | [review/REVIEW_GUIDE.md](../review/REVIEW_GUIDE.md) |
| Product brief authoring | [product/README.md](../product/README.md) |
| OPSX delta templates | [changes/_TEMPLATE/](../changes/_TEMPLATE/) |
| PRD / SDD skeletons | [prds/_TEMPLATE/](../prds/_TEMPLATE/), [features/_TEMPLATE/](./features/_TEMPLATE/) |
| Gold-standard examples | [feature.md](./feature.md) |
| Clarify → Propose | [changes/CLARIFY_AND_PROPOSE.md](../changes/CLARIFY_AND_PROPOSE.md) |
| Where do open questions go? | [§2.5 Open questions, gaps, and ownership](#open-questions-gaps-and-ownership) |
| Why this PRD/SDD boundary? | [§7 Why this boundary](#why-this-boundary); full write-up [other_docs/prd-sdd-boundary-rationale.md](../../other_docs/prd-sdd-boundary-rationale.md) |
| Node kinds and upstream edges? | [traced-knowledge-graph.md](../traced-knowledge-graph.md) |

---

## 1. Declarative specs, not pseudo-code

Specs state **boundaries** (data contracts, rules, compliance) — not implementation steps. The AI can
figure out React hooks and SQL joins; humans own what must be true.

**Failure modes** (context dilution, spec gaming, etc.) and why we write specs:
[architecture §1–3](../ai-native-development-architecture.md#1-executive-summary).

---

## 2. EARS syntax (critical areas)

In **critical-area** PRDs and tech specs, use **Easy Approach to Requirements Syntax (EARS)**. For
lightweight/low-stakes work, plain declarative bullets are fine.

| Type | Shape | Example |
| --- | --- | --- |
| **Ubiquitous** | The system MUST `<response>` | "The system MUST hash passwords using bcrypt before saving." |
| **Event-Driven** | WHEN `<trigger>`, the system MUST `<response>` | "WHEN a user switches teams, the system MUST revoke legacy chat access." |
| **State-Driven** | WHILE `<precondition>`, the system MUST `<response>` | "WHILE `subscription_tier` is 'PRO', the system MUST enforce E2E encryption." |
| **Optional** | WHERE `<feature active>`, the system MUST `<response>` | "WHERE `OPENAI_API_KEY` is set, the system MUST offer LLM definition suggestions." |

Use **MUST NOT** for negative guardrails — targets for negative tests
([review guide §2](../review/REVIEW_GUIDE.md), [architecture §3](../ai-native-development-architecture.md#specification-gaming-who-tests-the-tests)).

**Industry basis:** EARS (Mavin et al., RE 2009) + RFC 2119 modal verbs. Do not invent alternate
requirement grammars.

### 2.1 Expectation + rationale

EARS structures the **expectation** only. Capture **why** in a **Rationale** line beneath (omit when obvious):

> **R-AUTH-03 (Event-Driven):** WHEN a user attempts login and email verification is incomplete, the
> system MUST reject the session.
> **Rationale:** Unverified accounts must not access document or FloDown data.

### 2.2 Rule identifiers

Binding specs use **four prefixes** by node kind so IDs never collide:

| Doc type | Prefix | Example |
| --- | --- | --- |
| **PRD** (`specs/prds/`) | `R-<AREA>-<NN>` | `R-DOC-01` |
| **SDD** (`specs/engineering/features/`) | `S-<AREA>-<NN>` | `S-FLO-14` |
| **Decision** (`specs/engineering/decisions/`) | `D-<AREA>-<NN>` | `D-ROUTE-02` |
| **External fact** (`specs/engineering/external-deps/`) | `E-<AREA>-<NN>` | `E-OPENAI-01`, `E-LIBSODIUM-01` |

| Part | Rule |
| --- | --- |
| `<AREA>` | Uppercase code from the [closed list](#rule-area-registry) for that **file** |
| `<NN>` | Two digits, **contiguous** per file starting at `01` (`01`, `02`, … — no thematic gaps like `10`, `20`) |

**PRD format:**

```markdown
**R-DOC-07 (Event-Driven):** WHEN …, the system MUST …

**Rationale:** … (optional)
```

**SDD format:**

```markdown
**S-FLO-07 (Event-Driven):** WHEN …, the system MUST …

**Upstream:** R-DOC-04 (omit when obvious).
```

See [§3.2.2](#sdd-upstream) for when to use `**Upstream:**` vs omit.

| Do | Do not |
| --- | --- |
| `**S-OPEN-03 (Event-Driven):** WHEN …` in SDDs | `**R-…` EARS rule headers in SDDs |
| `**R-DOC-03 (Event-Driven):** WHEN …` in PRDs | `**S-…` EARS rule headers in PRDs |
| Cite PRD rules from SDD prose as `PRD R-DOC-04` or `R-DOC-14 does not apply` | Reuse the same ID in PRD and SDD for different rules |
| Cite decisions and external facts as `D-ROUTE-02`, `E-OPENAI-01` | Cite decision file paths instead of `D-*` atoms |
| Contiguous IDs per file | Nested prefixes (`S-FLO-AUTO-01`, `S-AUTH-REDIR-01`) |
| Link PRD ↔ SDD in [traceability](#traceability-prd--sdd) tables | Inline PRD→SDD arrows in rule bodies (`→ S-FLO-09`) |
| SDD `**Upstream:**` atoms (`R-*` / `D-*` / `E-*`) | SDD prose `**Rationale:**` that re-teaches the PRD |

#### Rule area registry

Register new areas in this table when adding a PRD/SDD file. One primary `AREA` per file.

| Area | Doc | File | Notes |
| --- | --- | --- | --- |
| `AUTH` | PRD | `prds/domains/auth.md` | Signup, login, roles, email verification |
| `DOC` | PRD | `prds/domains/documents-extraction.md` | Upload, ownership, PDF extraction |
| `FLO` | PRD | `prds/domains/flodown-blocks.md` | FloDown block outcomes |
| `SYM` | PRD | `prds/domains/symbols-semantics.md` | Symbols, symrefs, propagation |
| `MOD` | PRD | `prds/domains/module-descriptions.md` | FAU module catalog processing |
| `CUR` | PRD | `prds/domains/curation-export.md` | Curation, sTeX/MathHub export |
| `AUTH` | SDD | `features/auth/auth-sessions.md` | JWT sessions, password fingerprint |
| `DOC` | SDD | `features/documents-extraction/upload-and-ownership.md` | Upload + ownership enforcement |
| `FLO` | SDD | `features/flodown-blocks/lifecycle.md` | Block CRUD, cascade, version history |
| `SESS` | Decision | `decisions/jwt-session-fingerprint.md` | Session invalidation on password change (`D-SESS-*`) |
| `OPENAI` | External | `external-deps/vendors/openai.md` | OpenAI usage constraints (`E-OPENAI-*`) |
| `MATH` | External | `external-deps/vendors/mathhub.md` | MathHub backend facts (`E-MATH-*`) |
| `FLOD` | External | `external-deps/vendors/flodown.md` | FloDown WASM / URI facts (`E-FLOD-*`) |
| `FTML` | External | `external-deps/libraries/ftml.md` | FTML library constraints (`E-FTML-*`) |

### 2.3 Forbidden language in binding specs

Binding PRDs and SDDs (`/specs/prds/`, `/specs/engineering/features/`) MUST NOT contain:

| Forbidden | Use instead |
| --- | --- |
| Process labels (`pilot`, `Phase C`, `draft`, `WIP`) | Nothing — process lives in PR / plan / topic `index.md` |
| Provenance tags (`[CODE-VERIFIED]`, `[BUG?]`) in rule text | Promote verified behavior into EARS rules; file confirmed defects under `## Implementation bugs` ([§2.5](#open-questions-gaps-and-ownership)) |
| Inline PRD→SDD arrows in rule bodies (`→ R-DOC-09`) | [Traceability](#traceability-prd--sdd) table |
| Vague exception prose (`except when ownership rules require…`) | `except when R-<AREA>-<NN> applies` — closed rule IDs only |
| Priority / ordering jargon in PRDs (`higher-priority`, `default path`, `branching logic`) | Name outcomes and rule IDs; put order in SDD precedence table |
| `block` / `deny` without user-visible next step | State what the user sees and can do (e.g. email-verification-required screen with resend link) |
| Open-ended qualifiers (`as appropriate`, `as needed`, `etc.`) | Enumerate explicitly or split into separate rules |
| Telegraphic shorthand in SDD **Architecture boundaries** (`GMP inactive`, comma-fragment lists, `Surface \| Role` headers) | **Layer \| Responsibility** table; one full sentence per row ([§3.2.1](#321-sdd-prose)) |
| Index path IDs in binding SDDs (`W-1`, `W-2`, `P-2` from topic `index.md`) | Plain outcome names in Domain context and rules; path IDs stay in non-binding indexes only ([§5.1](#topic-indexes), [§3.4](#agent-review-gate)) |
| `status: pilot` in frontmatter | `featured: true` only on gold-standard examples (see [§9](#9-templates-and-featured-examples)) |
| `⚠️ CONFIRM` as catch-all open questions | Use the right bucket in [§2.5](#open-questions-gaps-and-ownership) — EARS, Implementation bugs, Open documentation gaps, or named owner |

Topic indexes (e.g. `features/onboarding/index.md`) MAY track coverage gaps and audit notes; those tables
are not binding contracts. Authoring rules: [§5.1](#topic-indexes).

### 2.5 Open questions, gaps, and ownership

<a id="open-questions-gaps-and-ownership"></a>

Do **not** use `⚠️ CONFIRM` as a catch-all in binding specs. It reads like a request for CEO sign-off when
most items are engineering documentation or already-settled policy. Put unfinished work in the **right
bucket** and name the **owner**.

| Bucket | When to use | Owner | Example |
| --- | --- | --- | --- |
| **EARS rule** | Behavior is decided and binding | Product + engineering | `S-FLO-06` — cascade delete rewrites symrefs |
| **`## Implementation bugs`** | Spec is right; code is wrong | Engineering | Role gate omitted on curator-only server function |
| **`## Open documentation gaps`** (SDD optional) | True in code; not yet written up | Engineering | Auto Router precedence, perf budgets |
| **`## Open questions (product / research)`** (PRD) | Scope, FAUstairs integration priorities | Product lead | MathHub export format commitments |
| **`pending legal`** (vendor docs) | Contractual fact not yet linked | CEO + legal | ZDR agreement on file |
| **Topic `index.md` open questions** | Temporary during spec backfill only | Engineering | Delete when promoted to PRD/SDD |

**Do not ask product to confirm:**

- Obvious engineering policy (e.g. hot-path indexes required — state it as policy).
- Facts verifiable from code (integration path, env var, allowlist) — document with a code anchor.
- Engineering TODOs disguised as questions — use **Open documentation gaps** or Linear.

**Reviewer gate:** If an open item is settled product truth or a confirmed code bug, reject the spec until
it is moved into EARS rules or **Implementation bugs** ([§3.4](#agent-review-gate) mistake #5).

### 2.6 Traceability (PRD ↔ SDD)

<a id="traceability-prd--sdd"></a>

**PRD rules** state product outcomes and thin binding incident-risk promises (two-filter — [§7](#what-belongs-in-prd-sdd-and-code)). **SDD rules** state policy on the current stack.
Link them in a **Traceability** section — not inline in rule text. **Test mapping** lives in the SDD only.

**PRD** — required section before Related docs:

```markdown
## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-DOC-01 | `upload-and-ownership.md` S-DOC-14 |
```

**SDD** — required section before Related docs:

```markdown
## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-DOC-14 | R-DOC-01 | Gap |
```

Use `Gap` in the SDD Test mapping when no automated test exists yet. Every `MUST NOT` MUST have a row
there (test or `Gap`).

---

## 3. Required document structure

Copy from templates: [`prds/_TEMPLATE/prd.md`](../prds/_TEMPLATE/prd.md),
[`features/_TEMPLATE/sdd.md`](./features/_TEMPLATE/sdd.md).
Gold-standard examples: [`feature.md`](./feature.md).

### 3.1 PRD (domain/compliance/commercial)

**Frontmatter (required):** `id`, `upstream`, `compliance`, `code` — [architecture §5](../ai-native-development-architecture.md#5-dependency-architecture-keeping-it-dry). Optional: `featured: true`.

| Section | Required | Content |
| --- | --- | --- |
| Title | Yes | `# PRD: <name>` |
| Domain | Yes | 1–3 sentences; link dictionary terms |
| Business rules | Yes | EARS under **`### Product outcomes`** and **`### Binding operator / compliance promises`** (use `N/A — none` under Binding when the PRD is purely product); contiguous `R-<AREA>-<NN>` |
| Out of scope | Yes | Behaviors owned by other PRDs/SDDs (stable list, not process phases) |
| Traceability | Yes | Table: PRD rule → SDD file + rule ID |
| Related docs | Yes | Upstream PRDs, implementing SDDs |

**Optional:** Lifecycle diagram (multi-path features), rationale on non-obvious rules. Group Product rules by theme under the Product heading when helpful.

**PRD MUST NOT:** file paths, vendor SDK names, framework routes, or implementation steps (wording constraint — [architecture §4.6](../ai-native-development-architecture.md#46-classifying-a-rule-two-filter--wording-constraint)).

**Binding section discipline:** Each Binding rule is one thin testable outcome. The **Rationale** MUST name the incident class (e.g. storefront breach, operator can read data at rest, forged billing webhook). Lists of algorithms, columns, or key types belong in the SDD. Compliance PRDs that exceed ~12–15 EARS rules SHOULD collapse thin parents rather than grow.

#### 3.1.1 PRD precision (anti-vagueness)

A PRD **Product** rule MUST be understandable **without reading the SDD** — reviewers use the teach-back test on the Product section alone ([REVIEW_GUIDE §1.2](../review/REVIEW_GUIDE.md#12-upstream-review-checklist)). Binding rules stay outcome-only but may be denser; they still MUST NOT require SDD vocabulary to understand the obligation.

| Requirement | Example |
| --- | --- |
| **Observable state** in WHEN/WHILE | `has pending email invitations` — not `on the default path` |
| **Exceptions cite rule IDs** | `except when R-AUTH-14 applies` — not `except when admin rules require…` |
| **Blocks include user-visible outcome** | `show email-verification-required screen with resend control` — not `block access` alone |
| **One testable obligation per rule** | Split upload vs ownership into R-DOC-02 and R-DOC-14 |
| **Dictionary labels** | `partner subscription`, `business email domain` — not undefined shorthand |

**Authoring workflow (PRD / PRD delta):**

1. Inventory outcomes from code or product input (bullet list).
2. Classify each with the [two-filter tree](#what-belongs-in-prd-sdd-and-code); draft one EARS rule per included outcome; assign contiguous IDs.
3. Place under Product vs Binding; for each Binding rule, name the incident in Rationale.
4. For each default/fallback Product rule, list preventing rules by ID.
5. Run [PRD prose lint](#prd-prose-lint) (`pnpm run specs:check-prd-prose`). Self-check PRD
   EARS lines against [PRD layering](#prd-layering) (no stack nouns).
6. Self-check: paraphrase the **Product** section to a non-engineer without opening the SDD.

<a id="prd-prose-lint"></a>

**PRD prose lint:** `pnpm run specs:check-prd-prose` flags forbidden vague phrases in
`specs/prds/**/*.md` EARS lines. Fix or add an explicit waiver comment only with reviewer approval.

<a id="prd-layering"></a>
<a id="prd-layering-lint"></a>

**PRD layering (author / reviewer guideline):** For the
[two-filter scheme](../ai-native-development-architecture.md#46-classifying-a-rule-two-filter--wording-constraint),
stack nouns stay in SDDs. This does **not** decide Product vs Binding inclusion — that is author
judgment plus upstream review. Scan every PRD EARS rule (and its Rationale) for:

| Avoid in PRD EARS / Rationale | Put it in… |
| --- | --- |
| Inline `S-<AREA>-<NN>` citations (outside Traceability) | [Traceability](#traceability-prd--sdd) table only |
| SDD filenames inside rule bodies | Traceability / Related docs |
| Framework routes (`` `/chat` ``) | SDD Architecture boundaries / rules |
| App or lib file paths (`` `apps/...` ``, `` `libs/...` ``) | SDD |
| Spec paths (`` `/specs/...` ``) | Related docs links (not inside EARS obligations) |
| `localStorage` / `sessionStorage` | SDD |
| Algorithms (`ChaCha20-Poly1305`, `HKDF`, …) | SDD |
| Implementation field names (`` `needsPinSetup` ``, `` `isPlanIdSecure` ``, …) | SDD |
| Internal error codes (`SANITIZATION_FAILED`, `MODEL_DISALLOWED`, …) | SDD |

**Agent rule of thumb:** Product section = observable / storefront outcomes. Binding section = thin
incident-risk promises (name the incident). SDD = module, route, column, algorithm, flag, precedence.

### 3.2 SDD (engineering features)

**Frontmatter (required):** `id`, `upstream`, `compliance`, `code`. Optional: `featured: true`.

| Section | Required | Content |
| --- | --- | --- |
| Title | Yes | `# SDD: <name>` |
| Domain context | Yes | Goal + 1–2 sentences; what this file owns |
| Architecture boundaries | Yes | Table: **Layer** (route, module, or job) → **Responsibility** (full sentence per row — what that layer owns for this feature; no telegraphic shorthand) |
| Data contracts | Yes | Tables/enums/JSON shapes, or "N/A" with one-line justification |
| Business rules | Yes | EARS blocks; contiguous `S-<AREA>-<NN>` per file |
| Test mapping | Yes | Table: SDD rule → PRD rule → test |
| Related docs | Yes | Upstream PRD, sibling SDDs, ADRs |
| Implementation inputs | Optional | Links to skills, precedent modules, LD keys, Figma — no duplication ([graph §4.6](../traced-knowledge-graph.md#46-sdd-implementation-inputs-section)) |

**Optional:** Flow / sequence diagram (when branching is non-obvious), ClickOps,
`## Implementation inputs` (when code ≠ f(SDD) without named parents),
[Open documentation gaps](#open-questions-gaps-and-ownership) (engineering backlog only),
`## Implementation bugs` for confirmed code defects (not policy questions), AI directives.

**SDD MUST NOT:** pseudo-code algorithms, loop bodies, process narration, or telegraphic audit notes in
**Architecture boundaries** Responsibility cells.

#### 3.2.1 SDD prose

<a id="sdd-prose"></a>

EARS **Business rules** already force `WHEN …, the system MUST …` sentences. **Architecture boundaries**
do not — agents often paste code-audit fragments there. Treat Responsibility cells like PRD teach-back
prose: a reviewer who has not read the code should understand what each layer does.

| Section | Prose bar |
| --- | --- |
| **Architecture boundaries** | Table: **Layer** \| **Responsibility**. Each Responsibility cell = one or more **complete sentences**. Use dictionary preferred terms. |
| **Domain context** | 1–3 **complete sentences** describing what this file owns; no bullet fragments, colon-label lists, or index path IDs (`W-1`, `P-2`) |
| **Business rules** | EARS only (already sentence-shaped) |
| **Open documentation gaps** | Bullets OK — engineering backlog; cite code anchors where possible ([§2.5](#open-questions-gaps-and-ownership)) |
| **Implementation bugs** | Table: confirmed code defects only — not open product questions ([§3.4](#agent-review-gate)) |

**Architecture boundaries — do / do not:**

| Do | Do not |
| --- | --- |
| `Validates JWT session and password fingerprint, then loads the user record.` | `Auth cookie, user upsert, subscription lookup, redirect` |
| `Blocks export when document ownership check fails.` | `GMP inactive` |
| `Redirects users without a team to /onboarding.` | `no-team redirect` |
| Column headers **Layer** \| **Responsibility** | `Surface \| Role`, `Route \| Role` |

**Lint:** `pnpm run specs:check-sdd-prose` checks Architecture boundaries tables in
`specs/engineering/features/**/*.md`.

**Self-check (SDD):** Read each Responsibility cell aloud. If it sounds like a commit message or Jira
subtask title, rewrite as a sentence.

#### 3.2.2 SDD `**Upstream:**` vs `**Rationale:**`

<a id="sdd-upstream"></a>

SDD **Business rules** are wiring for PRD outcomes and locked **`D-*`** decisions. Prefer a single
`**Upstream:**` line under a rule instead of prose **Rationale** — cite stable atoms, not file paths.

**Resolution order** (apply in order; stop when resolved):

| # | If the old rationale… | Then… |
| --- | --- | --- |
| 1 | Restates a PRD **Product** or **Binding** rule (`R-*`) | `**Upstream:** R-<AREA>-<NN>` (comma-separate multiple). Drop duplicated prose. |
| 2 | Restates a decision atom (`D-*`) | `**Upstream:** D-<AREA>-<NN>`. Use when the PRD names the outcome but the SDD implements a locked engineering choice (override, exposure, commercial path). |
| 3 | Points at sibling SDD sequencing | `**Upstream:** R-*` (if any) + relative link to sibling rule, e.g. `` [`first-run-gates.md`](./features/onboarding/first-run-gates.md) S-FIRST-02 ``. |
| 4 | Names an external/vendor fact | `**Upstream:** E-<VENDOR>-<NN>` from `/specs/engineering/external-deps/`. |
| 5 | Describes legacy data or schema drift | Move one sentence to **Data contracts** (field/column note). Remove rule-level rationale. |
| 6 | Describes an accepted trade-off with no thin PRD Binding rule | Add or cite a **`D-*`** atom in `/specs/engineering/decisions/` (human review). Do **not** invent atoms without sign-off — [report](#unresolved-rationale) instead. |
| 7 | Is implementation-only (SSR bypass, estimation shortcut, UI split) | Move to **Domain context**, **Architecture boundaries**, **Evaluation order**, or **Open documentation gaps**; omit rule-level rationale. |
| 8 | States the rule is obvious from the EARS sentence | Omit **Upstream** entirely (same as template: "omit when obvious"). |
| 9 | Documents known imperfection / future tightening | **Open documentation gaps** or **Implementation bugs** — not **Rationale**. |

**Format:**

```markdown
**S-FOO-01 (Event-Driven):** WHEN …, the system MUST …

**Upstream:** R-BAR-03, D-ROUTE-02.
```

Optional second clause after atoms: one short cross-link (sibling SDD rule), not a paragraph.

**PRD vs SDD:** PRDs keep **Rationale** on **Binding** rules (incident class). SDDs cite upstream atoms;
they do not re-explain incidents in prose.

**Do not:**

- Duplicate PRD teach-back text under SDD rules.
- Cite markdown file paths as the authority (use `R-*` / `D-*` / `E-*`).
- Leave **Rationale** and **Upstream** on the same rule.

<a id="unresolved-rationale"></a>

**When to report instead of resolving:** No matching `R-*`, no existing `D-*`, and promoting the
"why" would be a **new** product or compliance promise. List in the PR / review note; do not guess.

### 3.3 Agent convergence checklist

Before opening a PR for a new or updated binding spec, the author (human or agent) MUST:

1. Read [`spec-authoring.md`](./spec-authoring.md) and the matching `_TEMPLATE` for that doc type.
2. Read the [`feature.md`](./feature.md) index for a featured example for that doc type (if one exists).
3. List outcomes in a bullet inventory before writing EARS.
4. **Dictionary:** For every reused domain phrase, use the dictionary `preferred` label; add or update
   the term in [`domain-dictionary.yaml`](../meta/domain-dictionary.yaml) in the **same commit** if missing
   ([§8.2](#82-when-to-add-or-change-a-term)).
5. Assign rule IDs from the [area registry](#rule-area-registry); contiguous per file.
6. Fill **only** required sections (optional sections when justified).
7. Add Traceability / Test mapping tables.
8. Run `pnpm run specs:check` (or each `specs:check-*` script) before opening the PR.
9. Self-check: same template → same section tree and ID scheme as the featured example; [PRD precision §3.1.1](#311-prd-precision-anti-vagueness) for domain PRDs; [SDD prose §3.2.1](#321-sdd-prose) — read each Architecture boundaries Responsibility cell aloud.

### 3.4 Common agent mistakes (human review gate)

<a id="agent-review-gate"></a>

`pnpm run specs:check-*` catches broken links, rule-ID shape, vague PRD phrases, and some
telegraphic Architecture boundaries. It does **not** catch stack nouns in PRDs ([§3.1.1](#prd-layering)),
audit-note prose, misclassified open questions, or Product vs Binding misfiling. When reviewing
**agent-authored or agent-edited** binding specs, humans MUST scan for the patterns below even when CI
is green.

| # | Mistake | Why agents do it | Reviewer action |
| --- | --- | --- | --- |
| 1 | **Telegraphic Domain context** — colon labels and parenthetical lists (`W-2: CreateTeamFlow (payment, PIN…)`) | Pasting from a flow matrix or code skim | Rewrite as 1–3 full sentences ([§3.2.1](#321-sdd-prose)); read aloud — if it sounds like a Jira title, reject |
| 2 | **Index path IDs in binding SDDs** — `W-1`, `W-2`, `P-2`, etc. | Treating topic `index.md` flow matrix labels as rule IDs | Path IDs live in non-binding indexes only ([§5.1](#topic-indexes)); binding specs use `R-<AREA>-<NN>` (PRD) and `S-<AREA>-<NN>` (SDD) |
| 3 | **Mixed ID namespaces** — citing backfill path IDs as if they were `R-DOC-*` or `S-FLO-*` | Same as #2; shorthand from topic indexes | From SDDs, cite PRD outcomes as `PRD R-DOC-04`; use only registered `R-*` / `S-*` IDs in binding specs |
| 4 | **Architecture boundaries fragments** — comma lists, `Surface \| Role`, `GMP inactive` | Code audit pasted into Responsibility cells | One or more complete sentences per row; `specs:check-sdd-prose` helps but is not sufficient |
| 5 | **Open questions left as gaps** — settled product decisions or confirmed code bugs not promoted | Avoiding a call; conflating spec–code drift with policy gaps | Settled product → EARS rules; confirmed code defect → `## Implementation bugs`; delete stale open items ([§2.5](#open-questions-gaps-and-ownership)) |
| 6 | **Code changed to match stale spec** without owner sign-off | Backfill bias toward “make repo match the new doc” | Confirm product truth first; when spec is right and code is wrong, file **Implementation bugs** — do not silently “fix” code in the same spec PR unless asked |
| 7 | **Stale rollout / tenant exceptions** — outdated gating or exception rules after a tenant goes live | Copying old index rows or sibling SDDs without verifying launch status | Confirm with product/ops; promote settled behavior into EARS rules and delete stale open items ([§2.5](#open-questions-gaps-and-ownership)) |
| 8 | **Broken YAML frontmatter** — `## id:` inside the `---` block, or missing `code` / `upstream` | Multi-file edits corrupting frontmatter | Restore valid frontmatter per template before review |
| 9 | **Process labels in binding specs** — `Phase C`, `draft`, `CP2`, backfill status | Plan tracker leaking into SDD/PRD body | Process belongs in topic `index.md`, PR description, or Linear — not in binding specs ([§2.3](#23-forbidden-language-in-binding-specs)) |
| 10 | **Stack detail in PRDs** — `S-ENC-*` inline, routes, algorithms, `localStorage`, impl flags in EARS rules | Backfill from SDD/code skim; conflating compliance depth with SDD wiring | Outcome in PRD; stack in SDD. Reject at review per [§3.1.1](#prd-layering) |
| 11 | **Eng hygiene labeled as Binding** — middleware tips, “defense in depth,” key-type lists without an incident | Treating every MUST NOT as a PRD | Binding Rationale must **name the incident**; else move to SDD. Thin parent only ([§7](#what-belongs-in-prd-sdd-and-code)) |
| 12 | **Missing Product / Binding split** — flat theme groups only | Old template muscle memory | Use `### Product outcomes` and `### Binding operator / compliance promises` ([§3.1](#31-prd-domaincompliancecommercial)) |
| 13 | **Opaque knobs in PRD** — `200k` token caps, thinking=`low`, Auto Router maps as Product or Binding | Conflating “user doesn’t see it” with “must be a PRD” or with Binding | Dial → SDD/code; optional thin Product for honest limit only ([§7 opaque knobs](#deliberately-opaque-knobs)) |
| 14 | **Business NFR dumped into Product** — “cost optimization”, COGS targets as user outcomes | Treating every business goal as user-facing | Business goal → Clarify/SDD rationale; mechanism → SDD; Binding only if finance locks a named MUST ([§7 lenses](#requirement-lenses)) |

**Human review gate:** Before [upstream sign-off](../review/REVIEW_GUIDE.md#14-upstream-sign-off), the
reviewer reads **Domain context** and each **Architecture boundaries** Responsibility cell aloud. Any
index shorthand, path ID, or commit-message fragment → send back for rewrite.

Agents drafting specs SHOULD read this section before opening a spec PR.

---

## 4. Overlapping features & compliance

### 4.1 State owner vs. behavior implementer

Stay DRY across domains:

- **State owner** (e.g. privacy PRD): declares the toggle exists and lists downstream impacts via links.
  Does **not** write execution logic for other domains.
- **Behavior implementer** (e.g. llm-switcher tech spec): owns the EARS execution rules for impacted UI/logic.

### 4.2 Legal & external compliance

- **External facts** in `/specs/engineering/external-deps/` (vendors: ZDR, residency; libraries: missable quirks — not API shapes).
- **Feature tech specs** reference limits as hard constraints:
  `OpenAI suggestions MUST NOT be written to FloDown block statement without user confirmation (E-OPENAI-03).`

Vendor API shapes: fetch via MCP — see [architecture §9](../ai-native-development-architecture.md#9-external-services--mcp).

### 4.3 Roles and document-scoped access

<a id="multi-tenant-and-multi-channel-domains"></a>
<a id="roles-and-document-scoped-access"></a>

GloX is a **single deployment** academic tool with **role-based capabilities** (EXTRACTOR, CURATOR,
ADMIN) — not multi-tenant SaaS. Organize specs as follows.

#### PRD — one domain file, role-qualified rules when needed

| Do | Do not |
| --- | --- |
| One PRD per domain (`documents-extraction.md`, `flodown-blocks.md`) | Separate PRDs per role unless the product promise truly differs |
| Shared outcomes in a neutral subsection | Duplicate ownership rules across role-specific PRDs |
| Variant rules with EARS qualifiers (`WHEN user role is EXTRACTOR…`, `WHILE acting as CURATOR…`) | Implementation priority order in PRD prose |
| Closed exception lists (`R-DOC-02 through R-DOC-04 do not apply`) | Undefined jargon (`block`) without pointing at rule IDs |
| Admin-only outcomes in auth PRD or domain PRD with explicit role gate | Scattered role checks without rule IDs |

**Default-outcome rules** MUST enumerate which other rules prevent the default — by rule ID, not by SDD
evaluation order.

**Evaluation order** (which check runs first) belongs in the **SDD** only — e.g. a precedence table in
`auth-sessions.md`, not in the PRD.

#### SDD — split by capability, not by role

| Do | Do not |
| --- | --- |
| Topic SDDs (`upload-and-ownership`, `lifecycle`, `auth-sessions`) | One SDD per role mirroring the same flows |
| Role branches documented in Architecture boundaries | Hard-coded role strings without dictionary terms |
| Document ownership checks in every mutation SDD | Silent assumptions that “users only see their data” |

#### When to add a new file

| Trigger | Action |
| --- | --- |
| Same outcome, different code path per role | One PRD rule + WHEN role qualifier; SDD names modules |
| Different UX for extractor vs curator | Sibling SDD under the same domain folder |
| File exceeds ~3 pages or review is painful | Split SDD by capability (upload vs export), not by role |

**Featured example:** [`prds/domains/documents-extraction.md`](../prds/domains/documents-extraction.md) and
[`upload-and-ownership.md`](./features/documents-extraction/upload-and-ownership.md).

---

## 5. Authoring conventions

- **One concept = one file; ≤ ~3 pages** — split if larger.
- **Topic folders:** e.g. `/specs/engineering/features/billing/` with sub-files.
- **Dependency linking:** frontmatter `upstream` / `compliance` / `code` on PRDs and critical-area tech specs — [architecture §5](../ai-native-development-architecture.md#5-dependency-architecture-keeping-it-dry).
- **Templates:** [`prds/_TEMPLATE/`](../prds/_TEMPLATE/), [`features/_TEMPLATE/`](./features/_TEMPLATE/) — required section order for new PRDs/SDDs and topic `index.md` files.
- **Featured examples:** [`feature.md`](./feature.md) — copy structure from these when authoring.
- **CI:** `pnpm run specs:check` runs all linters. Individual scripts: `specs:check-links` (broken `@` refs and frontmatter); `specs:check-terms` (`deprecated_synonyms` in binding specs); `specs:check-rule-ids` (PRDs must not use `**S-…` rule headers; SDDs must not use `**R-…`); `specs:check-prd-prose` (vague PRD EARS phrases); `specs:check-sdd-prose` (telegraphic Architecture boundaries tables). PRD stack-noun layering is a human guideline ([§3.1.1](#prd-layering)), not a CI script.

**Glossary:** use preferred terms from [`domain-dictionary.yaml`](../meta/domain-dictionary.yaml).
Update rules: [§8](#8-domain-dictionary--glossary).

### 5.1 Topic indexes (`index.md`)

<a id="topic-indexes"></a>

Topic folders under `/specs/engineering/features/<domain>/` MAY include an `index.md` — a **non-binding**
navigation and backfill index. Copy [`features/_TEMPLATE/index.md`](./features/_TEMPLATE/index.md).

**Not binding:** topic indexes are never PRDs or SDDs. They MUST NOT contain EARS rules, `R-<AREA>-<NN>`
or `S-<AREA>-<NN>` IDs, or obligations that gate implementation. Process labels (`Pending`, `CP2`, `backfill`) belong here,
not in binding specs ([§2.3](#23-forbidden-language-in-binding-specs)).

#### When to create

| Create `features/<domain>/index.md` | Skip |
| --- | --- |
| Domain spans **multiple SDDs** and readers need a map | Single SDD covers the whole domain |
| **Spec backfill** from code ([DEVELOPER_GUIDE §4](../DEVELOPER_GUIDE.md#spec-backfill-existing-code)) | Greenfield work via OPSX (`/specs/changes/`) |
| Temporary audit, flow matrix, or test-gap rollup during backfill | All outcomes already in PRD + SDDs |

**Lightweight index** (stable): SDD map + domain PRD link + code anchors — see
[`billing/index.md`](./features/billing/index.md).

**Backfill index** (temporary): add flow matrix, open questions, test inventory, progress table — see
[`onboarding/index.md`](./features/onboarding/index.md). Shrink or delete optional sections when
backfill completes.

#### Required sections (if file exists)

| Section | Required | Content |
| --- | --- | --- |
| Non-binding notice | Yes | Blockquote: not a PRD/SDD; link §5.1 |
| SDD map | Yes | Table: file → status → scope |
| Domain PRD link | Yes | Path to implementing PRD |
| Flow matrix | Backfill only | Path IDs (`W-1`, `P-2`, …) → primary SDD — **never** copy path IDs into binding SDD Domain context ([§3.4](#agent-review-gate)) |
| Open questions | Backfill only | Temporary audit items — delete when promoted to PRD/SDD ([§2.5](#open-questions-gaps-and-ownership)) |
| Test inventory | Backfill only | Rollup gaps; per-rule mapping stays in SDD Test mapping |
| Backfill progress | Backfill only | Delete when PRD/SDDs are complete |

#### Lifecycle

1. **Create** at spec-backfill audit (CP0) before writing SDDs.
2. **During backfill** — record open questions and coverage gaps here; promote confirmed behavior into
   PRD/SDD rules and dictionary terms in the same PR.
3. **Retire** — when backfill finishes, reduce to SDD map + PRD link (billing style). Remove flow matrix,
   checkpoints, and resolved audit rows. Do not leave stale “Pending” SDDs in the map — update or delete.

#### Frontmatter

Optional `id: <domain>-index`. Do **not** set `featured: true` on topic indexes.

---

## 6. OPSX delta files (full SDD)

Work-in-flight specs live in `/specs/changes/` (one flat set per branch). `clarify.md` records
Clarify decisions. `proposal.md` records _what_ (including an optional PRD delta). `design.md` records
_how_ (the SDD delta). `tasks.md` records _do_ — atomic Apply steps only, with no new requirements.

Copy [`changes/_TEMPLATE/clarify.md`](../changes/_TEMPLATE/clarify.md) at Clarify; copy the rest of
[`changes/_TEMPLATE/`](../changes/_TEMPLATE/) at Propose after `clarify.md` is signed. Required sections and archive mapping:
[`changes/README.md`](../changes/README.md). Workflow: [DEVELOPER_GUIDE §4](../DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas);
review checklists: [REVIEW_GUIDE §1.2.0–1.2.3](../review/REVIEW_GUIDE.md#clarify-gate).

| File | Write EARS here when | Archive target |
| --- | --- | --- |
| `clarify.md` | Never — decision record only | Fold rationale into PRD/SDD as needed; keep in dated `archive/` folder |
| `proposal.md` → `## PRD delta` | New or changed binding *what* | `/specs/prds/...` (skip if **No PRD change**); keep source in `archive/` |
| `design.md` → `## SDD delta` | *How* on current stack | `/specs/engineering/features/...`; keep source in `archive/` |
| `tasks.md` | Never — checklist only | Keep in dated `archive/` folder (not folded into canonical) |

After Verify ([REVIEW_GUIDE §1.5](../review/REVIEW_GUIDE.md#15-verify-post-review-full-sdd)), Archive moves the
active set to `/specs/changes/archive/YYYY-MM-DD-<feature-slug>/` — see [changes/README.md](../changes/README.md).

Clarify → Propose principles, prompts, and worked example:
[CLARIFY_AND_PROPOSE.md](../changes/CLARIFY_AND_PROPOSE.md).

---

<a id="what-belongs-in-prd-sdd-and-code"></a>

## 7. What belongs in PRD, SDD, and code

Use the **two-filter classifier** ([architecture §4.6](../ai-native-development-architecture.md#46-classifying-a-rule-two-filter--wording-constraint))
and **declarative specs** (§1). Full Clarify guidance: [CLARIFY_AND_PROPOSE § What belongs](../changes/CLARIFY_AND_PROPOSE.md#what-belongs-in-prd-vs-sdd-vs-code).

### Decision tree

1. Would a **power user**, **team admin**, or **storefront / sales promise** need this to use or
   explain the product correctly? → **PRD** under `### Product outcomes`.
2. Else: would violating this be a **customer, partner, or compliance incident** even with no UI?
   → **PRD** under `### Binding operator / compliance promises` — **one thin outcome**; **Rationale
   MUST name the incident class**.
3. Else → **SDD** (or code).
4. PRD wording MUST NOT name routes, algorithms, columns, or impl flags ([§3.1.1](#prd-layering)).

**Slogan:** PRD = product promises and observable outcomes (user, admin, or sold capability), plus
thin binding incident-risk rules that remain true after a stack rewrite. SDD = how this stack keeps
those promises.

### Why this boundary

We chose this split for **authorship under AI + humans**, not to match a textbook FR/NFR taxonomy.

| Goal | How the boundary serves it |
| --- | --- |
| Stable contracts if the stack is rewritten | PRD wording stays outcome-only; stack nouns live in SDDs ([§3.1.1](#prd-layering)) |
| Readable product truth without lying by omission | **Product** for PM / support / power users; **Binding** for silent security and commercial MUST NOTs |
| Real but invisible constraints (cost, latency, truncate) | Opaque knobs → SDD by default; Binding only when finance/compliance locks a **named incident** |
| Agent-safe defaults | One decision tree + gold examples; Product vs Binding stays human judgment |
| Fit to OPSX | Clarify → PRD delta (_what_) / SDD delta (_how_) |

**Rejected alone:** magic black-box (inclusion only), power-user/support FAQ only, storefront-only,
FR vs NFR as the classifier, or “everything business” → Binding (junk drawer).

Full rationale (alternatives, rule-by-rule why, one-sentence external answer):
[other_docs/prd-sdd-boundary-rationale.md](../../other_docs/prd-sdd-boundary-rationale.md).

| Example | Layer |
| --- | --- |
| Curators must confirm LLM suggestions before they become FloDown statements | PRD — Product |
| Operators must not read another user's document content without authorization | PRD — Binding (incident: cross-user data exposure) |
| Rewrite local symref URIs before FloDown export | SDD |
| Long threads MUST remain usable (no overflow failure); early turns MAY be dropped | PRD — Product (optional honest limit) |
| Truncate when conversation tokens exceed 200k; drop-oldest then tail-trim | SDD — not PRD |
| Default model thinking effort to `low` for cost/latency | SDD or code — not PRD; not Binding |

<a id="deliberately-opaque-knobs"></a>

**Deliberately opaque knobs:** Hiding a dial from the UI does **not** make it a Binding PRD rule.
Binding is for silent **incidents** (storefront breach, operator can read DAR) — not for cost,
latency, or quality tuning.

| Opaque category | Example | Default home |
| --- | --- | --- |
| Perf / cost / quality knobs | thinking effort `low`, sampler temps, cache TTLs | **SDD or code** |
| Capacity limits with side effects | context truncate ~200k | **SDD** for how; thin **Product** only if you bind “must not crash / may drop early turns” |
| Hidden ranking maps | Auto Router category → model | **SDD**; Product only if you promise “Auto picks a suitable model” |
| Security opacity users should know | what admins cannot see in incognito | **PRD — Product** + SDD for how |
| Deceptive opacity | UI implies LLM output is already saved when it is only a suggestion | **PRD — Product** — must not stay opaque |

**Rule of thumb:** hide the dial in the SDD; put the promise (or honest limit) in the PRD only when
breaking it would be a wrong **product story**, not merely a wrong constant. If product refuses to
acknowledge the side effect at all, there is **no** PRD rule — SDD/code only; support playbooks may
still explain what users notice.

<a id="requirement-lenses"></a>

### Requirement lenses (FR / NFR, business / user-facing)

Use these to _talk_ about requirements; still **classify** with the two-filter tree above.

| Lens | What it asks | Maps to two-filter |
| --- | --- | --- |
| **User-facing** | Would a user or admin notice or need this explained? | Strong signal for **Product** if yes |
| **Business** | Does the company need this for margin, partner viability, GTM, or ops? | Not automatically PRD — often SDD rationale / Clarify; **Binding** only when locked as a named incident (e.g. unit-economics breach) |
| **Functional** | What behavior does the system perform? | Product if user-facing; else SDD (or Binding if silent security/commercial MUST) |
| **Non-functional** | Cost, latency, security, reliability, scale | Security silent NFRs → often **Binding**; cost/perf NFRs → usually **SDD** unless Product binds an honest outcome (SLA / “chat stays usable”) |

**Worked example — cost optimization via truncation / summarization:**

| Statement | Lens | Home |
| --- | --- | --- |
| “Keep LLM COGS viable on partner Standard seats” | Business NFR, not user-facing | Clarify Accepted tradeoffs + SDD Domain context / rationale — **not** Product |
| “WHEN over context budget, drop oldest then summarize / trim” | Functional mechanism for that business goal | **SDD** |
| “Default thinking effort to `low`” | Opaque cost/latency knob | **SDD or code** |
| “Long threads MUST NOT fail with overflow; early turns MAY be dropped” | User-facing side effect (honest limit) | Optional **PRD — Product** |
| “MUST keep average chat COGS ≤ $X/seat” (CEO/finance locked) | Business NFR as named MUST | **PRD — Binding** (incident: unit economics / partner margin); mechanisms still SDD |

Do **not** put “cost optimization” alone in Product. Do **not** treat every business preference as Binding —
only named, reviewable incident classes. Mechanisms that serve business NFRs stay in the SDD even when
users never see the dial.

**Not the same as a support FAQ:** Product outcomes are usually safe to explain to customers in plain
language. Binding rules, threat residuals, and internal commercial facts may stay in the PRD for
eng/compliance without being support-script material. How-tos, outages, and ticket macros are never PRD.

### 7.1 PRD delta — bind outcomes

- Product: observable behavior users or admins see; storefront / plan promises.
- Binding: thin MUST / MUST NOT for silent incidents; name the incident in Rationale.
- MUST / MUST NOT that tests can assert without knowing implementation.
- **Do not** bind a specific implementation when only the outcome matters unless product locked it.
- **Do not** grow Binding into eng hygiene lists — thin parent, fat SDD child.

### 7.2 SDD delta — bind policy on the current stack

- Where the behavior runs (module, route, job).
- Phase order and message classes (e.g. system stack excluded → drop history → trim tail).
- Budget formulas, env caps, engine exceptions, data contracts — including **deliberately opaque**
  knobs (token budgets, thinking effort, Auto Router maps); see [§7 deliberately opaque knobs](#deliberately-opaque-knobs).
- Test mapping: every PRD rule must map to a test; every `MUST NOT` must map to a negative test.
- **Do not** invent a new product promise only in the SDD — promote it to the PRD first.
- **Do not** paste loops, estimators, or tuning constants unless a test must assert the exact value.

### 7.3 Code — algorithms and tuning

- Loop bodies, heuristics, performance optimizations.
- Refactors that preserve spec behavior.
- If behavior is not in PRD/SDD and no test asserts it, it does not need to be in specs.

### 7.4 Refining requirements during Clarify

When discovery (e.g. system prompt budget, existing helpers, compliance limits) means the FR needs
adjustment:

1. Preserve the **user-visible outcome** in `clarify.md` (v1 scope) and later in the PRD delta.
2. Record the adjustment in `clarify.md` → **Accepted tradeoffs** and **Open questions**; copy to
   `proposal.md` → **Resolved questions** at Propose.
3. Get PM sign-off when the **product promise** changes — including accepted compromises, not only when implementation gets easier.
4. Put deferred asks in `clarify.md` → **Non-goals and v2**; copy to `proposal.md` at Propose.

---

<a id="domain-dictionary--glossary"></a>

## 8. Domain dictionary & glossary

**Canonical file:** [`/specs/meta/domain-dictionary.yaml`](../meta/domain-dictionary.yaml) — the only
glossary. [`glossary.md`](./glossary.md) is a redirect stub; do not add term definitions there.

There is **one** ubiquitous language (DDD). PRDs and SDDs do not define terms inline; they use
**preferred** labels and link term IDs. Legacy code names stay in `technical_anchors` / `legacy_code_names`
— not as alternate spec vocabulary.

### 8.1 Term record fields

| Field | Purpose |
| --- | --- |
| `preferred` | Label for PRDs, SDDs, EARS rules, and reviews |
| `definition` | What the term means (business + technical intent) |
| `technical_anchors` | Code/DB symbols, tables, enums, file paths — may list multiple. Omit when none. |
| `allowed_aliases` | **Intentional** names (storefront labels, legacy code identifiers) with `context`. Omit when none. |
| `deprecated_synonyms` | **Accidental** drift — do not use in binding specs (`/specs/prds/`, `/specs/engineering/features/`). Omit when none. |
| `see_also` | Narrative docs — not duplicate definitions. Omit when none. |

**Example:** `flo_down_block` preferred in PRDs; **definition block** is an `allowed_alias` in UI copy,
not a second term.

### 8.2 When to add or change a term

| Trigger | Action |
| --- | --- |
| Second time someone asks “what does X mean?” | Add a term (rule of thumb) |
| **New binding concept in a PRD or SDD** | Add or update term in **same commit** — mandatory, not optional |
| **Domain phrase reused in 2+ EARS rules** (same file or across PRD/SDD) | Add term in **same commit**; use `preferred` label in all rules |
| **Spec backfill** from code introduces a cross-cutting product concept | Add term when first binding rule is written — do not defer to a later “dictionary pass” |
| Storefront / branding name changes | Update `allowed_aliases` on existing term; sync [`pricing_and_entitlements.md`](../prds/commercial/pricing_and_entitlements.md) § Tenant branding if commercial |
| Code rename without product meaning change | Update `technical_anchors` only; keep `preferred` unless PM renames the product concept |
| Product renames a customer-facing concept | Update `preferred` + aliases; grep specs for `deprecated_synonyms` |

**Review gate:** If a binding spec introduces vocabulary not in the dictionary, upstream review fails until
the term is added or the prose is rewritten to use an existing `preferred` label.

### 8.3 PRD vs SDD vocabulary

| Doc | Use | Do not |
| --- | --- | --- |
| **PRD** | `preferred` labels in EARS; term ID in links or footnotes | Redefine terms; use `deprecated_synonyms` |
| **SDD** | Same `preferred` labels; data contracts that match `technical_anchors` | Invent new domain words not in dictionary |
| **Product brief** | Customer language; link term IDs | Introduce engineering terms without a dictionary entry |

### 8.4 Review & CI

- Upstream review: terms match dictionary `preferred` labels; no `deprecated_synonyms` in binding specs
  ([REVIEW_GUIDE §1.2](../review/REVIEW_GUIDE.md)).
- **CI:** `pnpm run specs:check-terms` lints `specs/prds/` and `specs/engineering/features/` against
  dictionary `deprecated_synonyms`.

---

## 9. Templates and featured examples

| Path | Purpose |
| --- | --- |
| [`prds/_TEMPLATE/prd.md`](../prds/_TEMPLATE/prd.md) | Skeleton for domain/compliance/commercial PRDs |
| [`features/_TEMPLATE/sdd.md`](./features/_TEMPLATE/sdd.md) | Skeleton for engineering SDDs |
| [`features/_TEMPLATE/index.md`](./features/_TEMPLATE/index.md) | Skeleton for topic `index.md` files (non-binding) |
| [`feature.md`](./feature.md) | Index of gold-standard specs agents MUST mirror |

Mark a polished spec with `featured: true` in frontmatter only after it passes review against this
guide. Do not mark work-in-progress specs as featured.
