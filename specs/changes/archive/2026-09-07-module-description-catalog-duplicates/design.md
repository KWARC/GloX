# Design: Module description catalog duplicates

> **Layer:** *how* — **SDD / tech-spec delta** for the current stack. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical tech specs until Archive.
>
> **Depends on:** Signed `clarify.md`; `proposal.md` reviewed. SDD = policy and boundaries on the current stack — not pseudo-code.
> See [spec-authoring §7](../../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).

---

## SDD delta

Fold into [`workspace.md`](../../engineering/features/module-descriptions/workspace.md) and
[`export.md`](../../engineering/features/module-descriptions/export.md) at Archive. At Archive, add
a domain-dictionary term for a module description that is marked as a duplicate of another
(preferred label to match UI copy).

### Data contracts

**Catalog duplicate index file** (`MODULES_DIR/duplicates.json`, default `modules/duplicates.json`):

- Envelope: `version` (integer `1`), `generatedAt`, `fields`, `nearThreshold`, `modules`.
- `modules` keys are `moduleId` strings. Omit identifiers that have no peers.
- Each value has `exact` and `near` arrays (empty arrays MAY be omitted; readers treat missing as
  empty). A peer MUST NOT appear in both arrays (**exact wins** at generation).
- Exact peer: `{ moduleId, title }` (catalog title). Near peer: those fields plus `score` and
  `nearKind` (`normalized` | `similar` | `mixed`).
- No self-entries. If A lists B as exact, B lists A as exact (same for near). Arrays sorted by
  numeric `moduleId`.
- The file MUST NOT store who is extracted or who is marked duplicate.

**Prisma `ModuleDescription`:** nullable `duplicateOfModuleId` foreign key to another
`ModuleDescription`. Canonical rows have null. Duplicate rows MUST NOT be used as a mark target.
WHILE `duplicateOfModuleId` is set, `inhaltStatement` and `lernzieleStatement` MUST NOT hold
curated semantics (empty or unused); `titleStatement` holds catalog title only; no definition
`FloDownBlock` rows.

### Workspace (`workspace.md`)

**S-MOD-19 (Event-Driven):** WHEN `searchModuleDescriptions` returns catalog hits, the handler MUST
read the catalog duplicate index and MUST attach, for each hit, that hit’s `exact` and `near` peer
lists plus a **C2** suggestion: among `exact` peers prefer a `moduleId` that already has a
`ModuleDescription` (lowest numeric id if several), else the same rule on `near` peers, else the
lowest numeric peer id among `exact` then `near`. The search UI MUST keep the hit’s `moduleId`
visible and MUST show U1 copy (exact vs near, suggestion title, whether that suggestion has a row,
and `+N other catalog matches` when more than one peer exists). U1 copy MUST sit alongside the
existing faculty/subject-area subtitle (**S-MOD-16**); it MUST NOT replace or hide that subtitle.

**Upstream:** R-MOD-19

**S-MOD-20 (Event-Driven):** WHEN mark-as-duplicate runs, the handler MUST call
`requireExtractorPlus`, MUST reject if the target `moduleId` has no `ModuleDescription` row, MUST
reject if the target row has `duplicateOfModuleId` set, MUST reject if the target is this same row,
MUST persist `duplicateOfModuleId` on this row, MUST delete this module’s definition FloDown blocks
with the same orphan-symbol cleanup as `resetModuleSemantics` (R-FDB-03), MUST keep this row’s
catalog title, and MUST drop curated Inhalt and Lernziele on this row. If this `moduleId` has no
row yet, the workspace MUST create it first (existing `createModuleDescription`) then mark. The UI
MUST show the deletion warning only WHEN a row already exists for this module; the warning text
MUST be that extracted Inhalt, Lernziele, definitions, and related glossary blocks on this module
will be permanently removed. The UI MUST pre-fill the canonical `moduleId` only from an exact (else
near) catalog peer that already has a non-duplicate `ModuleDescription`. The UI MUST list those
eligible peers as `Potential duplicates: Exact (…)` and/or `Near (…)` when any exist.

**Upstream:** R-MOD-20

**S-MOD-21 (State-Driven):** WHILE `duplicateOfModuleId` is set, `updateModuleDescriptionStatement`,
`updateModuleDescriptionAst`, `moduleDescriptionSymbolicRef`, `createModuleDefinitionBlock`, and
shared FloDown mutations targeting this module’s blocks MUST fail; the workspace UI MUST disable
semantic editing and definition/symbol addition.

**Upstream:** R-MOD-21

**S-MOD-22 (Event-Driven):** WHEN unmark-duplicate runs, the handler MUST call
`requireExtractorPlus`, MUST clear `duplicateOfModuleId`, and MUST re-seed title, Inhalt, and
Lernziele from the current catalog JSON for this `moduleId` (same seed path as
`resetModuleSemantics` without requiring a prior reset).

**Upstream:** R-MOD-22

**S-MOD-01** is unchanged except search payload growth (**S-MOD-19**). **S-MOD-04–S-MOD-06** remain
the mutation paths; **S-MOD-21** is the alias guard. Catalog faculty/subject-area rules
**S-MOD-16–18** are unchanged.

Offline generation: existing detector MUST emit this file shape (`--match` exact and near, then
map). The running app MUST NOT scan all catalog module JSON files to compute peers.

### Export (`export.md`)

**S-MOD-23 (Event-Driven):** WHEN Curator or Admin export runs for a row with `duplicateOfModuleId`
set, `generateModuleDescriptionModuleTex` MUST name the file `{this.moduleId}.{this.language}.tex`,
MUST build the Title section from this row’s retained catalog title as plain text, and MUST build
Inhalt and Lernziele from the **canonical** row’s `inhaltStatement` and `lernzieleStatement`.

**Upstream:** R-MOD-23

**S-MOD-24 (Event-Driven):** WHEN Curator or Admin bulk export runs, the zip MUST include the module
TeX file for every `ModuleDescription` including duplicates. Definition TeX files MUST be produced
only for rows that are not duplicates (canonical bodies).

**Upstream:** R-MOD-24

Existing **S-MOD-11** applies to non-duplicate rows. **S-MOD-12** applies only to definition blocks
that remain (canonical). **S-MOD-15** is unchanged.

---

## Boundaries

| Area | Paths / identifiers |
| --- | --- |
| Code | `scripts/find-module-description-duplicates.mjs`, `scripts/moduleDescriptionDuplicates.mjs`; `src/server/modules/` catalog + duplicate-index load; `src/serverFns/moduleDescription.server.ts`; `src/routes/module-descriptions/index.tsx`; `src/routes/module-description/$moduleId.tsx`; statement/definition sections and hooks; `src/lib/moduleDescriptionTex.ts`, `src/lib/moduleDescriptionTexExport.ts` |
| Data | `MODULES_DIR/duplicates.json`; `ModuleDescription.duplicateOfModuleId`; FloDown blocks on mark (delete) |
| Tenants / tiers | N/A — role gates Extractor+ / Curator+ as today |

| Layer | Responsibility |
| --- | --- |
| Offline detector | Writes the module-keyed duplicate index from catalog JSON three-field signatures and MUST assert symmetry. |
| Catalog / search server | Loads the index once per process (same directory as the module catalog) and attaches U1 hint payloads to search hits using live `ModuleDescription` existence for C2. |
| Workspace server | Authenticates mark/unmark, enforces T1 and no alias-of-alias, deletes FloDown on mark, rejects semantic mutations on duplicates. |
| Workspace UI | Shows U1 annotations, always offers mark-as-duplicate, warns before mark, disables editors on duplicates. |
| TeX export | Composes duplicate module files per S-MOD-23 and includes them in bulk zip per S-MOD-24. |

## ADR alignment

Pass — no new ADR. FloDown WASM remains client-only for TeX. Duplicate mark is a server mutation
plus cascade delete already owned by module reset.

## Operations

| Concern | Link or N/A |
| --- | --- |
| Vendors | N/A |
| Deployment / flags | After catalog refresh, operators regenerate `duplicates.json` with the detector (`pnpm detect:module-duplicates` plus emit map). Missing file: search MUST still work and MUST omit duplicate hints. |

## Test mapping

| Rule ID / summary | Test (file or describe block) | Layer (integration / unit / E2E) |
| --- | --- | --- |
| S-MOD-19 search hints + C2 | Unit: C2 pick among peers given a set of existing ids. Integration: search hit for `62083` includes exact peer `42438` when the index file says so. | unit + integration |
| R-MOD-19 / U1 does not hide hit | Integration or component: result still lists the queried `moduleId`. | integration |
| S-MOD-20 mark rejects missing canonical | Integration: mark of A→B fails if B has no row. | integration |
| S-MOD-20 mark rejects alias target | Integration: mark A→B fails if B is already a duplicate. | integration |
| S-MOD-20 mark UI eligible originals | Unit: prefill/list only persisted non-duplicate peers; omit unpersisted C2 fallback. | unit |
| S-MOD-21 MUST NOT mutate alias | Integration: statement update and create definition fail. | integration |
| S-MOD-22 unmark re-seeds | Integration: three catalog fields restored; `duplicateOfModuleId` null. | integration |
| S-MOD-23 E1 Title | Unit: TeX Title from alias catalog title; Inhalt from canonical statements. | unit |
| S-MOD-24 bulk zip | Unit/integration: zip paths include both `{alias}.{lang}.tex` and `{canonical}.{lang}.tex`; no alias definition files. | unit |
| Index file symmetry / exact-wins | Unit: generator or loader rejects or never emits a peer in both lists; A↔B exact. | unit |
| R-MOD-13 / Extractor+ | Integration: unauthenticated mark rejected. | integration |
| R-MOD-15 | Unchanged: Extractor still cannot export. | Gap (existing) |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4) — add after review:

Upstream review: <name> — <date>
Scope: design
Teach-back: confirmed
-->
