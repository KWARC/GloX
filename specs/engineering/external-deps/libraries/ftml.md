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
| `src/lib/prepareFloDownStatement.ts` | Rewrite persisted JSON for FloDown `addElement` (D-FTML-01) |
| `src/lib/flodownUris.ts` | Document and symbol URI builders (D-FTML-02) |
| `src/server/ftml/generateStexFromFtml.ts` | Document sTeX generation via the shared rewrite |
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
| `definiendum` | `{ type, uri, content }` | Term being defined (verbalization in `content`). `uri` is the **symbol** URI (or GloX short name). Optional **`symdecl`**: `true` = this block **declares** the symbol; `false`/absent after persist = definiendum only. Persist **strips** `symdecl`; declaration is recorded in `declaredSymbols`. |
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

**E-FTML-02:** A **definiendum** is the term being defined in a definition; it MUST NOT be treated as
the symbol declaration. `declaredSymbols[]` records names this FloDown block **declares**. See
E-FTML-06.

**E-FTML-03:** Symrefs use `type: "symref"` with `uri` pointing to local symbols or MathHub concepts.

**E-FTML-06 (Ubiquitous):** A symbol is **declared once** in the intended sTeX/MathHub model (that
declaration establishes the symbol URI, typically from the declaring file). The same symbol MAY have
**many definitions**, each with a definiendum (possibly a different verbalization or language) that
**references** that URI.

GloX MUST NOT reject a second declaration of the same name. Duplicate declarations are an
**author** problem: they produce more than one URI and the author picks which to use.

**Example:** `triangle.en.tex` declares `triangle` and defines it (“A triangle is a polygon with
sides”); “triangle” is the definiendum. `triangle.de.tex` defines the same symbol (“Ein Dreieck ist
ein Polygon mit drei Seiten”), imports the URI from the English file, and uses “Dreieck” as the
definiendum.

**E-FTML-05:** FloDown hover for a local symbol requires a definition body on a **live** FloDown
document that shares the declaration URI with the **symref**. `addSymbolDeclaration` alone, or a
constructed MathHub URI with no live definition, makes FloDown request
`{backend}/content/fragment` (MathHub 404 for GloX-local names). See D-FTML-03.

## Remaining issues (not blocking the persist/boundary split)

- **Do not infer `declaredSymbols` from definienda.** `syncDeclaredSymbolsFromDefinienda` copies
  every local definiendum name into the column when it is empty. That treats a second-language
  definition (E-FTML-06) as a new declaration. Empty `declaredSymbols` plus definienda can mean
  “defines an imported symbol” (like `triangle.de.tex`) or a stale column — they are not the same.
  Unifying every save path onto that helper would **worsen** the confusion.
- Persist still writes `for_symbols: []` on every definition save. WASM requires the **key**; rewrite
  fills it from definienda (the symbols this **definition is for**, which may be imported). That
  fill is closer to E-FTML-06 than filling from `declaredSymbols`.
- GloX `Symbol` uniqueness (R-SYM-02) is a catalog key, not a check that two files never declare
  the same name. **Author-level:** a second declaration is allowed; it yields a duplicate and the
  author chooses which URI to use. GloX MUST NOT treat that as a system error.
- Storing full symbol URIs in `statement` (so importing files keep the declaring file’s URI) is
  deferred. Until then, short names plus current-file `addSymbolDeclaration` remain.
- **`collectDeclaredSymbolsForDefinitionBlock` unions definienda** and mints URIs from **this**
  file. Lab **E8** is the vendor pattern to match before changing production: one declaration, two
  definitions. Do not implement that production change until E8 is recorded.
- Persist still writes `for_symbols: []` on every definition save. WASM requires the **key**; rewrite
  fills it from definienda (the symbols this **definition is for**, which may be imported). Fix later.
- Preview hover still depends on an in-memory hidden document. Lab E7 same-fd / two-visible hover
  results were not recorded after the MathHub fragment 404s; if WASM always fetches MathHub, D-FTML-03
  cannot produce a popup.
- Document sTeX (`generateStexFromFloDown`) no longer mounts defining FloDown blocks for referenced
  local names; it declares short names on the export document. Module description export still uses
  **constructed** symbol URIs (`buildModuleLocalSymbolUriMap`) instead of `addSymbolDeclaration`
  return values. Mark-reference LaTeX and unused `finalFloDown.ts` are further parallel rewrites.
- `/flodown-lab` is diagnostic only and is not part of the production commit.

## Related docs

- [`../../features/flodown-blocks/lifecycle.md`](../../features/flodown-blocks/lifecycle.md) — DB entities, DTOs, relationships
- [`../../decisions/flodown-persist-and-boundary.md`](../../decisions/flodown-persist-and-boundary.md) — D-FTML-01…04
- [`../vendors/flodown.md`](../vendors/flodown.md)
- [`../vendors/mathhub.md`](../vendors/mathhub.md)
- [`../../../public/flodown/README.md`](../../../public/flodown/README.md)
