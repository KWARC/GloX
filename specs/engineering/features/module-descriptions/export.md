---
id: module-description-export
featured: true
upstream:
  - module-descriptions
compliance: []
code:
  - src/lib/moduleDescriptionTex.ts
  - src/lib/prepareFloDownStatement.ts
  - src/lib/flodownUris.ts
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
| `src/lib/moduleDescriptionTex.ts` | Builds the combined module FTML document and serializes module and definition sTeX via FloDown WASM in the browser. Mounts **only** the file being exported (D-FTML-03 for preview; export does not copy sibling definition bodies). |
| `src/lib/prepareFloDownStatement.ts` | Shared rewrite before `addElement` (stored URIs pass through). |
| `src/lib/moduleLocalSymbols.ts` | Collects declared opaque URIs for hover/export identity of sibling definition blocks. |
| `ModuleDescriptionLatexModal` | Displays generated module and definition TeX for copy or download. |
| FloDown WASM (`initFloDown`) | Serializes mounted FTML blocks to sTeX; must run in the browser. |

## Data contracts

| Artifact | Naming / shape |
| --- | --- |
| Module TeX file | `{moduleId}.{language}.tex` |
| Definition TeX file | `{fileName}.{language}.tex` per definition FloDown block |
| Module FTML structure | Section headings Title, Inhalt, Lernziele und Kompetenzen wrapping the three statement contents (`buildModuleDescriptionStatement`) |
| Module FloDown document URI | `http://mathhub.info?a={futureRepo}&p={modulesFilePath}&d={moduleId}&l={language}` |
| Definition FloDown document URI | `http://mathhub.info?a={futureRepo}&p={filePath}&d={fileName}&l={language}` |

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
- Exact sTeX macros and URI rewrite details for local symbols at export time are owned by
  [`stex-export.md`](../curation-export/stex-export.md) and [`ftml.md`](../../external-deps/libraries/ftml.md)
  (D-FTML-05).
- Preview of Title/Inhalt/Lernziele uses a hidden FloDown document for local **symref** hover
  (D-FTML-03). That is not part of the TeX files.

## Related docs

- [`../../decisions/flodown-persist-and-boundary.md`](../../decisions/flodown-persist-and-boundary.md)
- [`module-descriptions.md`](../../../prds/domains/module-descriptions.md)
- [`workspace.md`](./workspace.md)
- [`../../external-deps/libraries/ftml.md`](../../external-deps/libraries/ftml.md)
- [`../../external-deps/vendors/flodown.md`](../../external-deps/vendors/flodown.md)
- [`../../../prds/domains/curation-export.md`](../../../prds/domains/curation-export.md)
