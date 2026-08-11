---
id: <domain>-index
canonical_for: []
see_also:
  - /specs/prds/domains/<domain-prd>.md
---

# <Domain> — engineering index

> **Non-binding.** Navigation and backfill working notes only — not a PRD or SDD. Binding rules live in
> [`<domain-prd>.md`](../../../prds/domains/<domain-prd>.md) and sibling SDDs. Authoring rules:
> [spec-authoring §5.1](../../spec-authoring.md#topic-indexes).

One sentence: what this topic folder covers and where code lives.

## SDD map

| SDD | Status | Scope |
| --- | --- | --- |
| [`<sdd-file>.md`](./<sdd-file>.md) | Featured / Draft / Pending | Short scope note |

Domain PRD: [`<domain-prd>.md`](../../../prds/domains/<domain-prd>.md).

**Code anchors:** `apps/next-js-app/...`, `libs/...` (optional).

## Flow matrix (optional — spec backfill only)

Use when multiple user paths span several SDDs. Remove or shrink once flows are covered by PRD/SDD rules.

| ID | Path | Primary SDD |
| --- | --- | --- |
| F-1 | <user-visible path> | `<sdd-file>` |

## Open questions (non-binding — delete when promoted)

| Item | Accountable | Notes |
| --- | --- | --- |
| <question or audit finding> | Engineering / CEO / legal | <context> |

## Test inventory (non-binding)

Roll up gaps here during backfill; canonical test mapping stays in each SDD.

| Area | Automated test | Gap |
| --- | --- | --- |
| <rule area> | None found | High / Medium / Low |

## Backfill progress (optional — delete when done)

| Step | Gate |
| --- | --- |
| Audit | `index.md` + flow matrix |
| SDDs | Core SDDs upstream-reviewed |
| PRD | Domain PRD traceability complete |
