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
| `src/types/blockType.ts` | `ExtractBlockType` — UI choice when creating a row |
| `src/server/ftml/statementContent.ts` | Inline content walking and mapping |
| `src/server/ftml/generateStexFromFtml.ts` | sTeX generation |
| `src/server/ftml/addProvenanceData.ts` | Provenance injection at export |

## Statement shapes

Top-level `statement.type` is the block kind — no parallel DB column.

| `ExtractBlockType` / `statement.type` | Shape | Definiendum editing |
| --- | --- | --- |
| `definition` | `{ type: "definition", for_symbols, content: [{ type: "paragraph", … }] }` | Yes |
| `paragraph` | `{ type: "paragraph", content: [...] }` | No (symref only) |

At preview/export, blocks are passed to FloDown via `addElement()` on a document created with
`FloDown.fromUri(documentUri)` — **not** `fromPath` (WASM panics on current Language encodings).
Local symbols are resolved with `addSymbolDeclaration()` at the FloDown boundary; GloX persists short
names in `statement` JSON.

### FloDown document URI (vendor contract)

```
http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}
```

`p=` is omitted when path is empty. Scratch previews use
`http://unknown.source?a=no/archive&d={docId}&l={lang}`.

**E-FTML-04:** Production MUST NOT call `fromPath` or pass short symbol names / persisted `symdecl`
fields directly to `addElement`. Rewrite at the FloDown boundary via
`rewriteStatementForFloDown` / `mountStatementOnFloDown` in `src/lib/prepareFloDownStatement.ts`.

### sTeX mapping (current)

| `statement.type` | Export |
| --- | --- |
| `definition` | `\begin{sdefinition}...\end{sdefinition}` |
| `paragraph` | Plain text with inline `\sr{}` / `\definiendum{}` |

### Inline nodes

| Node | FloDown shape | GloX notes |
| --- | --- | --- |
| `symref` | `{ type, uri, content }` | Reference to local or MathHub symbol; `content` is verbalization |
| `definiendum` | `{ type, uri, content }` | Plus **`symdecl`**: `true` = declare local Symbol; `false` = reference only |
| `definiens` | `{ type, uri, content }` | In ontology; rarely created in UI |

### Local vs MathHub references in FTML

| Source | `uri` in `statement` | Resolution |
| --- | --- | --- |
| Local `Symbol` row | `symbolName` string, e.g. `"monoid"` | Matched with export identity on the `Symbol` table |
| MathHub concept | Full HTTP URL | Stored verbatim |

At sTeX export, local `symbolName` values expand to MathHub document URIs of the form
`http://mathhub.info?a={archive}&p={path}&m={module}&s={symbol}` using the exporting file identity.
Prefer URIs returned by FloDown `addSymbolDeclaration()` when declaring symbols in the WASM block.
Export-identity moves update `Symbol` rows but do not change `symbolName` strings already stored in
`statement` JSON.

**Naming note:** FloDown's `flodown.d.ts` also defines a document-tree type `LogicalParagraph` — not
a GloX database entity. See [naming layers](../../features/flodown-blocks/lifecycle.md#naming-layers).

## Agent constraints

**E-FTML-01:** FloDown block shape is determined by `statement.type` (`definition` or `paragraph`) —
do not add parallel type columns to the database.

**E-FTML-02:** Definienda are inline nodes with `symdecl: true` and a `uri`; declared symbol names
are also tracked in `declaredSymbols[]` for cascade delete.

**E-FTML-03:** Symrefs use `type: "symref"` with `uri` pointing to local symbols or MathHub concepts.

## Related docs

- [`../../features/flodown-blocks/lifecycle.md`](../../features/flodown-blocks/lifecycle.md) — DB entities, DTOs, relationships
- [`../vendors/flodown.md`](../vendors/flodown.md)
- [`../vendors/mathhub.md`](../vendors/mathhub.md)
- [`../../../public/flodown/README.md`](../../../public/flodown/README.md)
