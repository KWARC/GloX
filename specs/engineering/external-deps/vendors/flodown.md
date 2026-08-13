# External fact: FloDown

**Kind:** Vendor (`E-FLODOW-*`) — WASM binary and API shipped in-repo.

## What it is

FloDown is a browser-side WebAssembly library (compiled from Rust) for authoring, rendering, and
serializing FTML and sTeX. GloX vendors the build under `public/flodown/`.

## Artifacts

| File | Role |
| --- | --- |
| `public/flodown/flodown.js` | JS loader and API bindings |
| `public/flodown/flodown_bg.wasm` | WASM binary (~3.5 MB) |
| `public/flodown/flodown.d.ts` | TypeScript types |

## GloX integration

- Client: `src/lib/flodownClient.ts` — lazy-loads `/flodown/flodown.js`, sets MathHub backend URL.
- Server export: `src/server/ftml/generateStexFromFtml.ts` — may use FloDown patterns for sTeX.
- Interactive demo: `public/flodown/test.html` (requires HTTP server — `file://` fails WASM CORS).

## Agent constraints

**E-FLODOW-01:** FloDown MUST be initialized (`await initFloDown()`) before any FTML preview or export
call in the browser.

**E-FLODOW-02:** `setBackendUrl` MUST point at the configured MathHub FTML server before mounting
content.

**E-FLODOW-03:** Updating the WASM bundle requires replacing all three artifacts together and
verifying `test.html` and GloX preview flows — partial updates break serialization.

## Related docs

- [`../../../public/flodown/README.md`](../../../public/flodown/README.md) — detailed API reference
- [`../vendors/mathhub.md`](./mathhub.md)
