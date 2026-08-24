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
- Preview: `src/components/FtmlPreview.tsx` — `fromUri` per preview; hidden document for local hover (D-FTML-03).
- Shared rewrite: `src/lib/prepareFloDownStatement.ts` — never pass short names to `addElement` (D-FTML-01).
- Document sTeX: `src/server/ftml/generateStexFromFtml.ts`.
- Module description sTeX: `src/lib/moduleDescriptionTex.ts`.
- Interactive demo: `public/flodown/test.html` (requires HTTP server — `file://` fails WASM CORS).
- Diagnostic lab (not production): `/flodown-lab`.

## Agent constraints

**E-FLODOW-01:** FloDown MUST be initialized (`await initFloDown()`) before any FTML preview or export
call in the browser.

**E-FLODOW-02:** `setBackendUrl` MUST point at the configured MathHub FTML server before mounting
content. Hover on **MathHub** symbols uses `{backend}/content/fragment`. Hover on **GloX-local**
symbols is not served there; see E-FTML-05 and D-FTML-03.

**E-FLODOW-03:** Updating the WASM bundle requires replacing all three artifacts together and
verifying `test.html` and GloX preview flows — partial updates break serialization.

**E-FLODOW-04:** Production MUST use `fromUri` (D-FTML-02). Keep a JavaScript reference to each
mounted FloDown document until unmount, or WASM frees it and the preview disappears.

**E-FLODOW-05:** Each visible preview MUST use a distinct document URI (`d=` unique per `docId`) so
WASM does not intern Title, Inhalt, Lernziele, and definition boxes into one document.

## Related docs

- [`../../../public/flodown/README.md`](../../../public/flodown/README.md) — detailed API reference
- [`../libraries/ftml.md`](../libraries/ftml.md)
- [`../../decisions/flodown-persist-and-boundary.md`](../../decisions/flodown-persist-and-boundary.md)
- [`./mathhub.md`](./mathhub.md)
