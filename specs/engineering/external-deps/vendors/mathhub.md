# External fact: MathHub

**Kind:** Vendor (`E-MATHHUB-*`) — agents cannot infer runtime behavior from code alone.

## What it is

[MathHub](https://mathhub.info) is the semantic content server for FTML archives, symbol resolution,
and notation rendering. GloX uses it as the FTML backend for preview and as the target archive for
exported glossaries.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_FTML_SERVER_URL` | `https://mathhub.info` | FTML backend URL (browser + server) |

## GloX usage

| Concern | Code path |
| --- | --- |
| FTML client | `src/lib/ftmlClient.ts` |
| Symbol URI resolution | `src/serverFns/getSymbolUriMap.server.ts` |
| FloDown backend init | `src/lib/flodownClient.ts` sets backend on WASM init |
| sTeX export URI rewriting | `src/server/ftml/generateStexFromFtml.ts` |

## Agent constraints

**E-MATHHUB-01:** Local Symbol URIs MUST be rewritten to FloDown/MathHub HTTP URIs before sTeX export
(D-FTML-01); external MathHub URIs MUST pass through (canonicalized). Those URIs MUST NOT be persisted
into `statement` JSON.

**E-MATHHUB-02:** MathHub availability affects FTML preview of **MathHub** symbols (`/content/fragment`)
and catalog search. GloX-local **symref** hover is not a MathHub fragment (E-FTML-05). GloX SHOULD
degrade gracefully (show error) rather than persist broken MathHub symrefs silently.

**E-MATHHUB-03:** Archive path conventions (`smglom/Glox`, `courses/FAU/module-descriptions`) are
agreed with MathHub operators — do not invent new top-level archives without PI approval.

## Related docs

- [`../libraries/ftml.md`](../libraries/ftml.md)
- [`../../decisions/flodown-persist-and-boundary.md`](../../decisions/flodown-persist-and-boundary.md)
- [`../../prds/domains/curation-export.md`](../../prds/domains/curation-export.md)
- [`../../../public/flodown/README.md`](../../../public/flodown/README.md)
