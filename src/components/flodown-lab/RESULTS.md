# FloDown lab results (2026-08-21)

Recorded from `/flodown-lab` (Curator/Admin). E6 = **DB** group: `addElement` selected DB statement verbatim.

## Results

| ID | Result | Error / notes |
| --- | --- | --- |
| **E1** Clone `test.html` | **PASS** | `fromUri("http://test?a=test&d=test&l=en")` + MathHub `symref` + `addSymbolDeclaration` return value in the same block. |
| **E2** UnknownDocument | **PASS** | `http://unknown.source?a=no/archive&d=unknown_document&l=en` |
| **E2** `mathhub.info?a=test&d=test&l=en` | **PASS** | Archive in `a=`, host `mathhub.info`. |
| **E2** smglom + `p=` | **PASS** | `http://mathhub.info?a=smglom/algebra&p=mod&d=Boolean-algebra&l=en` |
| **E2** GloX inverted host | **PASS** | `http://courses/FAU/module-descriptions?a=modules&d=33995&l=de` — accepted, but not the vendor grammar. |
| **E2** vendor GloX + `d=33995` | **PASS** | `http://mathhub.info?a=courses/FAU/module-descriptions&p=modules&d=33995&l=de` |
| **E2** vendor GloX + `d=mod33995` | **PASS** | Same as above with a non-numeric name. |
| **E3** `fromPath(..., lang=0)` | **FAIL** | `called Result::unwrap_throw() on an Err value` |
| **E3** `fromPath(..., lang="English")` | **FAIL** | same WASM panic |
| **E3** `fromPath(GloX archive, modules, 33995, lang=1)` | **FAIL** | same WASM panic |
| **E4** local symbol via `addSymbolDeclaration` only | **PASS** | No concatenated `futureRepo`. |
| **E5** definition + paragraph in **one** `fd` | **PASS** | Hover/export work when `uri` is the declaration return value. |
| **E5** two **visible** `fd`s | **PASS** | Hidden mount is not required if both instances stay alive. |
| **E5** **hidden** second `fd` | **PASS** | Current GloX pattern also works (GC/lifetime, not URI grammar). |
| **E5** short name `uri: "foobar"` | **FAIL** | Confirmed 2026-08-23: `data did not match any variant of untagged enum Inline` |
| **E6** DB statement `addElement` verbatim | **FAIL** (many rows) | `Inline` or `InlineInDefinition` serde mismatch |
| **E7** hover same fd | *still run* | Control: definition body on the same visible document. Needed to confirm popup vs backend fetch. |
| **E7** hover two visible fds | *still run* | Definition on second **visible** mount. Needed to confirm popup without hidden. |
| **E7** hover declaration only | **FAIL** | No popup. WASM `GET https://mathhub.info/content/fragment?uri=http://test?a=test&m=hover_decl_only&s=foobar&context=http://test?a=test&d=hover_decl_only&l=en` → **404**. Console: `no definition for element found`. |
| **E7** hover constructed URI | **FAIL** | No popup (production-like). `GET https://mathhub.info/content/fragment?uri=http://mathhub.info?a=test&p=mod&m=definition_block&s=foobar&context=http://unknown.source?a=no/archive&d=hover_known_uri&l=en` → **404**. Same `no definition for element found`. |
| **E8** triangle one fd, two defs | *run on `/flodown-lab`* | One `addSymbolDeclaration("triangle")`. Definienda “triangle” and “Dreieck” share that URI. Check sTeX: one `\symdecl`, two `sdefinition`. |
| **E8** triangle.en declares; triangle.de defines only | *run on `/flodown-lab`* | Visible = en, second mount = de. de must not call `addSymbolDeclaration`. sTeX for de should reuse the EN URI, not mint `m=triangle` from `l=de` as a new declaration. |

## Inferences

### 1. Use `fromUri`, not `fromPath`

All three `fromPath` encodings panicked (`0`, `"English"`, `1`). Production must not call `fromPath` until we prove a Language value WASM accepts (likely a runtime enum on the initialized `floDown` module — `wasm_bindgen.Language` is undefined in the JS bundle). `fromUri` with `l=en` / `l=de` is sufficient.

### 2. Document URI: archive belongs in `a=`, host can be `mathhub.info`

E2 **vendor-shaped** URIs passed, including numeric `d=33995`. The earlier module-description panic was almost certainly **`fromPath`**, not “FloDown rejects `mathhub.info` document URIs.”

GloX inverted `http://{futureRepo}?a={path}&d={name}` also passed, so it is a *tolerated* encoding, not the documented one ([`public/flodown/test.html`](../../../public/flodown/test.html): `http://test?a=test&d=test&l=en`, `UnknownDocument` with archive in `a=`).

**Document URI truth (from this lab):**

```
http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}
```

`p=` omitted when path is empty. Scratch: `http://unknown.source?a=no/archive&d=…&l=…`.

### 3. Never send GloX short names into `addElement`

`uri: "foobar"` is not a FloDown `SymbolUri`. That is why E5-short-name and E6 fail. GloX **persists** short names (and often `definiendum` + `symdecl`) by design. FloDown only accepts:

- MathHub symbol URIs: `http://mathhub.info?a=…&p=…&m=…&s=…`
- URIs returned by `addSymbolDeclaration(name)` on a mounted block

Rewrite belongs at the **FloDown boundary**, not as a DB migration, unless we later choose to persist full URIs.

### 4. Hover is a MathHub fragment fetch, not a local-only tooltip

E7 **declaration-only** and **constructed URI** both fail hover. FloDown does not invent a popup from `addSymbolDeclaration` or from a well-formed `SymbolUri`. On hover it requests:

```
GET {backend}/content/fragment?uri={symbolUri}&context={documentUri}
```

GloX sets `backend` to `https://mathhub.info` ([`src/lib/flodownClient.ts`](../../../lib/flodownClient.ts)). Lab `test` / `unknown.source` symbols are not on MathHub, so the response is 404 and WASM logs `no definition for element found`.

That matches production Title/Inhalt local-symref hover after the cleanup: rewrite emits a constructed URI, no definition body is mounted, MathHub has no GloX-local symbol.

**Still required to close “can hover work without hidden blocks”:** run **E7 hover same fd** and **E7 hover two visible fds**. If same-fd popups without a network 404, a live `sdefinition` on a mounted `fd` is the local source. If two-visible also popups, hidden is only lifetime/`display:none`, not a FloDown requirement. If both still 404 MathHub, even a mounted local definition is ignored and local hover cannot work until a backend serves `/content/fragment` for those URIs.

Vendor `test.html` comment after adding a definition on the **same** `fd`: “which should now show on hover.” That experiment is E7 same-fd.

### 5. Production `flodownUris.documentUri` inverted host is a false conclusion

Commit `4a6ebbc` switched documents to `http://{archive}?a={path}` because `fromPath` panicked. E2 shows `fromUri(http://mathhub.info?a={archive}&p={path}&d={name}&l={lang})` works. The adapter should follow E2, not the inverted workaround.

## Adapter follow-up (in progress)

- [`documentUri`](../../lib/flodownUris.ts) now emits `http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}`.
- [`rewriteStatementForFloDown`](../../lib/prepareFloDownStatement.ts) rewrites persisted JSON at the FloDown boundary (`addSymbolDeclaration`, strip `symdecl`, heading level names, paragraph definiendum → symref).
- Lab button **DB + rewrite**: select a DB sample, then run. Compare with verbatim E6.
- **E7 2026-08-23:** declaration-only and constructed-URI hovers **FAIL** (MathHub `/content/fragment` 404). Same-fd / two-visible hover still need a recorded run.

Still do not persist rewritten URIs.

## Legacy DB rows (2026-08-21)

Two `smglom/software` definition rows failed rewrite with `missing field for_symbols`. They are **legacy GloX persist**, not FloDown-random corruption:

| Row | What is wrong vs current persist | Still a valid GloX concept? |
| --- | --- | --- |
| `ppp` (`9998cf8d-…`) | `type: definition` with **no** `for_symbols` key; no definiendum; `declaredSymbols: []` | Incomplete definition (block type chosen, never declared a symbol). Truncated text (`he LNM…`) is typical extraction noise. |
| `def3` (`d264c18f-…`) | Same missing `for_symbols`; has definiendum `production bottlenecks` but **`declaredSymbols` is empty** | Structurally a definition; the column is stale vs JSON. Odd dual use of the same name as symref + definiendum looks like extraction/LLM junk, not a broken object graph. |

Current `sanitizeStatementForPersist` always writes `for_symbols: []` and export fills it from `declaredSymbols`. FloDown WASM requires the **key**. Rewrite now defaults `for_symbols` to definiendum URIs or `[]`.

## What this does *not* change

- No Prisma schema or stored `statement` JSON.
- No need for a backfill script for these results.
- Do not treat inverted host as “wrong for WASM” — it works — treat it as **the wrong contract to keep encoding**.
