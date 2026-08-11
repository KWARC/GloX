---
name: opsx-propose
description: >-
  OPSX Propose — draft proposal.md, design.md, tasks.md from signed clarify.md
  only. Use after Lock it; stop for upstream review before implementation.
---

# OPSX — Propose

**Policy:** [CLARIFY_AND_PROPOSE § Phase B](../../../specs/changes/CLARIFY_AND_PROPOSE.md#phase-b--propose-write-deltas-from-signed-clarifymd), [REVIEW_GUIDE §1.2](../../../specs/review/REVIEW_GUIDE.md#12-upstream-review-checklist).

## Prerequisites

- `clarify.md` signed (**Lock it**).
- Full SDD mode.

## Steps (agent)

1. Confirm **Lock it** is present on `clarify.md`. If not, stop and return to [opsx-clarify](../opsx-clarify/SKILL.md).
2. Copy remaining [`specs/changes/_TEMPLATE/`](../../../specs/changes/_TEMPLATE/) files into `/specs/changes/` if needed.
3. Draft in order — **translate clarify.md only; no new decisions:**
   - `proposal.md` — Intent, Non-goals, Iteration plan, Upstream audit, Resolved questions, PRD delta or **No PRD change**.
   - `design.md` — SDD policy and boundaries only; trace every PRD rule; plan tests ([spec-authoring §7](../../../specs/engineering/spec-authoring.md#what-belongs-in-prd-sdd-and-code)).
   - `tasks.md` — Red phase first; atomic steps citing proposal/design; **no new requirements**.
4. **Do not start implementation.**
5. Ask human to review each file per REVIEW_GUIDE §1.2 before the next (proposal → design → tasks).

### Agent prompt (after Lock it)

```markdown
clarify.md is signed off (Lock it). Copy /specs/changes/_TEMPLATE/ into /specs/changes/ if needed.

Draft in order — translate clarify.md only; no new decisions:
1. proposal.md — Intent, Non-goals, Iteration plan, Upstream audit, Resolved questions, PRD delta from clarify.md.
2. design.md — SDD policy and boundaries only; trace every PRD rule; plan tests.
3. tasks.md — Red phase first; no new requirements.

Do not start implementation. Stop after the trio for human upstream review per REVIEW_GUIDE §1.2.
```

## Human gate

Upstream review per file ([REVIEW_GUIDE §1.2](../../../specs/review/REVIEW_GUIDE.md#12-upstream-review-checklist)) — teach-back on each EARS rule before Apply.

## Done when

`proposal.md`, `design.md`, and `tasks.md` are approved upstream. Blocks Apply until then.

## Do not

- Add decisions not in signed `clarify.md`.
- Start implementation before upstream sign-off.
- Paste full REVIEW_GUIDE checklists here — execute every checkbox and report pass/fail.
