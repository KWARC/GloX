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

**E-MATHHUB-01:** Local Symbol URIs MUST be rewritten to MathHub HTTP URIs before FloDown sTeX export;
external MathHub URIs MUST pass through unchanged.

**E-MATHHUB-02:** MathHub availability affects FTML preview and symref resolution — GloX SHOULD degrade
gracefully (show error) rather than persist broken symrefs silently.

**E-MATHHUB-03:** Archive path conventions (`smglom/Glox`, `courses/FAU/module-descriptions`) are
agreed with MathHub operators — do not invent new top-level archives without PI approval.

## Related docs

- [`../libraries/ftml.md`](../libraries/ftml.md)
- [`../../prds/domains/curation-export.md`](../../prds/domains/curation-export.md)
- [`../../../public/flodown/README.md`](../../../public/flodown/README.md)
