# Symbols & semantics — engineering index

Non-binding orientation. Binding rules: PRD + SDDs below.

| Doc | Role |
| --- | --- |
| [`../../../prds/domains/symbols-semantics.md`](../../../prds/domains/symbols-semantics.md) | Binding PRD |
| [`registry.md`](./registry.md) | SDD — create, uniqueness, confirm, delete |
| [`propagation.md`](./propagation.md) | SDD — bulk URI replacement |
| [`search.md`](./search.md) | SDD — stemmed catalog / suggestion search |
| [`wikipedia-lookup.md`](./wikipedia-lookup.md) | SDD — Wikipedia search / article view for new symbols |

**Code anchors:** `src/serverFns/symbol.server.ts`, `SymbolPropagation.server.ts`,
`src/server/symbolic-suggestions/`, `src/server/floDownBlockDeclaredSymbols.ts`,
`src/serverFns/wikipediaSearch.server.ts`, `src/components/WikipediaDefinitionLookup.tsx`.

**Known gaps:** BUG-003 — several symbol serverFns lack Curator/Admin or auth enforcement.
Wikipedia-lookup test mapping waived 2026-08-15 (skip tests).
