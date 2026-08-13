---
name: opsx-clarify
description: >-
  Run OPSX Clarify for full SDD — maintain clarify.md until Lock it. Use when
  starting critical-area work; do not draft proposal/design/tasks yet.
---

# OPSX — Clarify

**Policy:** [CLARIFY_AND_PROPOSE § Phase A](../../../specs/changes/CLARIFY_AND_PROPOSE.md#phase-a--clarify-clarifymd-no-delta-files), [DEVELOPER_GUIDE §4](../../../specs/DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas).

## Prerequisites

- Full SDD mode chosen ([opsx-mode](../opsx-mode/SKILL.md)).
- Feature request (FR) from human.

## Steps (agent)

1. Copy [`specs/changes/_TEMPLATE/clarify.md`](../../../specs/changes/_TEMPLATE/clarify.md) into `/specs/changes/clarify.md` if not present.
2. **Do NOT draft proposal.md, design.md, or tasks.md yet.**
3. In `clarify.md`:
   - Restate the ask; list material gaps only.
   - Fill upstream audit (specs, ADRs, compliance, blast radius). HALT on compliance contradiction per [organization.md](../../../specs/organization/organization.md).
   - Where tradeoffs exist, add options with product impact, effort, and risk; otherwise state one recommendation (P0 — no Clarify theater).
   - Split v1 / v2 only if scope warrants it; record non-goals and v2.
   - Flag creep when the FR implies more than agreed v1.
   - Ask only questions you cannot answer from `/specs`; track in Open questions.
   - Confirm PRD change vs **No PRD change**.
4. When `clarify.md` is complete, ask the human to review the **Human decisions** checklist and sign **Lock it**.

### Agent opener (use when human attaches this skill with an FR)

```markdown
I have a feature request for full SDD.

**FR:** <paste>

**Phase: Clarify** — maintain clarify.md in /specs/changes/. Do NOT draft proposal.md, design.md, or tasks.md yet.

1. Restate the ask in clarify.md; list material gaps only.
2. Fill upstream audit (specs, ADRs, compliance, blast radius).
3. Where tradeoffs exist, add options; otherwise state one recommendation.
4. Split v1 / v2 only if scope warrants it; record non-goals and v2 in clarify.md.
5. Flag creep when the FR implies more than agreed v1.
6. Ask only questions you cannot answer from /specs; track them in Open questions.

When clarify.md is signed off (Lock it), hand off to opsx-propose.
```

## Human gate

**Lock it** on `clarify.md` — Human decisions checklist complete ([CLARIFY_AND_PROPOSE Clarify checklist](../../../specs/changes/CLARIFY_AND_PROPOSE.md#clarify-checklist-human)).

## Done when

`clarify.md` is signed (**Lock it**). Only then may Propose begin.

## Do not

- Draft delta files before Lock it.
- Invent policy not locked in Clarify.
- Skip compliance HALT when contradictions appear.
