---
id: symbol-registry
featured: true
upstream:
  - symbols-semantics
compliance: []
code:
  - src/serverFns/symbol.server.ts
  - src/server/floDownBlockDeclaredSymbols.ts
  - src/serverFns/symbolDuplicate.server.ts
  - src/server/declaredSymbolsInfo.ts
  - src/server/symbolCatalog.ts
  - src/routes/symbols.tsx
  - src/routes/Deduplication.tsx
---

# SDD: Symbol registry

## Domain context

Owns local symbol **declaration records** on the declaring FloDown block (`declaredSymbolsInfo`),
uniqueness of opaque FloDown symbol URIs, association tracking, guarded deletion, and duplicate
confirmation. A later definition MAY use a definiendum for the same symbol without declaring it
again (E-FTML-06). The Prisma `Symbol` table is unused by application code (deprecated; retained
for existing rows).

Out of scope:

- Symbol URI propagation across blocks — [`propagation.md`](./propagation.md)
- Catalog search / stemming — [`search.md`](./search.md)
- FloDown statement editing lifecycle — `flodown-blocks/lifecycle.md`

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `prisma/schema.prisma` `FloDownBlock` | Stores FTML `statement` JSON and `declaredSymbolsInfo` as the declaration catalog for that block. |
| `src/server/floDownBlockDeclaredSymbols.ts` | Adds, removes, and uniqueness-scans declaration records. It does not upsert `Symbol` rows. |
| `src/serverFns/symbol.server.ts` | Creates definienda using client-supplied FloDown URIs and lists or deletes declaration records by scanning `declaredSymbolsInfo`. |
| `src/serverFns/symbolDuplicate.server.ts` | Sets confirmation fields on the matching `declaredSymbolsInfo` object. |
| `src/routes/symbols.tsx` | Curator/Admin UI for the local symbol registry. |
| `scripts/backfill-declared-symbols-info.mjs` | One-shot production backfill of short names into URIs. Temporary mint lives only in this script. |

## Data contracts

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

## Business rules

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

**S-SYM-06 (Ubiquitous):** `deleteSymbolIfUnassociated` and Curator/Admin symbol-registry mutations that
destroy or confirm Symbols MUST reject Extractor-role callers (`requireAdminOrCurator` or equivalent).

**Upstream:** R-SYM-06 — **partially implemented** (see BUG-003: confirm/undo lack role gate).

**S-SYM-07 (Ubiquitous):** Symbol and symref mutation handlers MUST require an authenticated session.

**Upstream:** R-SYM-07 — **partially implemented** (see BUG-003: `undoSymbolConfirmation` and some
search/list handlers lack auth).

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
export identity. Application persist paths MUST NOT mint symbol URIs. The unused `Symbol` model and
`declaredSymbols` column MAY remain in the schema as deprecated storage. Production application
modules MUST NOT import `symbolUri`, `symbolUriFromGlox`, or `canonicalizeSymbolUri`.

**Upstream:** Clarify Q3 (drop deferred); R-SYM-18

**S-SYM-13 (Ubiquitous):** Application code MUST treat stored symbol URIs as opaque: equality and
whole-string replace only. Preview and export MUST pass stored URIs into FloDown and MUST NOT mint
or canonicalize symbol URIs. Document URIs for `FloDown.fromUri` remain D-FTML-02.

**Upstream:** R-SYM-18, D-FTML-02, D-FTML-05

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-SYM-01 | R-SYM-01 | `declaredSymbolsInfo.test.ts`; declare persist requires URI (`symbol.server.ts`) |
| S-SYM-02 | R-SYM-02 | `declaredSymbolsInfo.test.ts` uniqueness |
| S-SYM-04 | R-SYM-04 | `declaredSymbolsInfo.test.ts` confirmation |
| S-SYM-06 | R-SYM-06 | Gap (BUG-003) |
| S-SYM-07 | R-SYM-07 | Gap (BUG-003) |
| S-SYM-08 | R-SYM-08 | Catalog scan in `symbolCatalog.ts` (live-DB integration Gap) |
| S-SYM-09 | R-SYM-19 | `declaredSymbolsInfo.test.ts` reject empty URI |
| S-SYM-10 | R-SYM-16 | `declaredSymbolsInfo.test.ts` opaque replace |
| S-SYM-11 | R-SYM-17 | mark-ref / `createLocalSymbol` reject (live-DB Gap) |
| S-SYM-12 | Clarify Q3 | Backfill script; `flodownUris.test.ts` has no symbol mint helpers |
| S-SYM-13 | R-SYM-18 | `prepareFloDownStatement.test.ts` HTTP pass-through |

## Implementation bugs

| ID | File(s) | Description |
| --- | --- | --- |
| BUG-003 | `symbolDuplicate.server.ts`, `SymbolPropagation.server.ts`, several list/search handlers | Role gates and/or auth missing relative to R-SYM-06/07; confirm and propagation rely on route UI, not server enforcement. |

## Related docs

- [`symbols-semantics.md`](../../../prds/domains/symbols-semantics.md)
- [`propagation.md`](./propagation.md)
- [`search.md`](./search.md)
- [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
- [`../../external-deps/libraries/ftml.md`](../../external-deps/libraries/ftml.md) — E-FTML-06
- [`../../decisions/flodown-persist-and-boundary.md`](../../decisions/flodown-persist-and-boundary.md) — D-FTML-04, D-FTML-05
