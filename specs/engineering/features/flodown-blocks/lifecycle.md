---
id: flodown-block-lifecycle
featured: false
upstream:
  - flodown-blocks
compliance: []
code:
  - src/serverFns/extractFloDownBlock.server.ts
  - src/serverFns/updateFloDownBlock.server.ts
  - src/serverFns/deleteFloDownBlock.server.ts
  - src/server/floDownBlockDeletion.ts
  - src/serverFns/floDownBlockStatus.server.ts
  - src/serverFns/floDownBlockAggregate.server.ts
---

# SDD: FloDown block lifecycle

## Domain context

Owns creation, versioning, cascade deletion of symrefs, status management, and export identity for
FloDown blocks — the curated FTML content unit.

Out of scope (sibling specs):

- Symbol registry and propagation — `symbols-semantics` PRD (no SDD yet)
- sTeX export pipeline — `curation-export` PRD (no SDD yet)

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/extractFloDownBlock.server.ts` | Creates a FloDown block from selected text with initial statement and version 1. |
| `src/serverFns/updateFloDownBlock.server.ts` | Updates statement text, increments version, appends `FloDownBlockVersion` row. |
| `src/serverFns/deleteFloDownBlock.server.ts` | Deletes block; invokes symref cleanup across sibling blocks. |
| `src/server/floDownBlockDeletion.ts` | Computes declared symbol URIs and removes matching symrefs from other statements transactionally. |
| `src/serverFns/floDownBlockStatus.server.ts` | Updates FloDown block status; bulk status by export identity. |
| `src/serverFns/floDownBlockAggregate.server.ts` | Combines statements for LaTeX/sTeX export. |
| `prisma/schema.prisma` `FloDownBlock` | Authoritative storage for statement JSON, declaredSymbols, status, export identity. |

## Data contracts

| Enum | Values |
| --- | --- |
| `FloDownBlockStatus` | `DISCARDED`, `EXTRACTED`, `FINALIZED_IN_FILE`, `SUBMITTED_TO_MATHHUB` |

| Field | Type | Notes |
| --- | --- | --- |
| `statement` | JSON (FTML) | `definition` or `paragraph` per `statement.type` |
| `declaredSymbols` | `string[]` | Symbol names introduced via symdecl definienda |
| `currentVersion` | int | Incremented on each edit |
| Export identity | `futureRepo`, `filePath`, `fileName`, `language` | Defaults: `smglom/Glox`, `mod`, `Glox`, `en` |

## Business rules

### Creation & versioning

**S-FDB-01 (Event-Driven):** WHEN `createFloDownBlock` succeeds, the system MUST persist
`originalText`, `statement`, `declaredSymbols` (if any), and a `FloDownBlockVersion` at version 1.

**Upstream:** R-FDB-01

**S-FDB-02 (Event-Driven):** WHEN `updateFloDownBlock` succeeds, the system MUST increment
`currentVersion` and MUST insert a version history row with the editor's user ID.

**Upstream:** R-FDB-02

### Deletion & symref cascade

**S-FDB-03 (Event-Driven):** WHEN a FloDown block is deleted, the system MUST remove symrefs pointing
to its declared symbol URIs from all remaining blocks' statements before or within the same
transaction as the delete.

**Upstream:** R-FDB-03

### Status & export identity

**S-FDB-04 (State-Driven):** WHILE status is `DISCARDED`, curation list queries SHOULD filter
discarded blocks unless explicitly including them.

**Upstream:** R-FDB-04

**S-FDB-05 (Event-Driven):** WHEN moving blocks to a target export identity, IF existing blocks at
that identity have a different status, the system MUST abort and return a conflict error.

**Upstream:** R-FDB-05

**S-FDB-06 (Ubiquitous):** Every FloDown block MUST store all four export identity fields.

**Upstream:** R-FDB-06

### Access control

**S-FDB-07 (Ubiquitous):** All FloDown block mutations MUST require an authenticated session.

**Upstream:** R-FDB-07

**S-FDB-08 (Ubiquitous):** FloDown block mutations tied to a Document MUST verify the caller owns
that Document or holds Admin role before proceeding.

**Upstream:** R-FDB-08 — **not fully implemented** (see BUG-001 in auth SDD).

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-FDB-01 | R-FDB-01 | Gap |
| S-FDB-02 | R-FDB-02 | Gap |
| S-FDB-03 | R-FDB-03 | Gap |
| S-FDB-04 | R-FDB-04 | Gap |
| S-FDB-05 | R-FDB-05 | Gap |
| S-FDB-06 | R-FDB-06 | Gap |
| S-FDB-07 | R-FDB-07 | Gap |
| S-FDB-08 | R-FDB-08 | Gap |

## Open documentation gaps

- Module-description-scoped block ownership rules — `moduleDescription.server.ts` uses separate
  auth helper; not yet traced to SDD rules.
- `updateFloDownBlockAst` semantic edit path — same ownership gap as BUG-001.

## Related docs

- [`flodown-blocks.md`](../../../prds/domains/flodown-blocks.md)
- [`../auth/auth-sessions.md`](../auth/auth-sessions.md)
