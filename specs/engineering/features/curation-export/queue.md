---
id: curation-queue
featured: true
upstream:
  - curation-export
compliance: []
code:
  - src/routes/curation.tsx
  - src/components/CurationSection.tsx
  - src/serverFns/floDownBlockStatus.server.ts
  - src/serverFns/latex.server.ts
  - src/hooks/stex-curation/useStexCurationActions.ts
---

# SDD: Curation queue & status

## Domain context

Owns the Curator/Admin curation review queue (file identities filtered by FloDown block status) and
bulk status transitions including discard.

Out of scope:

- sTeX generation and provenance — [`stex-export.md`](./stex-export.md)
- LaTeX draft/final persistence — [`latex-versioning.md`](./latex-versioning.md)
- FloDown statement editing — `flodown-blocks/lifecycle.md`

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/routes/curation.tsx` | Restricts the curation UI to Curator and Admin roles at the route loader. |
| `src/components/CurationSection.tsx` | Lists file identities for the selected FloDown block status and opens the curation workspace. |
| `src/serverFns/latex.server.ts` `getFileIdentities` | Returns distinct document export identities that have FloDown blocks in the requested status. |
| `src/serverFns/floDownBlockStatus.server.ts` | Updates FloDown block status for all blocks matching a file identity. |
| `useStexCurationActions` | Orchestrates status changes and discard confirmations from the curation UI. |

## Data contracts

| Enum | Values |
| --- | --- |
| `FloDownBlockStatus` | `EXTRACTED`, `FINALIZED_IN_FILE`, `SUBMITTED_TO_MATHHUB`, `DISCARDED` |

Typical curator transitions: `EXTRACTED` → `FINALIZED_IN_FILE` → `SUBMITTED_TO_MATHHUB`, or
`DISCARDED` with reason.

## Business rules

**S-CUR-01 (State-Driven):** WHILE the caller is Curator or Admin, the `/curation` route MUST allow
access to the review queue filtered by FloDown block status.

**Upstream:** R-CUR-01

**S-CUR-02 (Event-Driven):** WHEN `updateFloDownBlocksStatusByIdentity` advances blocks to
`FINALIZED_IN_FILE` (or another allowed status), the system MUST persist the new status on all
matching FloDown blocks for that file identity.

**Upstream:** R-CUR-02

**S-CUR-07 (Ubiquitous):** Extractor-role users MUST NOT access the curation queue or change FloDown
block status via the curation workflow. The route loader enforces this; dedicated status serverFns
SHOULD also reject Extractors — see BUG-004.

**Upstream:** R-CUR-07

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-CUR-01 | R-CUR-01 | Gap |
| S-CUR-02 | R-CUR-02 | Gap |
| S-CUR-07 | R-CUR-07 | Gap |

## Implementation bugs

| ID | File(s) | Description |
| --- | --- | --- |
| BUG-004 | `floDownBlockStatus.server.ts`, `latex.server.ts` (identity/list/save) | Curation/status/LaTeX serverFns lack Curator/Admin (and often any auth) checks; rely on route gating. |

## Related docs

- [`curation-export.md`](../../../prds/domains/curation-export.md)
- [`stex-export.md`](./stex-export.md)
- [`latex-versioning.md`](./latex-versioning.md)
- [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
