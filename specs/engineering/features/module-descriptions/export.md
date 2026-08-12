---
id: module-description-export
featured: true
upstream:
  - module-descriptions
compliance: []
code:
  - src/lib/moduleDescriptionTex.ts
  - src/components/module-descriptions/ModuleDescriptionLatexModal.tsx
  - src/routes/module-description/$moduleId.tsx
  - src/lib/moduleLocalSymbols.ts
---

# SDD: Module description TeX export

## Domain context

Owns Curator/Admin export of MathHub-oriented sTeX for a ModuleDescription: one module file from the
annotated title/inhalt/lernziele statements, plus one TeX file per extracted definition FloDown block.

Out of scope (sibling specs):

- Workspace create/edit/reset/delete — [`workspace.md`](./workspace.md)
- Document LaTeX versioning and curation queue — `curation-export` PRD
- Automated MathHub archive push — not implemented

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/routes/module-description/$moduleId.tsx` | Shows Preview LaTeX only for Curator or Admin and invokes client-side TeX generation. |
| `src/lib/moduleDescriptionTex.ts` | Builds the combined module FTML document and serializes module and definition sTeX via FloDown WASM in the browser. |
| `src/lib/moduleLocalSymbols.ts` | Maps local Symbol names from definition blocks into URI maps used when serializing the module file. |
| `ModuleDescriptionLatexModal` | Displays generated module and definition TeX for copy or download. |
| FloDown WASM (`initFloDown`) | Serializes mounted FTML blocks to sTeX; must run in the browser. |

## Data contracts

| Artifact | Naming / shape |
| --- | --- |
| Module TeX file | `{moduleId}.{language}.tex` |
| Definition TeX file | `{fileName}.{language}.tex` per definition FloDown block |
| Module FTML structure | Section headings Title, Inhalt, Lernziele und Kompetenzen wrapping the three statement contents (`buildModuleDescriptionStatement`) |
| Module FloDown document URI | `futureRepo` + `modulesFilePath` archive + `moduleId` document id + language |
| Definition FloDown document URI | Block `futureRepo` + `filePath` (`defsFilePath`) + `fileName` + language |

## Business rules

**S-MOD-11 (Event-Driven):** WHEN Curator or Admin export runs, `generateModuleDescriptionModuleTex`
MUST produce sTeX for a file named `{moduleId}.{language}.tex` whose content is built from the three
annotated statements under Title, Inhalt, and Lernziele und Kompetenzen section headings.

**Upstream:** R-MOD-11

**S-MOD-12 (Event-Driven):** WHEN Curator or Admin export runs, `generateModuleDescriptionTexPreview`
MUST produce one TeX artifact per definition FloDown block associated with the ModuleDescription,
named `{fileName}.{language}.tex`.

**Upstream:** R-MOD-12

**S-MOD-15 (Ubiquitous):** The module detail UI MUST NOT offer TeX export controls to Extractor-role
users; only Curator and Admin may invoke export.

**Upstream:** R-MOD-15

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-MOD-11 | R-MOD-11 | Gap |
| S-MOD-12 | R-MOD-12 | Gap |
| S-MOD-15 | R-MOD-15 | Gap |

## Open documentation gaps

- Export is client-only (browser WASM); there is no server-side TeX persistence for modules comparable
  to Document `LatexTable`.
- Exact sTeX macros and URI rewrite details for local symbols at export time belong with
  `curation-export` / `ftml.md` when that SDD is written.

## Related docs

- [`module-descriptions.md`](../../../prds/domains/module-descriptions.md)
- [`workspace.md`](./workspace.md)
- [`../../external-deps/libraries/ftml.md`](../../external-deps/libraries/ftml.md)
- [`../../external-deps/vendors/flodown.md`](../../external-deps/vendors/flodown.md)
- [`../../../prds/domains/curation-export.md`](../../../prds/domains/curation-export.md)
