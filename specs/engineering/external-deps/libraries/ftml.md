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
| `src/lib/prepareFloDownStatement.ts` | Rewrite persisted JSON for FloDown `addElement` (stored HTTP URIs pass through; no short-name mint) |
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

`p=` is omitted when path is empty. Local DB rows use that row’s archive/path/name/language.
Previews without a row identity use `http://mathhub.info?a=no/archive&d={docId}&l={lang}`.

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
| `definiendum` | `{ type, uri, content }` | Term being defined (verbalization in `content`). `uri` is the opaque **symbol** URI FloDown returned (legacy short names may remain in version history). Optional **`symdecl`**: `true` = this block **declares** the symbol; `false`/absent after persist = definiendum only. Persist **strips** `symdecl`; declaration is recorded in `declaredSymbolsInfo`. |
| `definiens` | `{ type, uri, content }` | In ontology; rarely created in UI |

### Local vs MathHub references in FTML

| Source | `uri` in `statement` | Resolution |
| --- | --- | --- |
| Local declaration | Opaque FloDown HTTP URI | Matched by exact string on `declaredSymbolsInfo.symbolUri` |
| MathHub concept | Full HTTP URL | Stored verbatim |

At sTeX export and preview, stored HTTP symbol URIs pass through. Version-history JSON MAY still
contain short names and is not rewritten. Export-identity moves replace listed old URIs with
FloDown’s new strings.

**Naming note:** FloDown's `flodown.d.ts` also defines a document-tree type `LogicalParagraph` — not
a GloX database entity. See [naming layers](../../features/flodown-blocks/lifecycle.md#naming-layers).

## Agent constraints

**E-FTML-01:** FloDown block shape is determined by `statement.type` (`definition` or `paragraph`) —
do not add parallel type columns to the database.

**E-FTML-02:** A **definiendum** is the term being defined in a definition; it MUST NOT be treated as
the symbol declaration. `declaredSymbolsInfo` records what this FloDown block **declares**. See
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

**E-FTML-05:** FloDown hover looks up a symbol locally first. Local hit requires the relevant
calls on a live `fd`: `addSymbolDeclaration` and `addElement` of a `definition` whose
`for_symbols` include that URI (same document or another mounted document). Otherwise FloDown
requests `{backend}/content/fragment` (MathHub 404 for GloX-local names). See D-FTML-03.

## Remaining issues

Status after E8 (one declaration, two definitions, third-doc symref), D-FTML-01…04, and the
declaration-only URI map.

### Closed or not a defect

- **Catalog uniqueness vs one MathHub symbol.** R-SYM-02 is a **GloX catalog** key (opaque
  `symbolUri`, one live declaration). E-FTML-06 is the **authoring** model (declare once; many
  definitions). Authors may declare twice; GloX MUST NOT reject a second **name**. GloX MUST reject
  a second live declaration of the same URI.
- **`collectDeclaredSymbolsForDefinitionBlock` unioning definienda.** Fixed. The URI map is built
  only from `declaredSymbolsInfo` of the **declaring** file (first declaration wins).
- **Title/Inhalt dumping sibling definition bodies** into the visible FloDown document. Fixed
  (D-FTML-03).
- **`fromPath` / inverted `http://{futureRepo}?a=` as the production document URI.** Production uses
  `fromUri` + `http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}`.
- **Filling `for_symbols` from definienda at the WASM boundary.** Intended: “this definition is
  **for** these symbols” (imported or not). Not the same as `declaredSymbols`.
- **Inferring `declaredSymbols` from definienda on save.** Fixed. Persist keeps the caller-supplied
  list (`symdecl: true` / `addDeclaredSymbol`). Empty column plus definienda is a valid importing
  definition.

### Open (FloDown / persist)

1. **Local hover is understood (E7).** Popup when a live `fd` has called `addSymbolDeclaration` and
   `addElement(definition)`. Same-fd and second-visible both work; hidden is not required. No local
   popup for declaration-only or constructed URI — MathHub `/content/fragment`. Production Title/Inhalt
   still needs those calls on a sibling/hidden defining document (D-FTML-03).
2. **Persist `for_symbols: []` (no DB backfill).** Rewrite supplies the WASM key (definienda or
   `[]`). Verbatim `addElement` of persisted JSON (lab E6) still fails if URIs are not HTTP.
3. **Leftover short names.** Current statements are rewritten by the backfill script. Version
   history is not rewritten. Preview/export does not mint URIs for leftover short names.
4. **`getDefiningDefinitions` full-table scan** of non-discarded FloDown blocks (preview hover
   only). Authenticated now; still not indexed by URI.
5. **Parallel rewrites.** Mark-reference LaTeX and unused `finalFloDown.ts` are not on
   `prepareFloDownStatement`. Document sTeX (`generateStexFromFloDown`) registers declared names via
   `addSymbolDeclaration` then passes stored URIs and does not mount defining bodies — **S-CUR-08 on
   purpose**. If MathHub expected the defining `sdefinition` in the same file, that is a product gap,
   not a WASM panic.
6. **`/flodown-lab`.** Keep until hover is signed off (Curator/Admin). Then drop or leave
   diagnostic-only.

### Spec debt (not blocking preview/export)

- SDD Test mapping is still **Gap** for S-CUR-04/05/06/08, module export rules, and most other
  featured SDDs. Unit tests exist for rewrite, URI builders, and the declaration-only map; they are
  not wired into those mapping tables.

## Related docs

- [`../../features/flodown-blocks/lifecycle.md`](../../features/flodown-blocks/lifecycle.md) — DB entities, DTOs, relationships
- [`../../decisions/flodown-persist-and-boundary.md`](../../decisions/flodown-persist-and-boundary.md) — D-FTML-01…06
- [`../vendors/flodown.md`](../vendors/flodown.md)
- [`../vendors/mathhub.md`](../vendors/mathhub.md)
- [`../../../public/flodown/README.md`](../../../public/flodown/README.md)
