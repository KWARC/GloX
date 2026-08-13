---
canonical_for:
  - clarify-propose-workflow
  - preserve-outcome-adjust-approach
  - prd-sdd-code-split
informed_by:
  - /specs/DEVELOPER_GUIDE.md
  - /specs/engineering/spec-authoring.md
  - /specs/review/REVIEW_GUIDE.md
see_also:
  - /specs/changes/README.md
  - /specs/changes/_TEMPLATE/
---

# Clarify → Propose

**Canonical for** the conversation that precedes `/specs/changes/`, principles when requirements get
fuzzy, and the split between PRD, SDD, and code.


| Question               | Read instead                                                                  |
| ---------------------- | ----------------------------------------------------------------------------- |
| Full SDD workflow      | [DEVELOPER_GUIDE §4](../DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas)    |
| Delta file definitions | [changes/README.md](./README.md)                                              |
| Review checklists      | [REVIEW_GUIDE §1.2](../review/REVIEW_GUIDE.md#part-1--upstream-review-strict) |
| EARS and spec craft    | [spec-authoring.md](../engineering/spec-authoring.md)                         |


**Rule:** Propose is not a one-shot generation step. It translates a **signed-off `clarify.md`** into
delta files. Do not draft `proposal.md`, `design.md`, or `tasks.md` until Clarify is complete and
`clarify.md` is signed off (**lock it**).

**Posture:** The agent thinks like a **senior engineer** — judgment over ceremony. Use the patterns
below when they help; skip them when the FR is narrow, well-specified, and low-ambiguity.

---

## Principles

These apply when a feature request is vague, grows during discovery, or needs adjustment for
engineering constraints, prioritization, compliance, or user experience.

### P0 — Senior engineer judgment

Clarify is a conversation, not a template to fill. **Offer options** when there is a genuine fork
with tradeoffs worth discussing — not three artificial choices on every question. **Split v1 / v2**
when scope is large, risky, or unclear — not on every FR. When the path is obvious (small fix, clear
compliance story, existing PRD covers it), state the recommendation briefly and move to **lock it**.
Do not perform Clarify theater.

### P1 — Decision record before deltas

Do not draft `proposal.md`, `design.md`, or `tasks.md` while material ambiguity remains. The agent
maintains `clarify.md` during Clarify — audits, options, scope, and **human decisions** — until the
human signs off. Propose formalizes those locked decisions into EARS; it does not invent new ones.

### P2 — Preserve the outcome, adjust the approach

The FR is **input**, not final PRD text. Bind the **chosen** observable effects in the PRD delta —
which may differ from the original ask after tradeoffs.

When discovery surfaces engineering constraints, prioritization, compliance limits, or a simpler path,
the agent **presents options when they matter** (effort, risk, product impact). A simpler approach may
be right even when users **would** notice a difference, if engineer and PM agree the compromise is
acceptable. **Engineer and PM decide together**; the agent does not narrow scope silently.

Record the decision in `clarify.md` (Options, Accepted tradeoffs) and later in **Resolved questions**
at Propose. Escalate to PM when the product promise changes materially — not only when implementation
gets easier.

### P3 — v1 now, v2 after feedback (when scope warrants it)

When the FR is too large or ambiguous for one safe PR, propose the **smallest shippable slice** for v1
and defer the rest to **Iteration plan § v2** and **Non-goals**. v2 is a separate branch later — never
smuggled into v1 EARS or tasks. If the FR is already a tight, single change, ship it; do not invent a
v2 backlog for appearance.

### P4 — Stop scope creep

When the FR implies work beyond v1, name it explicitly and ask: *"Is that v1 or v2?"* New
requirements appearing only in `design.md` or `tasks.md` are defects — send them back to Clarify or
Non-goals.

### P5 — Agent drafts, human approves

The agent restates, researches upstream specs, offers options **when useful**, and drafts deltas. The
human picks, defers, corrects drift, and approves phase transitions. Plausible output is not approval.

### P6 — Declarative specs, not pseudo-code

PRD and SDD state **what must be true** and **policy on the current stack** — not loops, estimators,
or tuning constants. If a reviewer must teach it back without reading code, or a test must assert it,
it belongs in PRD or SDD. Otherwise it stays in code.

### P7 — HALT on compliance

On contradiction with compliance PRDs, vendor facts, or ADRs: **stop**, cite the conflict, and
escalate per [organization.md](../organization/organization.md). Do not guess or
paper over with implementation.

---

## When things get fuzzy — decision rules

Use these when discovery complicates the original FR (existing code, system prompts, tenancy, billing
cross-cuts, etc.).


| Situation                                                             | Rule                                                                                                                                                                                                 | Where to record                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| PM specified an approach (e.g. 100k head + 200k tail)                 | Present options: literal FR, simpler path, compromise. Engineer + PM pick. Bind **chosen** outcome in PRD.                                                                                           | `Resolved questions`; PRD delta                                |
| PM's approach is required verbatim ("always keep first user message") | **Bind it** in PRD or SDD. Pay the complexity cost.                                                                                                                                                  | PRD delta or SDD delta                                         |
| Discovery reveals system-prompt / file / tool budget not in the FR    | **Re-scope v1** in Clarify; do not silently absorb in code                                                                                                                                           | `clarify.md` → Accepted tradeoffs; later `Resolved questions` |
| Unsure if a rule is PRD vs SDD                                        | **Two-filter classifier** ([architecture §4.6](../ai-native-development-architecture.md#46-classifying-a-rule-two-filter--wording-constraint)): product/observable or binding incident → PRD; stack wiring → SDD | See [What belongs](#what-belongs-in-prd-vs-sdd-vs-code) below  |
| Deliberately opaque knob (200k truncate, thinking=`low`)              | **SDD or code** for the dial; thin **Product** only for an honest outcome/limit — never Binding just because the UI hides it | [spec-authoring §7 opaque knobs](../engineering/spec-authoring.md#deliberately-opaque-knobs) |
| Business NFR not user-facing (cost / COGS / latency budgets)          | Goal in Clarify + SDD rationale; **mechanisms** in SDD; Binding only if finance locks a named MUST | [spec-authoring §7 lenses](../engineering/spec-authoring.md#requirement-lenses) |
| Unsure if a detail is SDD vs code                                     | If integration tests assert it without reading implementation → SDD. If it's tuning or loop structure → code                                                                                         | SDD names **phases** and **boundaries**; code holds **loops**  |
| New ask appears mid-Apply                                             | **HALT Apply.** Either v1 scope creep (→ Non-goals / v2) or requires new Clarify                                                                                                                     | Send back to Clarify or new FR                                 |
| Engineering-only fix, obvious blast radius, no PRD change             | Clarify may be **thin** — still record audit and **No PRD change** in `clarify.md`                                                                                                                   | `clarify.md` → PRD change decision                             |
| Greenfield or compliance-touching work                                | Clarify is **never** skipped                                                                                                                                                                         | Review proposal, design, and tasks in full |


**Choosing among options (P2):** When there is a **meaningful fork**, list approaches with **product
impact**, **engineering cost**, and **risk**. Engineer and PM pick — including acceptable compromises.
One clear recommendation is fine when alternatives are not worth discussing. Document the choice in
**Resolved questions**; bind what you ship in the PRD delta. Compliance or ADR conflicts still
**HALT** (P7).

---

<a id="phase-a--clarify"></a>

## Phase A — Clarify (`clarify.md`; no delta files)

**Agent mode:** Copy [`_TEMPLATE/clarify.md`](./_TEMPLATE/clarify.md) into `/specs/changes/` at the
start of Clarify. Update it iteratively. Do **not** draft `proposal.md`, `design.md`, or `tasks.md` yet.

### Agent responsibilities


| Action                              | When                                | Example                                                                         |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Restate the ask in one paragraph    | Always                              | "You want long threads to work without overflow failures under engine budgets." |
| List what's **missing** from the FR | When ambiguity blocks binding specs | Tenancy, tier, failure mode, system prompt handling                             |
| Offer **options**                   | When there is a real tradeoff       | "A: literal FR. B: drop-oldest + tail-trim. C: defer ratios to v2."             |
| State a **single recommendation**   | When the path is clear              | "Extend existing `enforceInputBudget`; no PRD change."                          |
| Propose **v1 / v2 split**           | When scope is large or risky        | "Ship enforcement in v1; admin UI in v2."                                       |
| Flag **creep**                      | When the FR grows beyond v1         | "FR also implies export — defer?"                                               |
| Check upstream                      | Critical-area work                  | "Touches billing PRD §X and D-COMP-01 — …"                                       |
| Apply **P7** on compliance conflict | Always when conflict found          | HALT and escalate                                                               |


### Human responsibilities

Record every decision in `clarify.md` — not only in the IDE thread.

- Answer questions (or say "I need to ask PM").
- **Pick** options with PM when product impact or compromise is on the table — do not leave everything open.
- Say explicitly **"not in v1"** for deferred items.
- Complete the **Human decisions** checklist in `clarify.md` and sign **Lock it** when ready.
- Send the FR back to PM if it is too vague to bind.

### Exit criterion

`clarify.md` is complete, the **Human decisions** checklist is checked, and the human signs
**Lock it — sign-off**. Only then may Propose begin.

### Agent opener

Use Cursor skill **[`opsx-clarify`](../../.cursor/skills/opsx-clarify/SKILL.md)** (includes the agent opener). Do not duplicate prompts here.

### Clarify checklist (human)

Review `clarify.md` — not chat scrollback:

- [ ] Restatement matches what PM / requester actually asked for
- [ ] Upstream audit complete; compliance pass or HALT escalated
- [ ] Material ambiguities resolved or explicitly deferred — not padded with fake options
- [ ] Approach chosen (or N/A with recommendation accepted)
- [ ] v1 scope is shippable; non-goals / v2 recorded when scope was split or deferred
- [ ] PRD change vs **No PRD change** confirmed
- [ ] Tradeoffs and engineer + PM agreement documented when the FR was adjusted (P2)
- [ ] **Human decisions** section signed — **Lock it**

---

## Phase B — Propose (write deltas from signed `clarify.md`)

Only after **Lock it** on `clarify.md`: copy the remaining [`_TEMPLATE/`](./_TEMPLATE/) files into
`/specs/changes/` (if not already present), then draft `proposal.md`, then `design.md`, then
`tasks.md`. **Translate** `clarify.md` — do not add decisions that were not locked in Clarify.


| `clarify.md` section   | Maps to in deltas                                                  |
| ---------------------- | ------------------------------------------------------------------ |
| Restatement, v1 scope  | `proposal.md` → Intent and scope                                   |
| Non-goals, v2          | `proposal.md` → Non-goals; Iteration plan                          |
| Upstream audit         | `proposal.md` → Upstream audit; Upstream links                     |
| Open questions, Options, Accepted tradeoffs | `proposal.md` → Resolved questions              |
| PRD change decision    | `proposal.md` → PRD delta or **No PRD change**                     |
| Chosen approach        | `design.md` → SDD delta (policy, not pseudo-code)                    |


Review each file per [REVIEW_GUIDE §1.2](../review/REVIEW_GUIDE.md#part-1--upstream-review-strict) before the next.

### Agent prompt (after lock it)

Use Cursor skill **[`opsx-propose`](../../.cursor/skills/opsx-propose/SKILL.md)** after **Lock it**. Do not duplicate prompts here.

### Propose checklist (human)

- [ ] **Resolved questions** matches `clarify.md` (no drift from signed decisions)
- [ ] **Non-goals** and **Iteration plan** match the locked conversation
- [ ] PRD / SDD / tasks contain **no v2 work**
- [ ] Teach-back on every EARS rule ([REVIEW_GUIDE §1.4](../review/REVIEW_GUIDE.md#14-upstream-sign-off))
- [ ] Adjustments from the original FR documented with options considered and who decided (P2)

---

## Human review gates (summary)


| Gate                | When                    | Artifact        | Blocks                                 |
| ------------------- | ----------------------- | --------------- | -------------------------------------- |
| **0 — Clarify**     | Before any delta files  | `clarify.md`    | Propose                                |
| **1 — proposal.md** | After Propose           | `proposal.md`   | design.md review; greenfield PRD delta |
| **2 — design.md**   | After proposal approved | `design.md`     | Apply                                  |
| **3 — tasks.md**    | After design approved   | `tasks.md`      | Apply                                  |


Canonical checklists: [REVIEW_GUIDE §1.2](../review/REVIEW_GUIDE.md#part-1--upstream-review-strict).

---

## What belongs in PRD vs SDD vs code

See also [spec-authoring §7](../engineering/spec-authoring.md#what-belongs-in-prd-sdd-and-code)
and [architecture §4.6](../ai-native-development-architecture.md#46-classifying-a-rule-two-filter--wording-constraint).

**Two-filter tree:** (1) power user / team admin / storefront need this? → PRD Product.
(2) Else silent customer/partner/compliance incident? → PRD Binding (thin; name the incident).
(3) Else SDD. (4) No stack nouns in PRD wording.

| Layer    | File                      | Bind                                                                                                          | Do not put here                                    |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **PRD**  | `proposal.md` → PRD delta | Product outcomes; thin binding incident-risk MUST / MUST NOT                                                  | File paths, loops, token estimators, env var names, inline `S-*` SDD rule IDs, eng hygiene without a named incident |
| **SDD**  | `design.md` → SDD delta   | Where it runs; phase order; budget formulas; message classes; data contracts; engine exceptions; test mapping | Full pseudocode, tuning constants, `while` loops; new product promises not in the PRD |
| **Code** | Implementation            | Algorithms, heuristics, performance optimizations that preserve spec behavior                                 | New behavior not in PRD/SDD and not tested         |

| Example | Layer |
| --- | --- |
| Secure users must set a custom PIN before chat unlocks | PRD — Product |
| No retained server decrypt of stored Secure chat after the request | PRD — Binding |
| HKDF `chatKey` from `userSymmetricKey` | SDD |
| Long threads stay usable; early turns may be dropped | PRD — Product (optional honest limit) |
| Truncate at 200k tokens; drop-oldest then tail-trim | SDD |
| Default thinking effort to `low` | SDD or code — not Binding |

**Deliberately opaque knobs ≠ Binding.** Hide the dial (200k budget, thinking=`low`) in the SDD.
Add a thin Product rule only for an honest outcome/limit — never the secret constant. Full table:
[spec-authoring §7](../engineering/spec-authoring.md#deliberately-opaque-knobs).

**Business vs user-facing / FR vs NFR:** Cost optimization is a **business NFR** (not user-facing).
It does **not** go in Product just because it matters to the company. Record the goal in Clarify /
SDD rationale; put truncation/summarization/thinking defaults in the **SDD**; add Product only for
honest side effects; Binding only if CEO/finance locks a named unit-economics MUST. Mapping:
[spec-authoring §7 lenses](../engineering/spec-authoring.md#requirement-lenses).

**PRD layering:** Keep stack nouns out of PRD EARS lines
([spec-authoring §3.1.1](../engineering/spec-authoring.md#prd-layering)) — human review guideline.
Product vs Binding inclusion is author judgment + upstream review.


**SDD names the policy graph, not every branch.** Example: "WHEN over budget, the system MUST apply
history reduction before tail truncation" — not the `shift()` loop. Exact token caps and thinking
effort defaults live in the SDD even when the product UI never shows them.

---

## Worked example — conversation context truncation

**FR (input):** Truncate user conversation context to 300k tokens (100k from the start of the
conversation, 200k from the end). System prompt handling is unspecified.

**Discovery in Clarify:** Existing `enforceInputBudget` in `chat_utils.ts` drops oldest messages then
trims the tail of the last message. System prompt, file parts, and tenant origin prompts consume
budget before "conversation" tokens. A literal 100k + 200k split on messages alone can still overflow.

### Clarify outcomes (locked in `clarify.md`)


| Topic                           | Decision                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Effect**                      | Long threads must not fail from context overflow; system instructions must survive                                       |
| **Engineering adjustment (P2)** | FR asked 100k/200k split; engineer + PM chose drop-oldest + tail-trim for v1 — acceptable compromise; exact ratios in v2 |
| **Non-goal (v1)**               | Exact head/tail token ratios; admin visibility into partition math                                                       |
| **v2**                          | Per-engine breakdown UI; configurable head preservation if PM requires it                                                |


### What goes where


| Question                                 | PRD                 | SDD                    | Code             |
| ---------------------------------------- | ------------------- | ---------------------- | ---------------- |
| Long threads must not break the chat     | ✓                   |                        |                  |
| System prompt must survive               | ✓                   | ✓ (which prompt stack) |                  |
| 100k / 200k exact split                  | Only if PM locks it |                        |                  |
| Budget formula (ratio × window, env cap) |                     | ✓                      |                  |
| Drop oldest vs head/tail strategy        |                     | ✓ (chosen strategy)    | ✓ (loop details) |
| Truncation marker / observability flags  | ✓ or SDD            | ✓                      |                  |
| `chars/4` token estimator                |                     |                        | ✓                |
| Per-engine skip rules                    |                     | ✓                      | ✓                |


### Example PRD delta (outcome-oriented)

```text
WHEN prepared chat input exceeds the engine input token budget,
the system MUST reduce conversation history before calling the provider.

WHEN history is reduced,
the system MUST retain the system prompt and MUST NOT silently drop compliance-related prompt content.

WHEN a single message still exceeds the remaining budget,
the system MUST trim that message so the request fits the budget.
```

No "100k/200k" unless PM locks head/tail as a product promise. The truncation **threshold and
algorithm are deliberately opaque** to end users — they live in the SDD even when Product only binds
“long threads stay usable.” Same pattern for hidden knobs like default thinking effort `low`.

### Example SDD delta (policy, not pseudocode)

```text
WHILE assembling provider input in chat_utils.ts,
the system MUST compute inputTokenBudget from engine context window, INPUT_CONTEXT_BUDGET_RATIO, and MAX_INPUT_TOKENS.

The system prompt stack (system message, tenant origin, file prompts) MUST be accounted for before droppable history.

WHEN total estimated tokens exceed inputTokenBudget,
the system MUST drop oldest conversation messages before trimming the tail of the last message.

WHEN truncation occurs,
the system MUST set truncatedByHistory / truncatedByTail (or successors) for observability.
```

### Resolved questions (copied to `proposal.md` at Propose)


| Question                       | Resolution                                                                        | Owner    | Date |
| ------------------------------ | --------------------------------------------------------------------------------- | -------- | ---- |
| FR asked for 100k + 200k split | PM agreed: v1 uses drop-oldest + tail-trim; exact head/tail ratios deferred to v2 | Dev + PM | …    |


### tasks.md

- Red phase: integration tests — over-budget thread succeeds; system prompt present; truncation flags set.
- Implementation: extend `enforceInputBudget` per design.md — no new EARS in tasks.

---

## Conversation tactics (complexity and creep)

**Agent — use when relevant (P0):**

1. Smallest shippable slice when the FR is too big (P3) — not mandatory on every task.
2. One critical domain per PR when cross-cutting risk is high.
3. **Iteration plan § v2** when deferring real scope — skip empty v2 sections.
4. Complexity check when EARS count or blast radius spikes: "This adds N rules — cut X?"

**Human watches for:**

- Ceremony without substance (options nobody needs, v2 lists with nothing deferred).
- New requirements in `design.md` that were not in Clarify (P4).
- `tasks.md` steps that implement deferred work.
- PRD rules that solve hypothetical futures ("WHEN user might…").

**Phrase when creep appears:** *"Is that v1 or v2?"* — not on every bullet by reflex.

---

## Where decisions live

- **`clarify.md`** — durable decision record during Clarify (audit, options, v1/v2, human checklist). Signed before Propose.
- **IDE thread** — exploration and back-and-forth; decisions must be copied into `clarify.md`.
- **`proposal.md` → Resolved questions** — formal EARS-facing record at Propose; must match signed `clarify.md`.

**PM loop:** Cap at roughly five blocking questions to PM per feature request. Batch them in Clarify,
not mid-Apply.