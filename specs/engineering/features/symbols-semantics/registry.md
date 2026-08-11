---
id: symbol-registry
featured: false
upstream:
  - symbols-semantics
compliance: []
code:
  - src/serverFns/symbol.server.ts
---

# SDD: Symbol registry

## Domain context

Owns local `Symbol` catalog operations surfaced to Curators and Admins — creation via definienda,
association tracking, and guarded deletion.

Out of scope:

- FloDown block statement editing — `flodown-blocks/lifecycle.md`
- Symbol propagation — R-SYM-03 (no SDD yet)

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/symbol.server.ts` | Symbol CRUD, association summaries, guarded delete |
| `buildSymbolAssociations()` | Maps each Symbol to non-discarded FloDown blocks that declare its `symbolName` at the same export identity |

## Business rules

**S-SYM-08 (Event-Driven):** WHEN `deleteSymbolIfUnassociated` is called, IF
`associatedDefinitionCount > 0` for that Symbol, the system MUST reject the request with an error.

A block is associated when it is not `DISCARDED`, shares the Symbol's export identity, and declares
the Symbol's `symbolName` (via `declaredSymbols` and/or symdecl definienda in `statement`).

**Upstream:** R-SYM-08

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-SYM-08 | R-SYM-08 | Gap |

## Related docs

- [`symbols-semantics.md`](../../../prds/domains/symbols-semantics.md)
- [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
