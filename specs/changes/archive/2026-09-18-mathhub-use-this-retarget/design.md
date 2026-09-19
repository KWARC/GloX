# Design: MathHub Use this — drop local declaration and retarget all current FTML

> **Layer:** *how* — **SDD / tech-spec delta** for the current stack. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical tech specs until Archive.
>
> **Depends on:** Signed `clarify.md`; `proposal.md` reviewed. SDD = policy and boundaries on the current stack — not pseudo-code.
> See [spec-authoring §7](../../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).

---

## SDD delta

Fold into [`propagation.md`](../engineering/features/symbols-semantics/propagation.md),
[`registry.md`](../engineering/features/symbols-semantics/registry.md) (role gates on confirm/undo;
drop declaration via `removeDeclaredSymbol`), and domain dictionary `symbol_propagation` at Archive.
Do not edit canonical SDDs until then.

**Replace S-SYM-03** (handler rename + scan surface). Keep **S-SYM-03a** for the sibling MathHub→local
URI replace (`applyMathHubReplacement`); optional rename of that pair is not required.

**S-SYM-03 (Event-Driven):** WHEN `replaceLocalSymbolWithMathHub` succeeds, the system MUST, in one
transaction: iterate every `FloDownBlock` and every `ModuleDescription`; replace matching
definiendum and symref `uri` values from the given local URI to the given MathHub URI by opaque
string equality; remove that local URI from the declaring block’s `declaredSymbolsInfo`; append a
`FloDownBlockVersion` row and increment `currentVersion` for each FloDown block whose **current**
statement changed. The handler MUST NOT accept a client list of block IDs. The handler MUST NOT
rewrite historic version JSON. Module Title/Inhalt/Lernziele JSON has no version table; those
columns MUST be overwritten in place when they change.

**Upstream:** R-SYM-03, R-SYM-20

**S-SYM-14 (Event-Driven):** WHEN `listLocalSymbolUriHits` succeeds, the system MUST return every
FloDown block whose current statement contains the local URI (including discarded; including the
declaring block) and every ModuleDescription Title, Inhalt, or Lernziele statement that contains it,
with enough fields for the UI to show a Discarded indicator and a module-id plus Title/Inhalt/Lernziele
label.

**Upstream:** R-SYM-21

**S-SYM-15 (Ubiquitous):** `listLocalSymbolUriHits` and `replaceLocalSymbolWithMathHub` MUST reject
Extractor-role callers and MUST reject unauthenticated callers (`requireAdminOrCurator` or
equivalent). `confirmSymbolNotDuplicate` and `undoSymbolConfirmation` MUST use the same role gate.

**Upstream:** R-SYM-06, R-SYM-07 (closes BUG-003 for these handlers)

**S-SYM-16 (Ubiquitous):** Confirm replace from Deduplication and from Semantic Panel when the
selected definiendum URI is a **local declaration** MUST call `replaceLocalSymbolWithMathHub` with
that declaration URI and the chosen MathHub URI. The write MUST NOT use a primary-only
`replaceSemantic` for this flow.

**Upstream:** R-SYM-03, R-SYM-20

**S-SYM-06a:** Delete or fold into S-SYM-15 (MUST, not SHOULD).

Opaque URI replace stays `propagateUriInAst` / existing AST helpers (R-SYM-18).

## Boundaries

| Area | Paths / identifiers |
| --- | --- |
| Code | `src/serverFns/SymbolPropagation.server.ts` (rename handlers); `src/server/ftml/convertLocalSymbolToMathHub.ts`; `src/server/floDownBlockDeclaredSymbols.ts`; `src/serverFns/symbolDuplicate.server.ts`; `src/components/SymbolPropagationDialog.tsx`; `src/components/Duplicate.tsx`; `src/routes/Deduplication.tsx`; Semantic Panel Use this (`SemanticSearchResults.tsx` / `SemanticPanel.tsx`); stop primary `updateFloDownBlockAst` `pendingPropagation` for this flow |
| Data | `FloDownBlock.statement`, `FloDownBlock.declaredSymbolsInfo`, `FloDownBlockVersion`; `ModuleDescription.titleStatement`, `inhaltStatement`, `lernzieleStatement`. No schema change. No `MarkReference` writes. |
| Tenants / tiers | N/A (single-app glossary-wide scan) |

## ADR alignment

Pass — D-FTML-05 / R-SYM-18: whole-string URI equality only.

## Operations

| Concern | Link or N/A |
| --- | --- |
| Vendors | N/A (MathHub URI is curator-picked; no new MathHub API) |
| Deployment / flags | N/A |

## Test mapping

| Rule ID / summary | Test (file or describe block) | Layer |
| --- | --- | --- |
| R-SYM-03 / S-SYM-03 rewrite FloDown definienda+symrefs including declaring + discarded | `replaceLocalSymbolWithMathHub.test.ts` (in-memory snapshot; live DB Gap) | unit (integration Gap: no Postgres harness) |
| R-SYM-03 module Title/Inhalt/Lernziele | same | unit |
| R-SYM-03 MUST NOT rewrite historic version JSON | same (historicStatements stay on local URI after current rewrite) | unit |
| R-SYM-20 drop declaration, keep rows | same | unit |
| S-SYM-03 MUST NOT accept client ID list | `parseReplaceLocalSymbolWithMathHubInput` | unit |
| R-SYM-21 / S-SYM-14 list includes declaring, discarded chip data, module labels | `collectLocalSymbolUriHits` | unit |
| R-SYM-22 Dedup confirmed section | `dedupCatalogDisplay.test.ts` | unit |
| S-SYM-15 Extractor rejected | `roleMayReplaceLocalSymbolWithMathHub` | unit |
| R-SYM-06 / S-SYM-15 unauthenticated rejected | same | unit |
| Opaque equality (R-SYM-18) | `propagateUriInAst` (existing helper; covered when retarget is implemented) | unit |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4) — add after review:

Upstream review: Abhishek Chugh — 2026-09-18
Scope: design
Teach-back: confirmed
-->
