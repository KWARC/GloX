---
name: opsx-red
description: >-
  OPSX Red phase — draft failing tests from approved deltas before implementation.
  Use after upstream-approved proposal/design/tasks; confirm tests fail for the right reason.
---

# OPSX — Red phase

**Policy:** [REVIEW_GUIDE §2](../../../specs/review/REVIEW_GUIDE.md#part-2--testing-trophy-full-sdd), [TESTING_GUIDE](../../../specs/review/TESTING_GUIDE.md), [DEVELOPER_GUIDE §4](../../../specs/DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas).

## Prerequisites

- Upstream-approved `proposal.md`, `design.md`, `tasks.md`.
- Red-phase tasks listed in `tasks.md`.

## Steps (agent)

1. Read `design.md` test mapping and every `MUST NOT` in proposal/design deltas.
2. Draft integration tests (Testing Trophy bulk) per TESTING_GUIDE; one negative test per `MUST NOT`.
   API-route tests: follow [backend-skill](../backend-skill/SKILL.md) (auth from token, status codes).
3. Run tests — they **must fail** before any implementation (Red phase).
4. Report failure output; confirm failures are missing implementation, not syntax errors.
5. Human audits assertions ([REVIEW_GUIDE §2.2](../../../specs/review/REVIEW_GUIDE.md#22-validating-ai-written-tests) delete-the-implementation heuristic).

## Human gate

Assertion audit; confirm Red phase before Apply.

## Done when

Mapped tests exist, fail for the right reason, and human approves assertions.

## Do not

- Write production implementation during Red phase.
- Mock the system under test.
- Skip negative tests for `MUST NOT` rules.
