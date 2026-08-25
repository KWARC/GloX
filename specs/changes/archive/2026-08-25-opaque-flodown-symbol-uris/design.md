# Design: Opaque FloDown symbol URIs and declaration records

> **Layer:** *how* — **SDD / tech-spec delta** for the current stack. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical tech specs until Archive.
>
> **Depends on:** Signed `clarify.md`; `proposal.md` reviewed. SDD = policy and boundaries on the current stack — not pseudo-code.
> See [spec-authoring §7](../../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).

---

## SDD delta

Fold into [`registry.md`](../engineering/features/symbols-semantics/registry.md),
[`search.md`](../engineering/features/symbols-semantics/search.md),
[`lifecycle.md`](../engineering/features/flodown-blocks/lifecycle.md),
[`propagation.md`](../engineering/features/symbols-semantics/propagation.md),
[`stex-export.md`](../engineering/features/curation-export/stex-export.md) /
[`export.md`](../engineering/features/module-descriptions/export.md) (preview/export pass-through),
[`ftml.md`](../engineering/external-deps/libraries/ftml.md) remaining issues,
and [`flodown-persist-and-boundary.md`](../engineering/decisions/flodown-persist-and-boundary.md) at
Archive. Do not edit canonical SDDs until then.

### Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `prisma/schema.prisma` `FloDownBlock` | Stores FTML `statement` JSON and `declaredSymbolsInfo` as the declaration catalog for that block after cutover. |
| `src/server/floDownBlockDeclaredSymbols.ts` | Adds, removes, and uniqueness-scans declaration records; no `Symbol` upsert after cutover. |
| `src/serverFns/symbol.server.ts` | Creates definienda using client-supplied FloDown URIs; lists and deletes declaration records by scanning `declaredSymbolsInfo`. |
| `src/serverFns/symbolDuplicate.server.ts` | Sets confirmation fields on the matching `declaredSymbolsInfo` object. |
| `src/serverFns/documentLocation.server.ts` and identity path updates | Accepts an opaque `oldUri` → `newUri` map from the client and replaces those exact strings; does not parse symbol URIs. |
| `src/lib/prepareFloDownStatement.ts` / preview / sTeX | Passes stored opaque symbol URIs into FloDown; does not call `symbolUri` / `canonicalizeSymbolUri`. |
| `src/lib/flodownUris.ts` | Keeps **document** URI helpers for `fromUri` (D-FTML-02). Loses symbol mint helpers after the backfill script is deleted. |
| One-shot backfill script (temporary) | Mints URIs for existing prod rows, writes `declaredSymbolsInfo` and statement URIs, then is removed with `Symbol`, `declaredSymbols`, and mint functions. |

### Data contracts

`declaredSymbolsInfo` is a JSON array of objects:

| Field | Notes |
| --- | --- |
| `symbolName` | Display and picker search token |
| `symbolUri` | Opaque FloDown return value; uniqueness key (R-SYM-02) |
| `hasConfirmed` / `confirmedById` / `confirmedBy` | Dedup confirmation; `confirmedBy` is a display snapshot; `confirmedById` has no FK |
| `alias` | Optional; omit when null |

Association for R-SYM-08: any non-discarded block whose `declaredSymbolsInfo` contains that
`symbolUri`. Discarded blocks do not count as declaring.

`updateFloDownBlockAst` MUST NOT collapse an HTTP symbol URI to a short name.

### Business rules

**S-SYM-01 (Event-Driven):** WHEN `createSymbolDefiniendum` (or extract/create-with-declare)
succeeds with a new declaration, the system MUST append a `declaredSymbolsInfo` object that includes
the client-supplied `symbolUri` and `symbolName`, and MUST persist that `symbolUri` on the
definiendum.

**Upstream:** R-SYM-01, R-SYM-19

**S-SYM-02 (Ubiquitous):** WHEN persisting a new `symbolUri` on a declaration record, the system
MUST reject the write IF any other non-discarded FloDown block already lists that `symbolUri` in
`declaredSymbolsInfo`. The check MUST re-read declaration records in the same transaction (no
database unique index required).

**Upstream:** R-SYM-02

**S-SYM-04 (Event-Driven):** WHEN `confirmSymbolNotDuplicate` succeeds, the system MUST set
`hasConfirmed`, `confirmedById`, and `confirmedBy` on the declaration object that owns that
`symbolUri`.

**Upstream:** R-SYM-04

**S-SYM-05 (Event-Driven):** WHEN local catalog picker search runs, the system MUST match the query
against `symbolName` (and optional `alias`) on `declaredSymbolsInfo` across FloDown blocks. Stemming
for automatic suggestions is unchanged.

**Upstream:** R-SYM-05

**S-SYM-06 / S-SYM-07:** Unchanged role and auth gates (BUG-003 remains a known gap unless this
change happens to touch those handlers).

**S-SYM-08 (Event-Driven):** WHEN delete-declaration is called, IF any non-discarded
`declaredSymbolsInfo` still contains that `symbolUri`, the system MUST reject the request.

**Upstream:** R-SYM-08

**S-SYM-09 (Ubiquitous):** Declaration persist paths MUST reject a missing or empty `symbolUri`.
Extract and LLM paths MUST NOT write `declaredSymbolsInfo` for a name until the client supplies
FloDown’s URI.

**Upstream:** R-SYM-19

**S-SYM-10 (Event-Driven):** WHEN an export-identity move or declared-name rename succeeds, the
client MUST supply FloDown’s new URI for each affected declaration (browser WASM). The server MUST
replace each listed old `symbolUri` with the corresponding new string in all FloDown block
statements, module-description statement JSON, and `declaredSymbolsInfo`, and MUST NOT replace
strings that were not in that list.

**Upstream:** R-SYM-16, R-SYM-18

**S-SYM-11 (Ubiquitous):** `createLocalSymbol` MUST NOT insert a catalog row. Mark-reference persist
MUST store only a `symbolUri` already present in some `declaredSymbolsInfo` or a MathHub URI from
the picker.

**Upstream:** R-SYM-17

**S-SYM-12 (Event-Driven):** WHEN the one-shot backfill script runs, it MAY use a temporary local
mint function to populate `declaredSymbolsInfo` and statement URIs from existing short names and
export identity. AFTER successful cutover, that script, the mint function, `symbolUri`,
`symbolUriFromGlox`, `canonicalizeSymbolUri`, and `buildModuleLocalSymbolUriMap` MUST be deleted,
and the `Symbol` model and `declaredSymbols` column MUST be removed.

**Upstream:** Clarify Q3; R-SYM-18

**S-SYM-13 (Ubiquitous):** Application code MUST treat stored symbol URIs as opaque: equality and
whole-string replace only. Preview and export MUST pass stored URIs into FloDown and MUST NOT mint
or canonicalize symbol URIs. Document URIs for `FloDown.fromUri` remain D-FTML-02.

**Upstream:** R-SYM-18, D-FTML-02, D-FTML-05

**S-FDB-01 (Event-Driven):** WHEN `createFloDownBlock` succeeds, the system MUST persist
`originalText`, `statement`, `declaredSymbolsInfo` (possibly empty), and a version-1 history row.

**Upstream:** R-FDB-01

**S-FDB-03 (Event-Driven):** WHEN a FloDown block is deleted, the system MUST remove symrefs whose
`uri` exactly equals any `symbolUri` from that block’s `declaredSymbolsInfo` from remaining
statements in the same transaction.

**Upstream:** R-FDB-03

**S-FDB-06a (Event-Driven):** WHEN a Document or block export-identity move succeeds, the system
MUST update identity columns and MUST apply S-SYM-10 for every declaration on the moved blocks.
The system MUST NOT leave previous local symbol URIs in statements.

**Upstream:** R-SYM-16 (supersedes “leave statement JSON unchanged” for local symbol URIs)

**S-FDB-09 (Ubiquitous):** Statement persist MUST NOT rewrite a symbol `uri` that is already an
HTTP(S) string into a short name.

**Upstream:** R-SYM-01, R-SYM-18

**S-SYM-03 / S-SYM-03a:** Propagation remains whole-string replace of the matched URI (local or
MathHub); match keys are opaque URIs after cutover, not short names.

**Upstream:** R-SYM-03

## Boundaries

| Area | Paths / identifiers |
| --- | --- |
| Code | `src/serverFns/symbol.server.ts`, `symbolDuplicate.server.ts`, `extractFloDownBlock.server.ts`, `updateFloDownBlock.server.ts`, `createFloDownBlockWithDeclaredSymbol.server.ts`, `moduleDescription.server.ts`, `documentLocation.server.ts`, `markReference.server.ts`, `getSymbolUriMap.server.ts`, `floDownBlockDeclaredSymbols.ts`, `floDownBlockDeletion.ts`, `convertLocalSymbolToMathHub.ts`, `prepareFloDownStatement.ts`, `flodownUris.ts`, `moduleLocalSymbols.ts`, `moduleDescriptionTex.ts`, `markReferenceLatex.ts`, `FtmlPreview.tsx`, `generateStexFromFtml.ts`, registry/dedup routes, search picker |
| Data | `FloDownBlock.declaredSymbolsInfo`; drop `Symbol`, `FloDownBlock.declaredSymbols`; current `statement` + module Title/Inhalt/Lernziele JSON; not `FloDownBlockVersion` |
| Tenants / tiers | N/A (single internal deployment) |

## ADR alignment

**Supersede D-FTML-01:** The database MUST persist local symbol `uri` values as the opaque strings
FloDown returned. The system MUST NOT keep local identity as short names after cutover.

**Keep D-FTML-02:** Document `fromUri` grammar unchanged.

**Keep D-FTML-03:** Hover mount policy unchanged; known URIs are stored declaration URIs, not
GloX-constructed maps.

**Supersede D-FTML-04:** `FloDownBlock.declaredSymbolsInfo` MUST record what this block **declares**
(E-FTML-06). The system MUST NOT treat every definiendum `uri` as a declaration. Persist MUST NOT
fill declaration records from definienda that are not declarations.

**New D-FTML-05:** GloX MUST NOT mint, parse, or canonicalize **symbol** URIs after the backfill
script is removed.

**New D-FTML-06:** FloDown WASM MUST NOT run on the server.

## Operations

| Concern | Link or N/A |
| --- | --- |
| Vendors | FloDown WASM in the browser only (`flodown.md`). MathHub URIs in statements stay opaque pass-through. |
| Deployment / flags | One-shot backfill against production data before dropping columns; no feature flag in Clarify. Historic version JSON is not rewritten (v2). |

## Test mapping

| Rule ID / summary | Test (file or describe block) | Layer (integration / unit / E2E) |
| --- | --- | --- |
| R-SYM-01 / S-SYM-01 persist FloDown URI on declare | Declare with client URI; statement + `declaredSymbolsInfo` contain that exact string | integration |
| R-SYM-19 / S-SYM-09 reject declare without URI | Declare omitting `symbolUri` fails; extract without URI leaves `declaredSymbolsInfo` empty | integration |
| R-SYM-02 / S-SYM-02 unique URI | Second non-discarded block declaring the same `symbolUri` is rejected | integration |
| R-SYM-04 / S-SYM-04 confirm | Confirm writes flags onto the declaration object | integration |
| R-SYM-05 / S-SYM-05 search | Picker `contains` on `symbolName` finds a declaration after `Symbol` is gone | integration |
| R-SYM-08 / S-SYM-08 guarded delete | Delete rejected while a live block declares the URI | integration |
| R-SYM-16 / S-SYM-10 / S-FDB-06a opaque replace | Move supplies old→new map; importers and module JSON get new string; unlisted MathHub URI unchanged | integration |
| R-SYM-17 / S-SYM-11 no catalog without block | `createLocalSymbol` does not create a declaration; mark-ref with unknown local URI rejected | integration |
| R-SYM-18 / S-SYM-13 / S-FDB-09 no mint / no strip | `canonicalizeSymbolUri` / `symbolUriFromGlox` absent after cutover; AST persist keeps HTTP `uri` | unit |
| S-FDB-03 cascade | Delete declaring block removes exact-URI symrefs | integration |
| S-SYM-12 backfill then delete mint | Script test on fixture names; after cutover, production modules do not import symbol mint helpers | unit |
| R-SYM-06 / R-SYM-07 | Existing BUG-003; add negative tests only if this change touches those handlers | integration (gap unless touched) |
| R-SYM-03 / S-SYM-03 | Propagation replaces opaque URI strings | integration |

Every MUST NOT above has a negative test in this table (reject empty URI; reject duplicate URI;
reject unknown mark-ref; no strip HTTP; no replace of unlisted URIs; Extractor delete/confirm
unchanged unless handlers are touched).

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4) — add after review:

Upstream review: <name> — <date>
Scope: design
Teach-back: confirmed
-->
