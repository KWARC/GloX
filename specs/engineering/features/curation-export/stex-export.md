---
id: stex-export
featured: true
upstream:
  - curation-export
compliance: []
code:
  - src/server/ftml/generateStexFromFtml.ts
  - src/lib/prepareFloDownStatement.ts
  - src/server/ftml/addProvenanceData.ts
  - src/serverFns/floDownBlockAggregate.server.ts
  - src/serverFns/floDownBlockProvenance.server.ts
  - src/serverFns/getSymbolUriMap.server.ts
---

# SDD: sTeX generation & provenance

## Domain context

Owns combining FloDown blocks into export statements, passing stored opaque symbol URIs into FloDown
(D-FTML-05), passing through external MathHub URIs, and injecting provenance comments into generated
sTeX.

Out of scope:

- Curation queue UI — [`queue.md`](./queue.md)
- Module description export naming — `module-descriptions/export.md`
- Automated MathHub archive push — not implemented

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/floDownBlockAggregate.server.ts` | Combines FloDown block statements for a file identity into one export document. |
| `src/server/ftml/generateStexFromFtml.ts` | Creates a FloDown document with `fromUri`, mounts each top-level block through `mountStatementOnFloDown`, and serializes sTeX. |
| `src/lib/prepareFloDownStatement.ts` | Passes stored HTTP URIs into FloDown `addElement` (heading/`for_symbols`/`symdecl` shape only). |
| `src/serverFns/getSymbolUriMap.server.ts` | Resolves defining definitions for opaque symbol URIs. Used by **preview hover**, not by `generateStexFromFloDown`. |
| `src/serverFns/floDownBlockProvenance.server.ts` | Loads provenance metadata (document, page, timestamps) per contributing block. |
| `src/server/ftml/addProvenanceData.ts` | Appends provenance comment lines to generated sTeX. |

## Data contracts

| Concern | Rule |
| --- | --- |
| Local URI rewrite | Stored opaque FloDown URI pass-through (D-FTML-05). |
| MathHub URI | `http(s)://mathhub.info?...` canonicalized if needed; not stored back to the database |
| Provenance | `%%%` comment lines from `injectProvenance` |
| Export dependency scope | The exporting file identity. Defining FloDown blocks are **not** copied into the sTeX document. |

## Business rules

**S-CUR-04 (Event-Driven):** WHEN `generateStexFromFloDown` runs, the system MUST pass stored symbol
URIs into FloDown using `mountStatementOnFloDown` (D-FTML-05).

**Upstream:** R-CUR-04

**S-CUR-05 (Event-Driven):** WHEN curation export downloads or previews sTeX, the system MUST inject
provenance metadata for each contributing FloDown block via `injectProvenance`.

**Upstream:** R-CUR-05

**S-CUR-06 (Ubiquitous):** External MathHub URIs in statements MUST pass through the FloDown rewrite
unchanged (opaque equality).

**Upstream:** R-CUR-06

**S-CUR-08 (Ubiquitous):** WHEN generating sTeX, the system MUST pass stored opaque symbol URIs into
FloDown unchanged. The defining FloDown block body MUST NOT be copied into the exported sTeX file.
`FloDownBlockVersion` JSON MAY still contain short names; this export path MUST NOT rewrite version
history.

**Upstream:** R-CUR-08

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-CUR-04 | R-CUR-04 | Gap |
| S-CUR-05 | R-CUR-05 | Gap |
| S-CUR-06 | R-CUR-06 | Gap |
| S-CUR-08 | R-CUR-08 | Gap |

## Related docs

- [`../../decisions/flodown-persist-and-boundary.md`](../../decisions/flodown-persist-and-boundary.md)
- [`curation-export.md`](../../../prds/domains/curation-export.md)
- [`queue.md`](./queue.md)
- [`../../external-deps/libraries/ftml.md`](../../external-deps/libraries/ftml.md)
- [`../../external-deps/vendors/flodown.md`](../../external-deps/vendors/flodown.md)
- [`../module-descriptions/export.md`](../module-descriptions/export.md)
