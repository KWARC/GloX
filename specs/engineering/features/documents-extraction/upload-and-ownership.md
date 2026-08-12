---
id: document-upload-ownership
featured: true
upstream:
  - documents-extraction
compliance: []
code:
  - src/serverFns/upload.server.ts
  - src/serverFns/myDocuments.server.ts
  - src/serverFns/deleteDocument.server.ts
  - src/server/document/document.service.ts
  - src/serverFns/documentLocation.server.ts
---

# SDD: Document upload & ownership

## Domain context

Implements Document upload (PDF text extraction), per-user deduplication, listing with Admin override,
deletion, and export identity capture.

Out of scope:

- FloDown blocks within documents — `flodown-blocks/lifecycle.md`
- LLM suggestion caching — [`llm-suggestion-cache.md`](./llm-suggestion-cache.md)

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/upload.server.ts` | Authenticated PDF upload; delegates to document service. |
| `src/server/document/document.service.ts` | Hash dedup, page text extraction, filesystem storage under `uploads/`, status transitions. |
| `src/serverFns/myDocuments.server.ts` | Lists documents for current user; Admin sees all. |
| `src/serverFns/deleteDocument.server.ts` | Owner-or-Admin delete with cascade. |
| `src/serverFns/documentLocation.server.ts` | Preview and execute export identity moves with ownership check. |
| `src/pdfToImage/` | PDF page rendering for UI highlights. |

## Data contracts

| Enum | Values |
| --- | --- |
| `DocumentStatus` | `UPLOADED`, `TEXT_EXTRACTED`, `FAILED` |
| `IndexStatus` (optional on Document) | `EXTRACTED`, `FINALIZED`, `SUBMITTED_TO_MATHHUB` — `null` until first mark reference |

| Constraint | Rule |
| --- | --- |
| Unique per user | `@@unique([fileHash, userId])` on Document |
| Export identity on Document | `futureRepo`, `filePath`, `language` — no `fileName` (per-block on FloDown blocks) |

`DocumentPage` rows anchor FloDown blocks and mark references. `indexStatus` on a Document tracks the
mark-reference export workflow and is set to `EXTRACTED` when the first mark reference is created.

## Business rules

**S-DOC-01 (Event-Driven):** WHEN upload completes successfully, the Document MUST have status
`TEXT_EXTRACTED` and one `DocumentPage` row per extracted page.

**Upstream:** R-DOC-01

**S-DOC-02 (Event-Driven):** WHEN upload receives a file hash matching an existing Document for the
same user, the handler MUST return the existing document ID without creating a new row.

**Upstream:** R-DOC-02

**S-DOC-03 (Event-Driven):** WHEN `getMyDocuments` runs for a non-Admin user, the query MUST filter
`userId` to the caller; Admin MUST omit the filter.

**Upstream:** R-DOC-03

**S-DOC-04 (Event-Driven):** WHEN delete is authorized, the system MUST remove the Document row
(cascading pages, blocks, mark references) and SHOULD remove filesystem artifacts.

**Upstream:** R-DOC-04

**S-DOC-05 (Ubiquitous):** Upload MUST persist `futureRepo`, `filePath`, and `language` on the
Document (defaults from schema: `smglom/softeng`, `mod`, `en`).

**Upstream:** R-DOC-05

**S-DOC-07 (Ubiquitous):** Upload, list, and delete handlers MUST call `requireUserId` or equivalent
session check.

**Upstream:** R-DOC-07

**S-DOC-08 (Ubiquitous):** Delete MUST allow only the Document owner or Admin.

**Upstream:** R-DOC-08

**S-DOC-09 (Event-Driven):** WHEN `moveDocumentLocation` succeeds, the system MUST update
`futureRepo`, `filePath`, and `language` on the Document, its FloDown blocks, `LatexTable` rows, and
declaring `Symbol` rows in one transaction, and MUST leave FloDown block `statement` JSON unchanged
(local inline `uri` values remain the `symbolName` string).

**Upstream:** R-DOC-09, R-DOC-10

**Implementation:** `src/serverFns/documentLocation.server.ts`. FloDown block slice: `lifecycle.md`
S-FDB-06a.

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-DOC-01 | R-DOC-01 | Gap |
| S-DOC-02 | R-DOC-02 | Gap |
| S-DOC-03 | R-DOC-03 | Gap |
| S-DOC-04 | R-DOC-04 | Gap |
| S-DOC-05 | R-DOC-05 | Gap |
| S-DOC-07 | R-DOC-07 | Gap |
| S-DOC-08 | R-DOC-08 | Gap |
| S-DOC-09 | R-DOC-09, R-DOC-10 | Gap |

## Related docs

- [`documents-extraction.md`](../../../prds/domains/documents-extraction.md)
- [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
