---
name: opsx-archive
description: >-
  OPSX Archive — fold deltas into canonical specs and move change set to dated
  archive folder. Use after Verify sign-off; human commits in full SDD.
---

# OPSX — Archive

**Policy:** [changes/README Archive mapping](../../../specs/changes/README.md#archive-mapping), [DEVELOPER_GUIDE §4](../../../specs/DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas).

## Prerequisites

- Verify complete with human cursory sign-off ([opsx-verify](../opsx-verify/SKILL.md)).
- Verify sign-off recorded.

## Steps (agent)

1. Confirm Verify sign-off exists — **Blocks Archive** without it.
2. Fold deltas into canonical specs per [changes/README Archive mapping](../../../specs/changes/README.md#archive-mapping):
   - `proposal.md` → `## PRD delta` into `/specs/prds/...` (skip if **No PRD change**).
   - `design.md` → `## SDD delta` into `/specs/engineering/features/...`.
   - Fold clarify rationale into PRD/SDD notes as needed.
3. Move active set (`clarify.md`, `proposal.md`, `design.md`, `tasks.md`) to
   `/specs/changes/archive/YYYY-MM-DD-<feature-slug>/`.
4. Update [`/specs/product/`](../../../specs/product/) feature inventory if user-visible behavior changed.
5. Prepare diff; **human commits** in full SDD.

## Human gate

Human commit and merge. Agent does not commit in full SDD unless instructed.

## Done when

Canonical specs updated, dated archive folder contains the four files, active `/specs/changes/` root has no stale delta set.

## Do not

- Archive before Verify sign-off.
- Leave stale active files under `/specs/changes/` (except `_TEMPLATE/` and `archive/`).
- Edit canonical PRDs/SDDs during Apply — only at Archive after Verify.
