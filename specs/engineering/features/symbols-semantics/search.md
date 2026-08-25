---
id: symbol-search
featured: true
upstream:
  - symbols-semantics
compliance: []
code:
  - src/server/symbolic-catalog/stemmers.ts
  - src/server/symbolic-suggestions/
  - src/serverFns/symbolicCatalog.server.ts
  - src/server/useSymbolSearch.ts
---

# SDD: Symbolic catalog search

## Domain context

Owns search over the local Symbol catalog, static suggestion catalog, and MathHub symbol search used
when inserting symrefs and running automatic suggestions (Sniffy).

Out of scope:

- Persisting Symbols — [`registry.md`](./registry.md)
- MathHub server behavior — `external-deps/vendors/mathhub.md`

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/server/symbolic-catalog/stemmers.ts` | Stems tokens for English, German, and French before catalog matching. |
| `src/server/symbolic-suggestions/` | Builds suggestion catalogs, scores candidates, and ranks automatic matches. |
| `src/serverFns/symbolicCatalog.server.ts` | Serves the static symbolic catalog to clients. |
| `src/server/useSymbolSearch.ts` | Combines DB `contains` search with MathHub FTML symbol search for the picker UI. |

## Business rules

**S-SYM-05 (Event-Driven):** WHEN catalog or suggestion search runs for a FloDown block language of
English, German, or French, the system MUST apply language-aware stemming (Porter / German / French)
for automatic suggestion matching in that language.

**Upstream:** R-SYM-05

Manual picker search (`searchSymbol`) uses case-insensitive substring match on `symbolName` and
optional `alias` in `declaredSymbolsInfo` across FloDown blocks and is language-agnostic; MathHub
results come from the configured FTML search API.

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-SYM-05 | R-SYM-05 | Gap |

## Related docs

- [`symbols-semantics.md`](../../../prds/domains/symbols-semantics.md)
- [`registry.md`](./registry.md)
- [`../../external-deps/vendors/mathhub.md`](../../external-deps/vendors/mathhub.md)
