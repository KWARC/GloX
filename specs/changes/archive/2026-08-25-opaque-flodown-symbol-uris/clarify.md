# Clarify: Persist FloDown symbol URIs instead of short names

> **Phase:** Clarify — **locked**. Propose may begin (`opsx-propose`). Do **not** invent policy
> beyond this file.
>
> **Canonical guide:** [CLARIFY_AND_PROPOSE.md](../CLARIFY_AND_PROPOSE.md).

---

## Feature request (input)

Stop storing plain names (`symbolName` / short `uri` strings) in FloDown `statement` JSON and in
`FloDownBlock.declaredSymbols`. Store **entire FloDown symbol URIs**. Prefer URIs **returned by
FloDown** (`addSymbolDeclaration`) over URIs GloX constructs. Assess impact on **CRUD**, **search**,
and **FileIdentity** updates. Complexity + options + architect recommendation. Full SDD.

This **reverses** the persist half of **D-FTML-01** (short names in DB; full URIs only at the WASM
boundary).

**Scheme (requester, 2026-08-25):** GloX never mints symbol URIs; treat them as opaque; persist
FloDown’s string; fold the `Symbol` table and `declaredSymbols` into `FloDownBlock.declaredSymbolsInfo`
JSON; one-shot script (temporary mint allowed) then delete mint helpers and the old tables/columns.

---

## Restatement

GloX today persists local symbol identity as a **short name** in three places: (1) `uri` on definienda
and symrefs in `FloDownBlock.statement`, (2) `FloDownBlock.declaredSymbols[]`, (3) the `Symbol` catalog
(`symbolName` + export-identity columns, `hasConfirmed` / `confirmedById`). Application code **mints**
MathHub-shaped symbol URIs (`symbolUri` / `symbolUriFromGlox` / `canonicalizeSymbolUri`) at the WASM
boundary; persist does not store those strings. One AST path even **strips** an HTTP URI to a short
name before write.

The intended outcome: **the only local symbol identity is the opaque string FloDown returns** from
`addSymbolDeclaration`. GloX MUST NOT construct, parse, or canonicalize symbol URIs (new ADR). Server
MUST NOT run FloDown WASM (same ADR family). Interactive declare/symref persist the client-supplied
FloDown string in statement JSON. Catalog, confirmation, and search live on the **declaring**
`FloDownBlock` as `declaredSymbolsInfo` (JSON array of `{ symbolName, symbolUri, hasConfirmed,
confirmedById, confirmedBy }`). The `Symbol` table and `declaredSymbols` (`string[]`) go away after a
one-shot backfill. FileIdentity / rename is **opaque replace**: client obtains the **new** FloDown
URI for each declared name under the new identity, then the server replaces the old string with the
new string everywhere those old strings occur.

Scale is not a design constraint (internal tool, small data): uniqueness and picker search MAY scan
all blocks’ JSON.

**Human approval:** approved 2026-08-25 by requester (Lock it).

---

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | yes | `flodown-persist-and-boundary.md` (D-FTML-01…04); `ftml.md`; `lifecycle.md`; `registry.md` / `propagation.md` / `search.md`; PRD `symbols-semantics.md`; `mathhub.md`; `flodown.md` |
| ADR alignment | **conflict + planned ADRs** | **D-FTML-01** forbids persisting full symbol URIs — supersede. **D-FTML-04** names `declaredSymbols` — replace with `declaredSymbolsInfo`. **New ADR:** GloX never mints **symbol** URIs; they are opaque; persist FloDown returns only. **New ADR:** no FloDown WASM on the server. |
| Compliance | pass | No compliance PRDs; no HALT |
| Blast radius (`code`) | **large — critical areas** | Symbol uniqueness, registry/dedup, cascade, persist/export, identity moves, search picker, extract/create/update, mark-reference `createLocalSymbol`, client WASM declare |
| Blocking questions | **Q1–Q6 resolved** (2026-08-25 scheme) | Locked 2026-08-25 |

### Issues considered (not blockers at this scale)

These are real constraints of the scheme, not reasons to keep minting or the `Symbol` table.

1. **Cannot rewrite URIs by looking at `a=` / `p=` / `m=` / `s=`.** Identity move and `s=` rename
   MUST be: read `symbolUri` + `symbolName` from the affected blocks’ `declaredSymbolsInfo` → client
   (or a WASM-capable job) calls FloDown under the **new** identity → server whole-DB **opaque**
   replace `oldUri` → `newUri` and updates those JSON objects. External MathHub URIs are not in
   `declaredSymbolsInfo`, so they are not in the replace set (Q4 without parsing).
2. **No database unique index** on URI. Uniqueness (at most one live declaration of a given
   `symbolUri`) is an application scan of `declaredSymbolsInfo`. Acceptable at small scale. Concurrent
   double-declare is a rare race; Propose may use a transaction that re-reads all rows.
3. **No FK** for `confirmedById` (JSON). Same as storing a user id snapshot; `confirmedBy` is a
   display snapshot (name/email), not a Prisma relation.
4. **No catalog row without a declaring block.** Today `createLocalSymbol` (mark references) upserts
   `Symbol` with no FloDown block. v1: mark-ref MAY only store a URI that already exists in some
   `declaredSymbolsInfo` or that MathHub returned. Creating a name with no definition is dropped
   (or becomes “create a definition first”).
5. **Server cannot invent a URI for LLM/extract.** A declaration is persisted only when the client
   supplies `symbolUri` from FloDown. Extract that only has a short name MUST NOT fill
   `declaredSymbolsInfo` until that round-trip (or the user declares in the UI).
6. **`documentUri` / `fromUri` is a different string.** Preview/export still need a document URI to
   mount WASM. That is **not** catalog identity. v1 keeps assembling **document** URIs from export
   identity for `FloDown.fromUri` only. Deleted helpers are **symbol** mint/canonicalize
   (`symbolUri`, `symbolUriFromGlox`, `canonicalizeSymbolUri`, and
   `buildModuleLocalSymbolUriMap`). Do not parse stored **symbol** URIs to rebuild document URIs.
7. **Optional `alias`** on `Symbol` is not in the requester’s JSON shape. v1: add optional `alias`
   on each `declaredSymbolsInfo` object so existing aliases are not dropped; omit if null.
8. **Version history** JSON still has short names until rewritten. v1 default: rewrite **current**
   `FloDownBlock.statement` + module-description JSON + `declaredSymbolsInfo`. Historic
   `FloDownBlockVersion` rows: leave as-is unless Propose finds a cheap same-script pass.

### CRUD surface

| Workflow | Today | After this scheme |
| --- | --- | --- |
| **Create / declare** | Upsert `Symbol`; short `uri` + `declaredSymbols` name | Client sends FloDown `symbolUri` + `symbolName`; append `declaredSymbolsInfo`; persist that URI in statement |
| **Read** (preview, export) | Mint/rewrite short → URI at boundary | Pass stored opaque URI into FloDown; no GloX symbol mint |
| **Update statement** | Match short names; `updateFloDownBlockAst` may strip HTTP → name | Match opaque URI strings; never strip to a short name |
| **FileIdentity move / rename** | Columns only (JSON safe because short names) | Opaque `oldUri` → `newUri` from FloDown; update `declaredSymbolsInfo.symbolUri` |
| **Delete** | R-SYM-08 vs `Symbol` + associations | Reject delete of a `declaredSymbolsInfo` entry if any non-discarded block still **declares** that `symbolUri`; cascade still string-matches statement `uri` |
| **Propagation** | Name or MathHub URI replace | Opaque string replace |
| **Search / registry / dedup** | `Symbol` table | Scan `declaredSymbolsInfo` (`symbolName` contains; confirm flags on the declaring object) |

---

## Open questions

| Question | Status | Resolution / owner | Date |
| --- | --- | --- | --- |
| **Q1.** Catalog unique key: R-SYM-02 tuple vs FloDown URI only? | **resolved** | Unique on opaque `symbolUri` (at most one declaring `declaredSymbolsInfo` entry). `symbolName` is display/search only. Language is not in the URI. | 2026-08-25 |
| **Q2.** Who mints persist URIs? Server WASM? | **resolved** | **Nobody in GloX.** FloDown (client WASM) is the only source. Never mint; never parse. Never WASM on the server. | 2026-08-25 |
| **Q3.** Migration: dual-read forever vs one-shot? | **resolved** | One-shot script. Script MAY use a **temporary** local mint function to backfill existing prod rows, then that function and `symbolUri*` helpers are **deleted**. Drop `Symbol` and `declaredSymbols` after backfill. | 2026-08-25 |
| **Q4.** How to rewrite on FileIdentity without looking inside URIs? External MathHub? | **resolved** | Replace only the **exact** `symbolUri` strings listed on the **moved/renamed declarations**. Whole-DB replace of those strings (statements, other blocks’ symrefs, module JSON, `declaredSymbolsInfo`). Do not parse `a=`/`p=`/`m=`. External MathHub URIs are not in that list → unchanged. | 2026-08-25 |
| **Q5.** `s=` rename in v1? | **resolved** | Yes. Same engine: FloDown returns a new opaque URI; whole-DB replace. | 2026-08-25 |
| **Q6.** Mark-ref / LLM without a FloDown URI? | **resolved** | No catalog without a declaring block. No server-minted URI. Mark-ref references an existing `symbolUri` or a MathHub URI. Extract/LLM declare only after the client supplies FloDown’s string. | 2026-08-25 |

---

## Options

| Option | Product impact | Engineering cost | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| **A — WASM-only persist, keep `Symbol` table** | FloDown string in JSON; catalog still relational | **L** | Dual write name vs URI vs table | Rejected — requester drops `Symbol` |
| **B — GloX mints persist URIs** (previous lock) | Storage is `symbolUriFromGlox`; FloDown is a check | **L** | Grammar drift; we look inside URIs on move | **Superseded 2026-08-25** |
| **C — Opaque FloDown URI + `declaredSymbolsInfo` JSON** | One persist source; no mint; catalog on the declaring block | **L** (CRUD + script + delete table) | No unique index; identity move needs client FloDown; JSON confirmation | **Chosen** |
| **D — Dual-write forever** | Names + URIs + `Symbol` | **M** forever | Drift | Script only |
| **E — URI on `Symbol` only; statements stay short** | Persist FR not met | **S** | Cascade still names | Reject vs FR |

**Chosen approach:** **C** — opaque FloDown symbol URIs; `declaredSymbolsInfo` replaces `Symbol` +
`declaredSymbols`; one-shot minting script then delete mint helpers. Requester 2026-08-25.

### Architect recommendation (C)

**Complexity: Large (critical-area)** because of persist/CRUD/registry cutover and opaque identity
moves, not because of data volume.

1. **ADR: GloX never mints symbol URIs.** Delete `symbolUri`, `symbolUriFromGlox`,
   `canonicalizeSymbolUri`, `buildModuleLocalSymbolUriMap`, and any persist-path use of them after
   the backfill script. Treat stored symbol URIs as opaque; equality and replace only.
2. **ADR: no FloDown WASM on the server.** Client (or a one-off browser/admin job) is the only WASM.
3. **Supersede D-FTML-01:** persist FloDown-returned symbol URIs in `statement`.
4. **Supersede D-FTML-04 storage:** `declaredSymbolsInfo` records what this block **declares**
   (still `symdecl` / E-FTML-06). Do not infer declarations from every definiendum.
5. **Drop `Symbol` and `declaredSymbols`** after the script. Registry, dedup, search, R-SYM-08 scan
   JSON.
6. **Identity move / rename:** client map `oldUri → newUri` from FloDown; server opaque replace
   (Q4/Q5).
7. **Backfill script (Q3):** temporary mint allowed; then eliminate script + mint functions.

v1 **does not** require persisting `for_symbols` or solving Title/Inhalt hover (D-FTML-03).

---

## v1 scope

- Persist FloDown `addSymbolDeclaration` return values as `uri` in statement JSON (local declares
  and local symrefs to those declares). External MathHub URIs remain whatever the picker already
  stored (also opaque).
- `FloDownBlock.declaredSymbolsInfo`: JSON array of `{ symbolName, symbolUri, hasConfirmed,
  confirmedById, confirmedBy, alias? }`.
- Remove `Symbol` model and `declaredSymbols` after backfill.
- Uniqueness: at most one non-discarded declaration of a given `symbolUri` (app-level scan).
- FileIdentity moves **and** symbol rename: opaque whole-DB replace (Q4/Q5); no URI parsing.
- CRUD: create/update/delete/cascade/propagation on opaque strings; declaration still `symdecl`.
- Client supplies URI on every declare; server rejects declaration without `symbolUri`.
- Search/registry/dedup: scan `declaredSymbolsInfo` by `symbolName` / flags.
- Mark-ref: no new catalog entry without a declaring block (Q6).
- ADRs: never mint symbol URIs; never parse them; no server WASM; supersede D-FTML-01; replace
  D-FTML-04 column.
- Tests: persist round-trip of FloDown URI; identity move replaces only listed URIs; search by
  name; cascade matches URI; script backfill then mint helpers gone; declare without URI rejected.

---

## Non-goals and v2

### Non-goals (not in this change)

- FloDown WASM on the server.
- GloX-generated persist symbol URIs or mismatch alert vs a GloX “expected” URI (previous lock).
- Parsing stored symbol URIs (`a=`/`p=`/`m=`/`s=`) for rewrite, display, or uniqueness.
- Deleting **document** URI helpers used only for `FloDown.fromUri` mount (not catalog identity).
- Persisting `for_symbols` / backfilling empty keys.
- D-FTML-03 hover / fragment backend.
- Removing `/flodown-lab`.
- Changing MathHub search API or stemming languages.
- Restoring mark-ref “create symbol with no definition.”

### v2 (separate FR later)

- Drop any leftover dual-read of short names after the Q3 script.
- Rewrite `FloDownBlockVersion` history if product wants historic statements to follow new URIs.
- Optional: persist `for_symbols`.
- Optional: unique index if Postgres JSON unique-on-expression is wanted later (not required).

---

## PRD change decision

- [x] **PRD delta required** — new or changed binding outcomes for v1
- [ ] **No PRD change** — governed by: <!-- links -->

**Recommendation:** **PRD delta required.**

- R-SYM-01: associate declaration with FloDown URI on the **block’s** `declaredSymbolsInfo`, not a
  `Symbol` row + export-identity tuple.
- R-SYM-02: unique opaque `symbolUri`, not `(name, futureRepo, filePath, fileName, language)`.
- R-SYM-04 / R-SYM-08: confirm and guarded delete on the declaring JSON object.
- R-SYM-05: search `symbolName` inside `declaredSymbolsInfo` (scan is OK).
- Lifecycle SDD: `declaredSymbols` → `declaredSymbolsInfo`.

**Human confirmation:** requester, 2026-08-25 (Lock it) — PRD delta required.

---

## Accepted tradeoffs

| Original ask | What v1 ships instead | Why acceptable | Agreed by | Date |
| --- | --- | --- | --- | --- |
| Prefer FloDown URIs; assess GloX mint vs WASM | **Opaque FloDown URIs only**; GloX never mints; catalog JSON on the declaring block; `Symbol` dropped | Small data; one source of truth; identity move is replace-map not parse | requester | 2026-08-25 |
| (Interim lock) GloX mints persist URIs; FloDown is a check | Superseded by the row above | Requester reconsidered minting | requester | 2026-08-25 |

---

## Human decisions (required before Propose)

Complete every applicable item. **Propose must not start** until all are checked and signed.

- [x] **Restatement** — outcome matches what PM / requester actually asked for (or documented adjustment).
- [x] **Upstream audit** — compliance pass, or HALT escalated with owner; ADR conflicts resolved or superseding ADR planned.
- [x] **Open questions** — no unresolved blocking questions; deferrals have owner and date.
- [x] **Approach** — option chosen (with PM when product impact or compromise is on the table), or N/A with recommendation accepted.
- [x] **v1 scope** — shippable slice approved.
- [x] **Non-goals / v2** — deferred work explicit; nothing smuggled into v1.
- [x] **PRD change** — PRD delta vs **No PRD change** confirmed.
- [x] **Tradeoffs** — engineer + PM sign-off when the product promise changed (P2).

**Lock it — sign-off**

```
Clarify approved: requester — 2026-08-25
Propose may begin.
```
