---
id: latex-versioning
featured: true
upstream:
  - curation-export
compliance: []
code:
  - src/serverFns/latex.server.ts
  - src/routes/create-latex.tsx
  - prisma/schema.prisma
---

# SDD: LaTeX draft & final versioning

## Domain context

Owns persisting draft and final LaTeX for a Document keyed by export identity, with history entries.

Out of scope:

- FloDown → sTeX generation — [`stex-export.md`](./stex-export.md)
- Module description TeX preview — `module-descriptions/export.md`

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/latex.server.ts` | Saves draft history, final LaTeX, and reads history for a Document export identity. |
| `prisma/schema.prisma` `LatexTable` | Stores `finalLatex`, `history` JSON, `isFinal`, and export identity columns. |
| `src/routes/create-latex.tsx` | UI for composing and saving LaTeX for a Document or module workaround. |

## Data contracts

| Field | Notes |
| --- | --- |
| Key | `(documentId, futureRepo, filePath, fileName, language)` |
| `history` | JSON array of `{ latex, savedAt }` |
| `finalLatex` / `isFinal` | Final save marker |

## Business rules

**S-CUR-03 (Event-Driven):** WHEN `saveLatexDraft` or `saveLatexFinal` succeeds, the system MUST store
draft history or final LaTeX on the `LatexTable` row for that Document export identity.

**Upstream:** R-CUR-03

Auth for these handlers is incomplete — see BUG-004 in [`queue.md`](./queue.md).

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-CUR-03 | R-CUR-03 | Gap |

## Related docs

- [`curation-export.md`](../../../prds/domains/curation-export.md)
- [`queue.md`](./queue.md)
- [`stex-export.md`](./stex-export.md)
