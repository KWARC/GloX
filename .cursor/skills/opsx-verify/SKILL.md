---
name: opsx-verify
description: >-
  OPSX Verify — post-review artifact ↔ implementation check before Archive.
  Agent runs REVIEW_GUIDE §1.5 checklist; human gives cursory sign-off.
---

# OPSX — Verify

**Policy:** [REVIEW_GUIDE §1.5](../../../specs/review/REVIEW_GUIDE.md#15-verify-post-review-full-sdd), [changes/README](../../../specs/changes/README.md#apply--verify--archive).

## Prerequisites

- Apply complete; mapped tests run.
- Human tiered code review + fixes complete.
- PR ready for review.

## Steps (agent)

1. Open [REVIEW_GUIDE §1.5](../../../specs/review/REVIEW_GUIDE.md#15-verify-post-review-full-sdd) agent checklist.
2. Execute **every** checkbox; report pass, fail, or explicit human-owned waiver:
   - Every `tasks.md` item done or deferred with owner.
   - Mapped tests green; every `MUST NOT` has passing negative test or waiver.
   - `design.md` decisions reflected in shipped code.
   - `proposal.md` PRD delta (or **No PRD change**) matches what shipped.
   - Teach-back: summarize each shipped rule without relying only on git diff.
3. On mismatch: **inform the human** — human chooses fix **code** vs update **deltas**; re-run Verify.
4. Record Verify block in PR description or `tasks.md` footer per §1.5.
5. Request **cursory** human sign-off (not a second full upstream review).

Optional residual tasks: if gaps remain, list them for human decision (Spec Kit converge-style) — do not auto-append to `tasks.md` without human approval.

## Human gate

**Cursory** human sign-off on Verify report. **Blocks Archive** until recorded.

## Done when

Verify report complete and human cursory sign-off recorded.

## Do not

- Archive before Verify sign-off.
- Treat green CI alone as Verify pass.
- Invent new requirements during Verify.
