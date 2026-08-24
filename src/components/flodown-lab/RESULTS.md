# FloDown lab results (2026-08-21)

Recorded from `/flodown-lab` (Curator/Admin). E6 = **DB** group: `addElement` selected DB statement verbatim.

## Results

| ID | Result | Error / notes |
| --- | --- | --- |
| **E1** Clone `test.html` | **PASS** | Now `fromUri` via `documentUri` (`http://mathhub.info?a=test&d=test&l=en`) + MathHub `symref` + `addSymbolDeclaration`. |
| **E2** `a=no/archive` | **PASS** | `http://mathhub.info?a=no/archive&d=unknown_document&l=en` (no `unknown.source`). |
| **E2** `mathhub.info?a=test&d=test&l=en` | **PASS** | Archive in `a=`, host `mathhub.info`. |
| **E2** smglom + `p=` | **PASS** | `http://mathhub.info?a=smglom/algebra&p=mod&d=Boolean-algebra&l=en` |
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
| **E7** hover same fd | **PASS** | Popup works: `addSymbolDeclaration` + `addElement(definition)` on the same live fd. |
| **E7** hover two visible fds | **PASS** | Popup works: those calls ran on the second mount. Hidden is not required. |
| **E7** hover declaration only | **PASS** (no local popup) | Expected. Declaration without a definition element is not a local hit; FloDown asks MathHub `/content/fragment`. |
| **E7** hover constructed URI | **PASS** (no local popup) | Expected. Constructed `symbolUri` with no live declaration+definition is a MathHub lookup. |
| **E8** triangle one fd, two defs | **PASS** | Both defs rendered on the visible mount. Second/third mounts unused (expected). |
| **E8** triangle.en + de (two docs) | **PASS** | Two mounts rendered correctly (en declares; de defines only). Superseded by three-docs. |
| **E8** en declares; de defines; third doc symrefs | **PASS** | Three mounts: EN declaration+def, DE def only, `triangle-sum-of-angles` symref. Shared URI; no extra `addSymbolDeclaration` on de or the third doc. |

## Inferences

### 1. Use `fromUri`, not `fromPath`

All three `fromPath` encodings panicked (`0`, `"English"`, `1`). Production must not call `fromPath` until we prove a Language value WASM accepts (likely a runtime enum on the initialized `floDown` module — `wasm_bindgen.Language` is undefined in the JS bundle). `fromUri` with `l=en` / `l=de` is sufficient.

### 2. Document URI: archive belongs in `a=`, host can be `mathhub.info`

E2 **vendor-shaped** URIs passed, including numeric `d=33995`. The earlier module-description panic was almost certainly **`fromPath`**, not “FloDown rejects `mathhub.info` document URIs.”

GloX inverted `http://{futureRepo}?a={path}&d={name}` was a tolerated encoding, not the contract. Lab no longer `fromUri`s that host.

**Document URI truth (from this lab):**

```
http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}
```

`p=` omitted when path is empty. Scratch: `http://mathhub.info?a=no/archive&d=…&l=…`.

### 3. Never send GloX short names into `addElement`

`uri: "foobar"` is not a FloDown `SymbolUri`. That is why E5-short-name and E6 fail. GloX **persists** short names (and often `definiendum` + `symdecl`) by design. FloDown only accepts:

- MathHub symbol URIs: `http://mathhub.info?a=…&p=…&m=…&s=…`
- URIs returned by `addSymbolDeclaration(name)` on a mounted block

Rewrite belongs at the **FloDown boundary**, not as a DB migration, unless we later choose to persist full URIs.

### 4. Local hover needs a live declaration and a definition element

FloDown looks up a symbol **locally** first. That only succeeds if the relevant calls ran on a still-alive `fd` (`addSymbolDeclaration` and `addElement({ type: "definition", for_symbols: [symbol], … })`). Same fd (E7 same-fd) or another mounted fd (E7 two-visible) both work. A hidden mount is only lifetime/`display:none`.

If those calls did not happen, FloDown asks MathHub:

```
GET {backend}/content/fragment?uri={symbolUri}&context={documentUri}
```

So E7 declaration-only and constructed-URI have **no local popup** — that is library behavior, not a GloX bug. Production Title/Inhalt hover needs a live defining document (D-FTML-03), not a constructed URI alone.

Vendor `test.html` still uses `http://test?…` as a sample; GloX lab and production construct only `http://mathhub.info?…` via `documentUri` / `symbolUri`.

### 5. Production `flodownUris.documentUri` inverted host is a false conclusion

Commit `4a6ebbc` switched documents to `http://{archive}?a={path}` because `fromPath` panicked. E2 shows `fromUri(http://mathhub.info?a={archive}&p={path}&d={name}&l={lang})` works. The adapter should follow E2, not the inverted workaround.

## Adapter follow-up (in progress)

- [`documentUri`](../../lib/flodownUris.ts) now emits `http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}`.
- [`rewriteStatementForFloDown`](../../lib/prepareFloDownStatement.ts) rewrites persisted JSON at the FloDown boundary (`addSymbolDeclaration`, strip `symdecl`, heading level names, paragraph definiendum → symref).
- Lab button **DB + rewrite**: select a DB sample, then run. Compare with verbatim E6.
- **E7 2026-08-24:** Local hover **PASS** when declaration + definition live on a mounted fd (same or second visible). No local popup for declaration-only or constructed URI (MathHub fallback). Lab documents use `documentUri` / `symbolUri` only.

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
