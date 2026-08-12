# Curation & export — engineering index

Non-binding orientation. Binding rules: PRD + SDDs below.

| Doc | Role |
| --- | --- |
| [`../../../prds/domains/curation-export.md`](../../../prds/domains/curation-export.md) | Binding PRD |
| [`queue.md`](./queue.md) | SDD — curation queue and status |
| [`latex-versioning.md`](./latex-versioning.md) | SDD — LatexTable draft/final |
| [`stex-export.md`](./stex-export.md) | SDD — URI rewrite, provenance, sTeX |

**Code anchors:** `src/routes/curation.tsx`, `src/serverFns/latex.server.ts`,
`src/server/ftml/generateStexFromFtml.ts`, `addProvenanceData.ts`.

**Known gaps:** BUG-004 — curation/LaTeX serverFns under-enforced vs R-CUR-07.
