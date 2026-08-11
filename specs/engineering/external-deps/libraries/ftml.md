# External fact: FTML (@flexiformal/ftml)

**Kind:** Library (`E-FTML-*`) — semantic markup stack constraining GloX data shapes.

## What it is

FTML (Flexible TeX/Math Language) is the JSON-based semantic format for definitions, symbols, math,
and inline content. GloX stores FloDown block `statement` fields as FTML JSON.

## Packages

| Package | Role in GloX |
| --- | --- |
| `@flexiformal/ftml` | Core types and utilities |
| `@flexiformal/ftml-react` | React rendering components |
| `@flexiformal/ftml-backend` | Server-side FTML operations |

## GloX types & helpers

| Path | Role |
| --- | --- |
| `src/types/floDown.types.ts` | Statement shapes, definiendum/symref node guards |
| `src/server/ftml/statementContent.ts` | Inline content walking and mapping |
| `src/server/ftml/generateStexFromFtml.ts` | sTeX generation |
| `src/server/ftml/addProvenanceData.ts` | Provenance injection at export |

## Agent constraints

**E-FTML-01:** FloDown block shape is determined by `statement.type` (`definition` or `paragraph`) —
do not add parallel type columns to the database.

**E-FTML-02:** Definienda are inline nodes with `symdecl: true` and a `uri`; declared symbol names
are also tracked in `declaredSymbols[]` for cascade delete.

**E-FTML-03:** Symrefs use `type: "symref"` with `uri` pointing to local symbols or MathHub concepts.

## Related docs

- [`../vendors/flodown.md`](../vendors/flodown.md)
- [`../vendors/mathhub.md`](../vendors/mathhub.md)
- [`../../../public/flodown/README.md`](../../../public/flodown/README.md)
