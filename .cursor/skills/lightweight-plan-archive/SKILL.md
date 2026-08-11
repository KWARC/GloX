---
name: lightweight-plan-archive
description: >-
  Lightweight path — Plan Mode with mandatory Archive spec sync or No spec change.
  Use for default non-critical work after opsx-mode selects lightweight.
---

# Lightweight — Plan Mode + Archive (spec sync)

**Policy:** [DEVELOPER_GUIDE §3](../../../specs/DEVELOPER_GUIDE.md#3-lightweight-path-default), [REVIEW_GUIDE §1.3](../../../specs/review/REVIEW_GUIDE.md#13-plan-mode-review-lightweight-only).

## Prerequisites

- Lightweight mode chosen ([opsx-mode](../opsx-mode/SKILL.md)).
- Not a critical-area change requiring full SDD.

## Steps (agent)

### Before code

1. State a one-paragraph goal (optional skim: product brief, glossary).
2. Produce a Plan Mode plan that includes:
   - Files and boundaries to touch.
   - Test approach.
   - **Archive (spec sync):** which canonical specs will update, or explicit **No spec change**.
3. **No code until human approves the plan.**

### After plan approval — before code

When touching application code (`src/`):

1. Load [`AGENTS.md`](../../../AGENTS.md).
2. Read [frontend-skill](../frontend-skill/SKILL.md) and/or [backend-skill](../backend-skill/SKILL.md) for the
   layers in the approved plan (UI vs server functions / Prisma).

### After code + review

4. Execute Archive (spec sync) from the approved plan:
   - Update PRDs, SDDs, operations docs, or product inventory in the same PR, **or**
   - Record **No spec change** in the plan/PR description.
5. Lightweight does **not** use `/specs/changes/` deltas or dated `archive/` folders.

## Human gate

Plan approval before code. PR records Archive outcome.

## Done when

Code merged with spec sync done or **No spec change** recorded.

## Do not

- Use OPSX delta quartet in lightweight mode.
- Skip Archive step in the plan.
- Commit without explicit session approval (lightweight git policy per AGENTS.md).
