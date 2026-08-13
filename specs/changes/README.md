# `/specs/changes` — OPSX delta specs

Temporary work-in-flight. **Do not edit canonical specs directly** while building a critical-area feature.

In **full SDD**, this folder is the **plan of record** — it replaces Cursor Plan Mode as the durable
artifact that must be reviewed before implementation. See [DEVELOPER_GUIDE §4](../DEVELOPER_GUIDE.md#plan-mode-vs-opsx-deltas).

**Policy:** `clarify.md` records Clarify decisions (audit, options, human sign-off). `proposal.md`
records *what* (including an optional PRD delta). `design.md` records *how* (the SDD delta).
`tasks.md` records *do* — atomic Apply steps only, with no new requirements.

For the Clarify and Propose workflow, see [CLARIFY_AND_PROPOSE.md](./CLARIFY_AND_PROPOSE.md) (principles,
human gates, and a worked example). Agent execution: [`opsx-clarify`](../../.cursor/skills/opsx-clarify/SKILL.md), [`opsx-propose`](../../.cursor/skills/opsx-propose/SKILL.md).

## One set per branch

There is **only one active change** at a time — a flat set of files in this directory:

```
/specs/changes/
  ├── clarify.md      ← Clarify phase; signed before Propose
  ├── proposal.md
  ├── design.md
  ├── tasks.md
  ├── archive/        ← Completed changes (dated folders)
  └── _TEMPLATE/
```

**Separate feature requests use separate branches.** Do not create subfolders per feature for *active*
work; isolation comes from git branches. Completed sets live under [`archive/`](./archive/README.md).

## Start from template

At **Clarify**, copy [`_TEMPLATE/clarify.md`](./_TEMPLATE/clarify.md) into `/specs/changes/` and
maintain it until signed. At **Propose** (after **Lock it**), copy the rest of [`_TEMPLATE/`](./_TEMPLATE/)
into `/specs/changes/` and draft the delta trio from `clarify.md`. [`_TEMPLATE/`](./_TEMPLATE/) stays
pristine on `main`.

## File definitions

| File | Layer | Purpose | Required sections |
| --- | --- | --- | --- |
| `clarify.md` | *decide* | Decision record before deltas; human sign-off | FR input; Restatement; Upstream audit; Open questions; Options; v1 scope; Non-goals/v2; PRD change decision; Accepted tradeoffs; Human decisions |
| `proposal.md` | *what* | Intent, scope, v1/v2, optional **PRD delta** | Intent; Non-goals; Iteration plan; Upstream audit; PRD delta; Upstream links; Resolved questions |
| `design.md` | *how* | **SDD / tech-spec delta** for the current stack | SDD delta; Boundaries; ADR alignment; Operations; Test mapping |
| `tasks.md` | *do* | Atomic Apply checklist — **no new requirements** | Red phase (failing tests first); Implementation; Verify (Apply-time: tests run) |

The agent **maintains** `clarify.md` during Clarify and **generates** the delta trio at Propose from
signed `clarify.md`. Humans **verify** line-by-line per
[REVIEW_GUIDE §1](../review/REVIEW_GUIDE.md#part-1--upstream-review-strict) before Apply.

## Review gates

| File | Skill | Reviewer verifies | Blocks |
| --- | --- | --- | --- |
| `clarify.md` | [`opsx-clarify`](../../.cursor/skills/opsx-clarify/SKILL.md) | Human decisions complete; audit pass or HALT escalated; approach and v1 scope locked | **Propose** |
| `proposal.md` | [`opsx-propose`](../../.cursor/skills/opsx-propose/SKILL.md) | Matches signed `clarify.md`; teach-back on *what*; PRD delta or waiver | Greenfield work with incomplete PRD delta |
| `design.md` | [`opsx-propose`](../../.cursor/skills/opsx-propose/SKILL.md) | Teach-back on *how*; every PRD rule traced; tests planned | **Apply** |
| `tasks.md` | [`opsx-propose`](../../.cursor/skills/opsx-propose/SKILL.md) | Atomic, ordered, no scope creep; steps cite proposal/design | **Apply** |

For greenfield work, sign `clarify.md`, then review `proposal.md`, then `design.md`, then `tasks.md`
in that order. For engineering-only fixes, Clarify may be thin but `clarify.md` still records the audit
and **No PRD change** decision.

## Apply → Verify → Archive

| Phase | Skill | Who | Purpose | Blocks |
| --- | --- | --- | --- | --- |
| **Apply** | [`opsx-apply`](../../.cursor/skills/opsx-apply/SKILL.md) | Agent → human | Execute `tasks.md`; agent confirms tests run; human makes PR ready | Human code review |
| **Code review** | — | Human (+ agent fixes) | Tiered review per [REVIEW_GUIDE §3](../review/REVIEW_GUIDE.md) | **Verify** |
| **Verify** | [`opsx-verify`](../../.cursor/skills/opsx-verify/SKILL.md) | Agent checklist + cursory human sign-off | Artifacts ↔ implementation ([REVIEW_GUIDE §1.5](../review/REVIEW_GUIDE.md#15-verify-post-review-full-sdd)) | **Archive** |
| **Archive** | [`opsx-archive`](../../.cursor/skills/opsx-archive/SKILL.md) | Human commits | Fold deltas into canonical specs; move active set to `archive/` | Merge |

On Verify mismatch: agent informs the human; human chooses fix **code** vs update **deltas**; re-Verify.

## Archive mapping

At **Archive** (after Verify sign-off):

1. Fold deltas into canonical specs (table below).
2. Move `clarify.md`, `proposal.md`, `design.md`, and `tasks.md` from `/specs/changes/` into
   `/specs/changes/archive/YYYY-MM-DD-<feature-slug>/` (same commit or the Archive commit on the branch).
3. Update [`/specs/product/`](../product/) feature inventory if user-visible behavior changed.

`main` should not keep a stale *active* delta set. Dated folders under `archive/` are the audit trail.

| Delta section | Fold into canonical | After fold |
| --- | --- | --- |
| `clarify.md` → Accepted tradeoffs, Resolved-style decisions | Fold into PRD/SDD notes as needed | Kept in dated archive folder |
| `proposal.md` → `## PRD delta` | `/specs/prds/...` (skip section if **No PRD change**) | Kept in dated archive folder |
| `design.md` → `## SDD delta` | `/specs/engineering/features/...` | Kept in dated archive folder |
| `tasks.md` | Not folded into canonical specs | Kept in dated archive folder |

**Slug:** short kebab-case feature name (e.g. `partner-activation-gate`), not a Linear ID alone.

**Upstream review** is required before Apply — see [REVIEW_GUIDE §1](../review/REVIEW_GUIDE.md#part-1--upstream-review-strict).
**Verify** is required before Archive — see [REVIEW_GUIDE §1.5](../review/REVIEW_GUIDE.md#15-verify-post-review-full-sdd).
Full workflow: [DEVELOPER_GUIDE §4](../DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas).
