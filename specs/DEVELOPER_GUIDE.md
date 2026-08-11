---

## kind: developer-guide
canonical_for:
  - developer-onboarding
  - workflow-navigation
  - opsx-procedure
informed_by:
  - /specs/ai-native-development-architecture.md
  - /specs/engineering/spec-authoring.md
  - /specs/changes/CLARIFY_AND_PROPOSE.md
  - /AGENTS.md
  - /specs/changes/README.md
see_also:
  - /specs/review/REVIEW_GUIDE.md
  - /specs/review/TESTING_GUIDE.md
  - /specs/traced-knowledge-graph.md

# Developer Guide

Linear onboarding for humans and agents. **Canonical for developer onboarding, workflow navigation,
and OPSX procedure** — the ordered path from idea to merge.


| Question                                | Read instead                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| Why does this system exist?             | [ai-native-development-architecture.md](./ai-native-development-architecture.md) |
| What are spec node kinds and upstreams? | [traced-knowledge-graph.md](./traced-knowledge-graph.md)                         |
| How do I Clarify → Propose?             | [changes/CLARIFY_AND_PROPOSE.md](./changes/CLARIFY_AND_PROPOSE.md)               |
| How do I write specs? (EARS, templates) | [engineering/spec-authoring.md](./engineering/spec-authoring.md)                 |
| How do I review?                        | [review/REVIEW_GUIDE.md](./review/REVIEW_GUIDE.md)                               |
| How do I write tests?                   | [review/TESTING_GUIDE.md](./review/TESTING_GUIDE.md)                             |


**New here?** Read this top-to-bottom once, then skim [architecture §1 + §4](./ai-native-development-architecture.md) and [traced knowledge graph §0–§2](./traced-knowledge-graph.md) (~20 min).

---

## 1. Choose your mode

Before any work, decide **lightweight** vs **full SDD**. Full detail: [architecture §2](./ai-native-development-architecture.md#2-operating-modes).


| Signal                                                                                                  | Mode                                         |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Prototype, spike, UI/copy, simple CRUD, no security/compliance                                          | **Lightweight**                              |
| Privacy/compliance, auth/tenancy, billing, encryption, onboarding flows, engine switching, cross-domain | **Full SDD**                                 |
| Unsure on low-stakes work                                                                               | **Lightweight** — escalate if rework follows |


---

## 2. Document map


| Question                                   | Read                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Product vision, roadmap, shipped features? | [/specs/product/](./product/) — not PRDs                                                               |
| Binding MUST rules?                        | [/specs/prds/](./prds/)                                                                                |
| Tech specs (EARS SDDs)?                    | [/specs/engineering/features/](./engineering/features/)                                                |
| Decisions (`D-*`), domain dictionary?      | `/specs/engineering/decisions/`; [`domain-dictionary.yaml`](./meta/domain-dictionary.yaml) |
| External compliance?                         | [/specs/engineering/external-deps/vendors/](./engineering/external-deps/vendors/)                                                    |
| Clarify → Propose (principles, prompts)?   | [changes/CLARIFY_AND_PROPOSE.md](./changes/CLARIFY_AND_PROPOSE.md)                                     |
| OPSX delta (work in flight)?               | [changes/](./changes/) — `clarify.md` + deltas per branch; copy [_TEMPLATE/](./changes/_TEMPLATE/) |
| System design?                             | [architecture.md](./ai-native-development-architecture.md)                                             |
| Spec craft (EARS)?                         | [spec-authoring.md](./engineering/spec-authoring.md)                                                   |
| Review gates?                              | [REVIEW_GUIDE.md](./review/REVIEW_GUIDE.md)                                                            |
| How to generate tests?                     | [TESTING_GUIDE.md](./review/TESTING_GUIDE.md)                                                          |
| GloX coding conventions (UI / server)?     | [frontend-skill](../.cursor/skills/frontend-skill/SKILL.md), [backend-skill](../.cursor/skills/backend-skill/SKILL.md) |


**Layer rule:** PRDs state *what* must be true — product outcomes and thin binding incident-risk
promises ([two-filter classifier](./ai-native-development-architecture.md#46-classifying-a-rule-two-filter--wording-constraint)).
Engineering tech specs state *how* we implement that on the current stack. Product docs in `/specs/product/` inform priorities but
do not gate implementation.

---

## 3. Lightweight path (default)

Use author judgment, state a one-paragraph goal (optionally skimming the product brief or glossary),
get human approval in Plan Mode, then write code and tests, pass tiered code review, run Archive
(spec sync), and open/merge a PR. Cursor skill: **[`lightweight-plan-archive`](../.cursor/skills/lightweight-plan-archive/SKILL.md)**.

```
Author judgment
    → one-paragraph goal (optional skim: product brief, glossary)
    → Plan Mode → human approves plan          ← REVIEW_GUIDE §1.3
      (plan MUST include Archive / spec sync)
    → code + tests
    → make PR ready for review
    → tiered code review + fixes               ← REVIEW_GUIDE §3
    → Archive (spec sync): update canonical specs or record No spec change
    → PR (agent may commit after session approval)
```

**Plan Mode rule:** No code until a human-readable plan is manually approved.

**Plan of record:** Cursor **Plan Mode** output in the IDE. It is not committed to `/specs/changes/`.
Record sign-off in the PR description if useful ([REVIEW_GUIDE §1.3](./review/REVIEW_GUIDE.md#13-plan-mode-review-lightweight-only)).

**Archive (spec sync) — required in the plan:** Lightweight work MUST check whether any specs changed
(or should change) because of the code: PRDs, engineering SDDs, external-deps/deployment docs, or product inventory.
Update those canonical files in the same PR, or explicitly record **No spec change** in the plan/PR.
Lightweight does **not** use the OPSX delta quartet or dated folders under `/specs/changes/archive/`
(those are full SDD only).

---

## 4. Full SDD path (critical areas)

Use this path for security, compliance, billing, tenancy, encryption, onboarding flows, and other
critical-area work.
**Principles and prompts:** [CLARIFY_AND_PROPOSE.md](./changes/CLARIFY_AND_PROPOSE.md).

**Human vs AI:** The agent drafts almost everything — deltas, tests, and implementation. The developer
steers, reviews line-by-line, corrects mistakes, and approves phase transitions. Do not skip human
review because the output looks plausible.

You receive a feature request (Linear issue, brief, Slack thread). Product requests are **inputs** —
often vague or need adjustment for engineering constraints, prioritization, compliance, or user
experience. Bind **outcomes** in specs for what engineer and PM agreed to ship; document tradeoffs in
Resolved questions when the ask was adjusted.

1. **Clarify (`clarify.md`).** Cursor skill: **`opsx-clarify`**. Copy `_TEMPLATE/clarify.md` into `/specs/changes/`. The agent acts as a
   senior engineer: restates the FR, fills the upstream audit, surfaces options when tradeoffs matter,
   and records v1/v2 scope. You make the decisions listed in **Human decisions** and sign **Lock it**
   on `clarify.md`. Do not draft `proposal.md`, `design.md`, or `tasks.md` yet. See
   [CLARIFY_AND_PROPOSE § Phase A](./changes/CLARIFY_AND_PROPOSE.md#phase-a--clarify).
2. **Propose (write deltas).** Cursor skill: **`opsx-propose`**. After `clarify.md` is signed, copy the rest of `_TEMPLATE/` and draft
   `proposal.md`, then `design.md`, then `tasks.md` **from** `clarify.md` — no new decisions. You
   review each file per [REVIEW_GUIDE §1](./review/REVIEW_GUIDE.md#part-1--upstream-review-strict)
   before the next.
3. **Red-phase tests.** Cursor skill: **`opsx-red`**. Agent drafts tests from the delta; you audit assertions per
   [REVIEW_GUIDE §2](./review/REVIEW_GUIDE.md#part-2--testing-trophy-full-sdd) and
   [TESTING_GUIDE](./review/TESTING_GUIDE.md), and confirm they fail before implementation.
4. **Apply.** Cursor skill: **`opsx-apply`**. Agent executes `tasks.md`, confirms the mapped tests run (Apply-time check in
   `tasks.md` → Verify), and hands off. You make the **PR ready for review**.
5. **Tiered code review** per [REVIEW_GUIDE §3](./review/REVIEW_GUIDE.md#part-3--code-review-tiered-by-cost-of-failure).
   Fix review findings (human + agent as needed).
6. **Verify (post-review).** Cursor skill: **`opsx-verify`**. After human review is clean, the agent runs the **artifact ↔
   implementation** checklist ([REVIEW_GUIDE §1.5](./review/REVIEW_GUIDE.md#15-verify-post-review-full-sdd)).
   You give a **cursory** human sign-off. On mismatch, the agent **informs you**; you decide whether
   to fix **code** to match the signed deltas or update the **deltas** to match accepted code — then
   re-run Verify.
7. **Archive.** Cursor skill: **`opsx-archive`**. After Verify sign-off: fold deltas into PRDs and `/specs/engineering/features/`; move
   the active set (`clarify.md`, `proposal.md`, `design.md`, `tasks.md`) to
   `/specs/changes/archive/YYYY-MM-DD-<feature-slug>/`; update the product inventory if user-visible
   behavior changed. You commit; the agent does not commit in full SDD.

Do not edit canonical PRDs or tech specs while building. Keep one flat set of change files per branch
until Archive folds them into canonical specs and moves the set under `archive/`.

### Plan Mode vs OPSX deltas


|                            | Lightweight (§3)                                                                       | Full SDD (this section)                                                        |
| -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Plan of record**         | Cursor Plan Mode (IDE)                                                                 | `/specs/changes/` (`clarify.md`, `proposal.md`, `design.md`, `tasks.md`)       |
| **Files**                  | —                                                                                      | One flat set per branch                                                        |
| **Committed before code?** | No                                                                                     | Yes — `clarify.md` before Propose; full set before Apply                       |
| **Line-by-line review**    | [REVIEW_GUIDE §1.3](./review/REVIEW_GUIDE.md#13-plan-mode-review-lightweight-only) | [REVIEW_GUIDE §1.2](./review/REVIEW_GUIDE.md#12-upstream-review-checklist) |
| **Post-review Verify**     | Spec sync in Archive step of the plan                                                  | Agent artifact checklist + cursory human sign-off ([§1.5](./review/REVIEW_GUIDE.md#15-verify-post-review-full-sdd)) |
| **Archive**                | Update canonical specs in PR (or **No spec change**)                                   | Fold deltas; move set to `archive/YYYY-MM-DD-<feature-slug>/`                  |


In full SDD, delta files **replace** Plan Mode as the durable approval artifact. Plan Mode may still
help during Explore and Clarify, but **Propose** must materialize the plan into the delta folder.
Do not start Apply on an IDE-only plan that was never written to `/specs/changes/`.

**Policy:** `clarify.md` records Clarify decisions. `proposal.md` records *what* (including an optional
PRD delta). `design.md` records *how* (the SDD delta). `tasks.md` records *do* — atomic Apply steps
only, with no new requirements.

Copy [`/specs/changes/_TEMPLATE/clarify.md`](./changes/_TEMPLATE/clarify.md) at the start of
Clarify. Copy the rest of [`/specs/changes/_TEMPLATE/`](./changes/_TEMPLATE/) at Propose only
after `clarify.md` is signed. File definitions live in [changes/README.md](./changes/README.md);
principles and prompts live in [CLARIFY_AND_PROPOSE.md](./changes/CLARIFY_AND_PROPOSE.md).


| File          | Role                                                               |
| ------------- | ------------------------------------------------------------------ |
| `clarify.md`  | Audit, options, v1/v2, **human decisions** — signed before Propose |
| `proposal.md` | Intent, v1/v2, **PRD delta** (outcomes) — or **No PRD change**     |
| `design.md`   | **SDD delta** (policy, boundaries) — not pseudo-code               |
| `tasks.md`    | Atomic Apply steps only — no new requirements                      |



| File          | Reviewer verifies                                               | Blocks                          |
| ------------- | --------------------------------------------------------------- | ------------------------------- |
| `clarify.md`  | Human decisions complete; audit pass or HALT                    | **Propose**                     |
| `proposal.md` | Matches `clarify.md`; teach-back on *what*; PRD delta or waiver | Incomplete greenfield PRD delta |
| `design.md`   | Teach-back on *how*; PRD rules traced; tests planned            | **Apply**                       |
| `tasks.md`    | Atomic, ordered, cites proposal/design                          | **Apply**                       |


Sign `clarify.md`, then for greenfield work review `proposal.md`, then `design.md`, then `tasks.md`
in that order before moving on. For engineering-only fixes, keep Clarify thin but still record the
audit and **No PRD change** decision in `clarify.md`. In every case, the agent drafts the files and
you approve them.

### OPSX skills (Cursor)

Agent **execution** lives in [`.cursor/skills/`](../.cursor/skills/) (validated by `pnpm run specs:check-opsx-skills`). **Policy** stays in `/specs` — skills link here; they do not duplicate checklists.

| Phase | Skill | Mode |
| --- | --- | --- |
| Choose mode | [`opsx-mode`](../.cursor/skills/opsx-mode/SKILL.md) | Both |
| Clarify | [`opsx-clarify`](../.cursor/skills/opsx-clarify/SKILL.md) | Full SDD |
| Propose | [`opsx-propose`](../.cursor/skills/opsx-propose/SKILL.md) | Full SDD |
| Red phase | [`opsx-red`](../.cursor/skills/opsx-red/SKILL.md) | Full SDD |
| Apply | [`opsx-apply`](../.cursor/skills/opsx-apply/SKILL.md) | Full SDD |
| Verify | [`opsx-verify`](../.cursor/skills/opsx-verify/SKILL.md) | Full SDD |
| Archive | [`opsx-archive`](../.cursor/skills/opsx-archive/SKILL.md) | Full SDD |
| Plan + Archive sync | [`lightweight-plan-archive`](../.cursor/skills/lightweight-plan-archive/SKILL.md) | Lightweight |

**Implementation craft** (after plan or delta approval — not during Clarify/Propose):

| When | Skill | Mode |
| --- | --- | --- |
| UI / routes / components in `src/` | [`frontend-skill`](../.cursor/skills/frontend-skill/SKILL.md) | Both |
| Server functions / Prisma / auth in `src/` | [`backend-skill`](../.cursor/skills/backend-skill/SKILL.md) | Both |

Also load [`AGENTS.md`](../AGENTS.md) for critical-area guardrails and code anchors.

Manifest: [`.cursor/skills/opsx/_manifest.yaml`](../.cursor/skills/opsx/_manifest.yaml) (OPSX process skills only).

### OPSX phases (reference)

These phases map to §4 above. Run them via the skills table or this guide. **Clarify** is mandatory for
non-trivial feature requests; **Propose** starts only after `clarify.md` is signed (**Lock it**).

1. **Clarify** — [`opsx-clarify`](../.cursor/skills/opsx-clarify/SKILL.md); principles in [CLARIFY_AND_PROPOSE](./changes/CLARIFY_AND_PROPOSE.md).
2. **Propose** — [`opsx-propose`](../.cursor/skills/opsx-propose/SKILL.md); upstream review per [REVIEW_GUIDE §1](./review/REVIEW_GUIDE.md#part-1--upstream-review-strict).
3. **Red** — [`opsx-red`](../.cursor/skills/opsx-red/SKILL.md); then **Apply** — [`opsx-apply`](../.cursor/skills/opsx-apply/SKILL.md); tiered code review per [REVIEW_GUIDE §3](./review/REVIEW_GUIDE.md#part-3--code-review-tiered-by-cost-of-failure).
4. **Verify** — [`opsx-verify`](../.cursor/skills/opsx-verify/SKILL.md); [REVIEW_GUIDE §1.5](./review/REVIEW_GUIDE.md#15-verify-post-review-full-sdd).
5. **Archive** — [`opsx-archive`](../.cursor/skills/opsx-archive/SKILL.md); dated folder under `changes/archive/`.

**No-code rule:** Do not generate implementation code until upstream review approves the committed
delta files (`proposal.md`, `design.md`, `tasks.md`). Signed `clarify.md` must exist before Propose.
An IDE Plan Mode draft alone is not enough.

**Git policy:** [architecture §6](./ai-native-development-architecture.md#git-policy-tiered).

### Spec backfill (existing code)

Use when canonical PRDs/SDDs are missing or stale but the behavior already ships in code — not for
greenfield features (use OPSX above).

```
Code audit (topic index.md)
    → SDDs in /specs/engineering/features/
    → PRD distill in /specs/prds/
    → upstream review (REVIEW_GUIDE §1.2)
```

1. **Audit.** Read code; record flow matrix, open questions, and test gaps in a topic
   `features/<domain>/index.md` (non-binding — [spec-authoring §5.1](./engineering/spec-authoring.md#topic-indexes);
   copy [`features/_TEMPLATE/index.md`](./engineering/features/_TEMPLATE/index.md)).
2. **SDDs first.** Write engineering specs from code; use [`features/_TEMPLATE/`](./engineering/features/_TEMPLATE/) and
   [featured examples](./engineering/feature.md) for structure.
3. **PRD distill.** Extract product outcomes and thin binding incident-risk rules (two-filter);
   link SDDs via Traceability tables only. Split Business rules into Product vs Binding headings.
   Add dictionary terms for any new reused domain phrases ([spec-authoring §8.2](./engineering/spec-authoring.md#82-when-to-add-or-change-a-term)).
   Run `pnpm run specs:check-prd-prose` (or `pnpm run specs:check` for the full suite) and self-check
   PRD layering ([spec-authoring §3.1.1](./engineering/spec-authoring.md#prd-layering)).
4. **Review.** Same upstream bar as OPSX Archive — no `pilot` / `[CODE-VERIFIED]` in binding prose.

Do **not** use `/specs/changes/` for backfill unless you are simultaneously changing behavior.

---

## 5. Testing (summary)

Follow the **Testing Trophy** ([REVIEW_GUIDE §2](./review/REVIEW_GUIDE.md#part-2--testing-trophy-full-sdd)).
How to write them: [TESTING_GUIDE.md](./review/TESTING_GUIDE.md) (E2E Mocked vs Live §8;
CI budgets; §15 Deferred for MSW/etc.).


| Mode        | Tests                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Lightweight | Appropriate to change; integration at API/DB seams when non-trivial                                 |
| Full SDD    | Red-phase TDD; negative test per `MUST NOT`; Trophy per REVIEW_GUIDE §2; playbook per TESTING_GUIDE |


---

## 6. Git policy


| Mode                      | Agent may commit?                                      | Agent may switch branches? |
| ------------------------- | ------------------------------------------------------ | -------------------------- |
| Full SDD / critical areas | **No** — human commits after review                    | **No** — unless instructed |
| Lightweight               | **Yes** — after explicit session approval              | **No** — unless instructed |
| Always                    | Never force-push, rebase, or amend without instruction |                            |


---

## 7. Repo layout

```
/specs
  ├── /product                   # Briefs, inventory (not PRDs)
  ├── /prds                      # Binding PRDs
  ├── /engineering               # Tech specs, decisions (`D-*`), external-deps (`E-*`), deployment
  │   ├── /features
  │   ├── /decisions
  │   ├── /external-deps
  │   └── /deployment
  ├── /changes                   # OPSX: active deltas; archive/; _TEMPLATE/; CLARIFY_AND_PROPOSE.md
  ├── /review                    # REVIEW_GUIDE.md, TESTING_GUIDE.md
  └── /organization              # Accountability
DEVELOPER_GUIDE.md               # This file
AGENTS.md                        # Agent constitution
```

---

## 8. Escalation

- **Compliance contradiction:** Halt work and escalate using [organization.md](./organization/organization.md).
- **Lightweight work that needs major rework:** Use full SDD the next time you touch that area.
- **Non-obvious security decision:** Add a `D-*` decision in `/specs/engineering/decisions/`.

