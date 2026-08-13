---
name: opsx-apply
description: >-
  OPSX Apply — execute tasks.md after Red phase and upstream approval. Agent
  implements; human makes PR ready. Full SDD — human commits.
---

# OPSX — Apply

**Policy:** [DEVELOPER_GUIDE §4](../../../specs/DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas), [changes/README Apply](../../../specs/changes/README.md#apply--verify--archive).

## Prerequisites

- Upstream-approved deltas.
- Red-phase tests drafted and failing; human assertion audit done.
- No-code rule satisfied — deltas committed and reviewed.

## Implementation conventions (GloX)

Before editing application code:

1. Load [`AGENTS.md`](../../../AGENTS.md) (auth, document ownership, FloDown lifecycle, export).
2. Read the craft skill for what you touch:
   - UI / routes / components → [frontend-skill](../frontend-skill/SKILL.md)
   - Server functions / Prisma / auth / FTML → [backend-skill](../backend-skill/SKILL.md)

Craft skills apply at **implementation** only — they do not override signed deltas, PRDs, SDDs, or ADRs.

## Steps (agent)

1. Execute `tasks.md` in order — implementation steps only after Red phase tasks.
2. Make tests pass without weakening assertions.
3. Confirm mapped tests run (Apply-time check in `tasks.md`).
4. Produce diff only — **human commits** in full SDD ([architecture git policy](../../../specs/ai-native-development-architecture.md#git-policy-tiered)).
5. Hand off for human to make PR ready and tiered code review ([REVIEW_GUIDE §3](../../../specs/review/REVIEW_GUIDE.md#part-3--code-review-tiered-by-cost-of-failure)).

## Human gate

PR ready for review; tiered code review complete before Verify.

## Done when

Implementation matches `tasks.md`, tests green, PR ready for human review.

## Do not

- Commit in full SDD unless human explicitly instructs otherwise.
- Add requirements not in proposal/design.
- Skip Apply-time test confirmation.
