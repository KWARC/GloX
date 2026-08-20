---
id: stex-export
featured: true
upstream:
  - curation-export
compliance: []
code:
  - src/server/ftml/generateStexFromFtml.ts
  - src/server/ftml/addProvenanceData.ts
  - src/serverFns/floDownBlockAggregate.server.ts
  - src/serverFns/floDownBlockProvenance.server.ts
  - src/serverFns/getSymbolUriMap.server.ts
---

# SDD: sTeX generation & provenance

## Domain context

Owns combining FloDown blocks into export statements, resolving local symbol references to
MathHub-canonical HTTP URIs, passing through external MathHub URIs, and injecting provenance comments
into generated sTeX.

Out of scope:

- Curation queue UI — [`queue.md`](./queue.md)
- Module description export naming — `module-descriptions/export.md`
- Automated MathHub archive push — not implemented

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/floDownBlockAggregate.server.ts` | Combines FloDown block statements for a file identity into one export document. |
| `src/server/ftml/generateStexFromFtml.ts` | Mounts FTML in FloDown WASM, rewrites local URIs, and serializes sTeX. |
| `src/serverFns/getSymbolUriMap.server.ts` | Resolves defining definitions for external local labels referenced during export. |
| `src/serverFns/floDownBlockProvenance.server.ts` | Loads provenance metadata (document, page, timestamps) per contributing block. |
| `src/server/ftml/addProvenanceData.ts` | Appends provenance comment lines to generated sTeX. |

## Data contracts

| Concern | Rule |
| --- | --- |
| Local URI rewrite | Short `symbolName` → `http://mathhub.info?a={futureRepo}&p={filePath}&m={fileName}&s={uri}` (or `uriMap` / `addSymbolDeclaration` override) |
| MathHub URI | `http(s)://mathhub.info?...` left unchanged |
| Provenance | `%%%` comment lines from `injectProvenance` |
| Export dependency scope | The exporting file identity plus definitions reachable via `uriMap` / defining FloDown blocks for referenced local symbols (see `getSymbolUriMap`) |

## Business rules

**S-CUR-04 (Event-Driven):** WHEN `generateStexFromFloDown` runs, the system MUST rewrite local symbol
references in export FTML to MathHub-canonical HTTP form using the exporting module's file identity
(and dependency `uriMap` when present).

**Upstream:** R-CUR-04

**S-CUR-05 (Event-Driven):** WHEN curation export downloads or previews sTeX, the system MUST inject
provenance metadata for each contributing FloDown block via `injectProvenance`.

**Upstream:** R-CUR-05

**S-CUR-06 (Ubiquitous):** External MathHub URIs in statements MUST pass through `rewriteInlineUris`
unchanged.

**Upstream:** R-CUR-06

**S-CUR-08 (Ubiquitous):** WHEN a defining definition for a referenced local symbol exists in the
export dependency scope, the system MUST resolve that symbol for export rather than leaving an
unresolved local short name in the serialized sTeX.

**Upstream:** R-CUR-08

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-CUR-04 | R-CUR-04 | Gap |
| S-CUR-05 | R-CUR-05 | Gap |
| S-CUR-06 | R-CUR-06 | Gap |
| S-CUR-08 | R-CUR-08 | Gap |

## Related docs

- [`curation-export.md`](../../../prds/domains/curation-export.md)
- [`queue.md`](./queue.md)
- [`../../external-deps/libraries/ftml.md`](../../external-deps/libraries/ftml.md)
- [`../../external-deps/vendors/flodown.md`](../../external-deps/vendors/flodown.md)
- [`../module-descriptions/export.md`](../module-descriptions/export.md)
