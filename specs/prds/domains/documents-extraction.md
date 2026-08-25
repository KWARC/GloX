---
id: documents-extraction
featured: true
upstream:
  - glox
compliance: []
code:
  - specs/engineering/features/documents-extraction/upload-and-ownership.md
  - specs/engineering/features/documents-extraction/llm-suggestion-cache.md
---

# PRD: Documents & extraction

Users upload PDF course materials as Documents. GloX extracts page text and images, associates export
identity metadata, and supports LLM-assisted definition discovery. This PRD covers upload, listing,
deletion, and ownership of Documents.

## Business rules

### Product outcomes

**R-DOC-01 (Event-Driven):** WHEN an authenticated user uploads a PDF, the system MUST create a
Document with extracted page text and preview images, or record a failed extraction status.

**R-DOC-02 (Event-Driven):** WHEN an authenticated user uploads a PDF whose content hash already
exists for that user, the system MUST return the existing Document rather than creating a duplicate.

**R-DOC-03 (Event-Driven):** WHEN a user requests their Document list, the system MUST return only
Documents they own, except when the user is Admin — then the system MUST return all Documents.

**R-DOC-04 (Event-Driven):** WHEN a Document owner or Admin deletes a Document, the system MUST remove
the Document and its associated pages, FloDown blocks, and uploaded files.

**R-DOC-05 (Ubiquitous):** At upload time the system MUST capture export identity (future repository,
file path, language) for MathHub export.

**R-DOC-06 (Event-Driven):** WHEN an authenticated user requests LLM definition suggestions for their
Document, the system MUST return cached suggestions when the document full-text hash is unchanged.

**R-DOC-07 (Event-Driven):** WHEN a Document owner or Admin moves a Document's export identity, the
system MUST update the Document and all dependent curated content (FloDown blocks, symbols, and
export artifacts) in one transaction.

**R-DOC-08 (Event-Driven):** WHEN a Document export identity move succeeds, the system MUST replace
previous local symbol URIs for declarations on that Document with the new FloDown URIs, and MUST
NOT change other symbol URIs.

### Binding operator / compliance promises

**R-DOC-09 (Ubiquitous):** The system MUST NOT allow unauthenticated users to upload, list, or delete
Documents.

**Rationale:** Uploaded PDFs may contain unpublished course materials — unauthorized upload or read is
a data exposure incident.

**R-DOC-10 (Ubiquitous):** The system MUST NOT allow a non-owner non-Admin user to delete another
user's Document.

**Rationale:** Unauthorized deletion causes irreversible data loss of curated glossary work.

## Out of scope

- FloDown block CRUD within a Document — see `flodown-blocks.md`
- Module description workflow — see `module-descriptions.md`
- LaTeX export — see `curation-export.md`

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-DOC-01 | `upload-and-ownership.md` S-DOC-01 |
| R-DOC-02 | `upload-and-ownership.md` S-DOC-02 |
| R-DOC-03 | `upload-and-ownership.md` S-DOC-03 |
| R-DOC-04 | `upload-and-ownership.md` S-DOC-04 |
| R-DOC-05 | `upload-and-ownership.md` S-DOC-05 |
| R-DOC-06 | `llm-suggestion-cache.md` S-DOC-06 |
| R-DOC-07 | `upload-and-ownership.md` S-DOC-07 |
| R-DOC-08 | `upload-and-ownership.md` S-DOC-08 |
| R-DOC-09 | `upload-and-ownership.md` S-DOC-09 |
| R-DOC-10 | `upload-and-ownership.md` S-DOC-10 |

## Related docs

- [`upload-and-ownership.md`](../../engineering/features/documents-extraction/upload-and-ownership.md)
- [`llm-suggestion-cache.md`](../../engineering/features/documents-extraction/llm-suggestion-cache.md)
- [`flodown-blocks.md`](./flodown-blocks.md)
