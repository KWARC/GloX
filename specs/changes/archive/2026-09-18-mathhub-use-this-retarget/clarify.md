# Clarify: MathHub “Use this” on Deduplication (drop local declaration)

> **Phase:** Clarify — **locked**. Propose may begin (`opsx-propose`). Do **not** invent
> policy beyond this file.
>
> **Canonical guide:** [CLARIFY_AND_PROPOSE.md](../CLARIFY_AND_PROPOSE.md).
>
> **Mode:** Full SDD. Critical areas: symbol propagation & deduplication; FloDown block lifecycle
> (versioning); role gates if v1 closes BUG-003.

---

## Feature request (input)

Requester 2026-09-18 (this conversation), after an audit of current “Use this” behavior.

When a curator marks a local symbol as the same as a MathHub hit (**Use this** → Confirm replace):

1. The **three product expectations** must hold:
  - The **local declaration is dropped** (do not re-declare a symbol that already exists on MathHub).
  - Every **symref and definiendum** that pointed at that local URI now points at the MathHub URI,
  including **same-block** refs (not only other FloDown blocks).
  - The **extracted definition is kept**. Only identity/declaration changes.
  - **Version history is not to be updated** (see Open question Q1 — this conflicts with
  R-FDB-02 / R-SYM-03).
2. The **Symbol Replacement** list must include the **same block** that declares the symbol, not
  only other referencing definitions.
3. Treating the declaring block like every other referencing block should **simplify** the
  two-step client path (primary `replaceSemantic` then `applySymbolPropagation`).
4. **Confirmed not-a-duplicate** cards move to the **bottom** of the Deduplication list, under a
   dedicated section title.
5. Symrefs and definienda on **module description** Title, Inhalt, and Lernziele statements
   (`titleStatement`, `inhaltStatement`, `lernzieleStatement`) MUST be rewritten the same way as
   FloDown definition blocks. (Module **definition** FloDown blocks are already in the FloDown
   scan; this item is the three statement JSON columns, which today’s `applySymbolPropagation`
   does not touch.)

Also discuss **page mark references** and other deviations from the audit (not all must be v1).

---



## Restatement

Deduplication **Use this** means: this local symbol is the MathHub concept the curator picked.
GloX **rewrites current FTML** so definienda and symrefs that used the local URI now use the
MathHub URI: every FloDown block statement that mentions that URI (including the defining block
and **DISCARDED** blocks) **and** every `ModuleDescription` Title / Inhalt / Lernziele statement
that mentions that URI. It **removes the local declaration record** so export/preview no longer
emit a second `\symdecl*` for a concept MathHub already owns. Definition **FloDown blocks and
their text stay**; module description rows stay.

Confirm replace **lists** that blast radius (not silent): FloDown hits including the defining
block; discarded hits marked with a **Discarded** chip (or equivalent); module hits labeled by
module id + Title / Inhalt / Lernziele. One apply path updates the whole set. For FloDown
blocks, v1 **appends** `FloDownBlockVersion` rows and bumps `currentVersion` (Q1 = B); it does
**not** rewrite historic version JSON. Module statement JSON has no version table.

**NOT A DUPLICATE** remains a separate action (R-SYM-04). The Deduplication page lists
unconfirmed declarations first, then a section titled **Confirmed not a duplicate**. Confirm
replace and confirm/undo are **Curator/Admin** (Q4). Page mark references are unchanged (Q2).

**Human approval:** restatement updated 2026-09-18 from Q1–Q6 (requester). 

---



## Upstream audit


| Check                 | Result                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specs read            | yes                   | [`symbols-semantics.md`](../prds/domains/symbols-semantics.md) R-SYM-03/04/06/08/16; [`propagation.md`](../engineering/features/symbols-semantics/propagation.md) S-SYM-03, S-SYM-06a; [`registry.md`](../engineering/features/symbols-semantics/registry.md) S-SYM-10 (identity move already rewrites module statement JSON); [`flodown-blocks.md`](../prds/domains/flodown-blocks.md) R-FDB-02/04; [`module-descriptions.md`](../prds/domains/module-descriptions.md) R-MOD-04, R-MOD-21; [`glox-features.md`](../product/glox-features.md); domain dictionary `symbol_propagation`, `mark_reference` |
| ADR alignment         | pass                  | Opaque URIs (D-FTML-05 / R-SYM-18): replace by **whole-string URI equality** only. No mint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Compliance            | pass                  | No compliance PRDs. No HALT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Blast radius (`code`) | **large — critical**  | `SymbolPropagation.server.ts` (FloDown only today), `convertLocalSymbolToMathHub.ts`, `applyOpaqueUriReplacements.ts` (precedent for module JSON), `floDownBlockDeclaredSymbols.ts`, `SymbolPropagationDialog.tsx`, `Duplicate.tsx`, `Deduplication.tsx`, Semantic Panel “Use this”, leftover `declaredSymbolsInfo` |
| Blocking questions    | **none**              | Q1–Q6 resolved 2026-09-18 |


**Q1 resolved = B:** Keep R-FDB-02 / R-SYM-03 (append version rows on FloDown statement rewrite). Interpret the original “do not update version history” as **do not rewrite historic version JSON** (already symbols PRD OOS).

---



## Open questions


| Question                                                                                                                                                                                                                                   | Status | Resolution / owner                                                              | Date |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------- | ---- |
| **Q1.** Version history on Confirm replace: (A) no new `FloDownBlockVersion` rows and no `currentVersion` bump; (B) keep appending version rows (audit) but never rewrite old version JSON; (C) overwrite the latest version row in place. | resolved | **B** — append version rows; never rewrite historic JSON. Requester. | 2026-09-18 |
| **Q2.** Page mark references: leave as-is (v2), or rewrite `symbolName` when it matches the dropped local display name?                                                                                                                    | resolved | **Leave as-is** (v2 curator pass). Requester. | 2026-09-18 |
| **Q3.** Rewrite / list `DISCARDED` blocks that still mention the local URI?                                                                                                                                                                | resolved | **Rewrite them.** List them with a Discarded chip (or equivalent). Requester. | 2026-09-18 |
| **Q4.** Close BUG-003 for this mutation in v1 (Curator/Admin only on Confirm replace + confirm/undo)?                                                                                                                                      | resolved | **Yes.** Requester. | 2026-09-18 |
| **Q5.** Trailing section title for confirmed-not-duplicate cards?                                                                                                                                                                          | resolved | **"Confirmed not a duplicate"**. Requester. | 2026-09-18 |
| **Q6.** Show Title/Inhalt/Lernziele hits in the Symbol Replacement **list**, or rewrite them silently?                                                                                                                                     | resolved | **List them** (not silent). Requester. | 2026-09-18 |


---



## Options



### Q1 — Version history (genuine fork)


| Option                                                | Product impact                                                                                         | Engineering cost                                                                                                                            | Risk                                                                                                                              | Recommendation                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **A — No version rows** (literal FR)                  | Confirm replace is invisible in the version timeline; Undo-via-history cannot restore pre-MathHub URIs | Small (delete existing create-version in `applySymbolPropagation`; must **not** go through `updateFloDownBlockAst` if that always versions) | **High:** current statement diverges from latest `FloDownBlockVersion`. Contradicts R-FDB-02 / R-SYM-03 (PRD exception required). | No, unless PM explicitly accepts a lifecycle exception and documents that versions are not a complete audit of URI identity |
| **B — Append versions, do not rewrite historic JSON** | Timeline shows “this block was retargeted to MathHub”; old versions keep the local URI                 | Low (already implemented for other blocks)                                                                                                  | Low. Matches R-FDB-02 / R-SYM-03. Matches symbols PRD OOS on historic JSON.                                                       | **Yes** — interpret “do not update version history” as “do not rewrite old version snapshots” unless Q1 locks A             |
| **C — Overwrite latest version row**                  | Latest snapshot matches current; older snapshots untouched; `currentVersion` unchanged                 | Medium                                                                                                                                      | Odd semantics (silent mutation of an already-recorded version); still a PRD exception                                             | No                                                                                                                          |


**Chosen approach:** Q1 = **B** (requester 2026-09-18). Same-block + module JSON + discarded rewrite as below. Confirmed section title **Confirmed not a duplicate**. Role gate Curator/Admin.

### Same-block = other blocks (no product fork)

**N/A — single recommended path.** Confirm replace is **one server transaction** that **iterates every `FloDownBlock` and every `ModuleDescription` in the DB** (same idea as identity-move `applyOpaqueUriReplacements`). For each row, if the local URI appears in statement JSON (or title/inhalt/lernziele), rewrite definienda and symrefs to the MathHub URI. Then **remove** that URI from the declaring block’s `declaredSymbolsInfo`. FloDown hits get a version row (Q1 = B).

There is **no** client-supplied ID list on apply. v1 has no per-block opt-out, so trusting `selectedFloDownBlockIds` is extra surface (omit a row → dangling local URI; pass extra IDs → unnecessary writes). The replacement **modal** still needs a **read** that scans the same tables so the curator sees FloDown hits (Discarded chip) and module Title/Inhalt/Lernziele hits. Apply **re-scans** in the transaction; it does not replay the list the UI showed.

`applySymbolPropagation` today exists only as that mutation handler: it already full-scans to *find* candidates, then updates **only the IDs the client sent**, and the declaring block is updated on a **different** path (`replaceSemantic`). That split is accidental, not required.

**Handler names (v1, code/SDD — not a product fork):** Today’s names describe the old shape (FloDown-only, client ID list, “propagation”). Prefer names that match the scan + retarget:

| Today | v1 |
| --- | --- |
| `getFloDownBlocksReferencingSymbol` | `listLocalSymbolUriHits` — read: every FloDown block and module Title/Inhalt/Lernziele that contains the local URI (status included so the UI can chip Discarded) |
| `applySymbolPropagation` | `replaceLocalSymbolWithMathHub` — write: same scan in a transaction; rewrite URIs; drop the local declaration; version FloDown rows. Inputs: local URI + MathHub URI only (no ID list) |

Keep AST helper `propagateUriInAst` / `convertLocalSymbolToMathHub.ts` (string replace in JSON). Optional same-PR rename of the **sibling** MathHub→local pair (`getFloDownBlocksReferencingMathHubUri` / `applyMathHubReplacement`) only if that file is already open; not a new product rule.

Drop the client’s special primary `replaceSemantic` (`symdecl: false`) before bulk apply. Same apply from Dedup and Semantic Panel declared-definiendum **Use this**.

**Module versions:** Title/Inhalt/Lernziele have **no** `FloDownBlockVersion`. v1 just overwrites those JSON columns. Q1 applies only to FloDown **definition** blocks.

**Duplicate module rows (R-MOD-21):** Alias rows must not hold curated Inhalt/Lernziele. Still scan/rewrite all three fields (cheap; no-op if the URI is absent). Do not skip canonical rows.

Title/Inhalt/Lernziele are usually paragraphs (symrefs). R-MOD-04 also allows definienda on those statements — rewrite both node types.

### Deduplication confirmed section (no product fork)

**N/A — single recommended path.** Split the page: unconfirmed declarations (current grouping by display name), then a section titled **Confirmed not a duplicate** with `hasConfirmed === true` cards. **NOT A DUPLICATE** stays on unconfirmed cards only (already disabled when confirmed). Undo stays on confirmed cards.

---



## Discussion — mark references and other deviations



### Page mark references (Q2)

Mark references are **not** FTML `symref`s. They are page-level index mentions (`MarkReference.symbolName` + `verbalization`) for LaTeX index export. The symbols PRD already lists them as **out of scope** of symbol identity.

They do **not** store the opaque local symbol URI. A DB pick stores the catalog **display name**; a MathHub pick stores the **URI string** in `symbolName`. There is no FK. After Use this:

- Index lines that used the local **name** still print that name. They do not keep a live pointer at the dropped declaration.
- Matching “the same” mark refs by display name is **unsafe** (homonyms — the whole reason Deduplication exists).
- Rewriting to the MathHub URI would mix URI strings into an index that is otherwise often a human-readable name.

**Recommendation:** **non-goal / v2.** Do not rewrite or delete mark references in this change. If index quality matters later, a separate FR can offer a curator review of mark refs whose `symbolName` equals the dropped display name.

### Module Title / Inhalt / Lernziele (FR item 5)

These are **not** FloDown definition blocks. They live on `ModuleDescription` as three FTML JSON columns. R-MOD-04 allows definienda and symrefs there. Today **Use this** never scans them; **export-identity move** already rewrites them (`applyOpaqueUriReplacements`). Leaving them on the old local URI after dropping the declaration would leave dangling refs in module TeX.

Module **definition** extracts are `FloDownBlock` rows (`moduleDescriptionId` set) and are covered by the FloDown scan. Do not double-count them as “statements.”

They have **no** version history; Q1 does not apply.

### Other audit deviations — in v1 vs not


| Deviation                                                                | v1?              | Notes                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leftover `declaredSymbolsInfo` after Use this                            | **yes**          | Core FR: drop declaration                                                                                                                                                          |
| Same-block symrefs not rewritten                                         | **yes**          | Core FR                                                                                                                                                                            |
| Replacement list omits declaring block                                   | **yes**          | Core FR                                                                                                                                                                            |
| Definition block deleted                                                 | **no change**    | Already kept                                                                                                                                                                       |
| Two-step primary replace + bulk apply                                    | **yes**          | Collapse to one apply                                                                                                                                                              |
| Confirmed cards mixed with unconfirmed                                   | **yes**          | Trailing section                                                                                                                                                                   |
| Fragile definiendum pick (`uri === symbolName` then text then `[0]`)     | **yes if cheap** | Apply should key off the **declaration URI** (`declaredSymbolsInfo.symbolUri` / catalog `id`), not the first definiendum. Search hit is still the MathHub URI the curator clicked. |
| Historic version **JSON** rewrite                                        | **non-goal**     | Already PRD OOS; keep                                                                                                                                                              |
| `DISCARDED` included in scan                                             | **yes**          | Rewrite + list with Discarded chip                                                                                                                                                 |
| Role gate missing on propagation (BUG-003)                               | **yes**          | Curator/Admin on Confirm replace and confirm/undo                                                                                                                                  |
| Document ownership (R-FDB-08) on *other* users’ blocks                   | **non-goal**     | Glossary-wide rewrite is the point of Deduplication; restricting to owned documents would leave stray local URIs. Do not expand BUG-001 in this FR.                                |
| Candidate list is all-or-nothing (no uncheck)                            | **non-goal**     | Keep “all will be updated” unless requester wants per-block opt-out (creep).                                                                                                       |
| Dedup page lists **all** live declarations, not only “likely duplicates” | **non-goal**     | Unrelated ranking/filter FR.                                                                                                                                                       |
| Semantic Panel **Use this** on a declared definiendum                    | **same v1 path** | Same dialog today; unifying apply keeps one behavior. One-block MathHub retarget when the URI is **not** a local declaration stays a simple replace (not this FR).                 |
| Module Title/Inhalt/Lernziele JSON not rewritten                         | **yes**          | FR item 5                                                                                                                                                                          |
| Module statement hits omitted from replacement list                      | **yes**          | List them (not silent)                                                                                                                                                             |


---



## v1 scope

- Confirm replace (Deduplication and Semantic Panel declared-definiendum path): rewrite **current** FTML — all definienda and symrefs with that local URI on FloDown blocks (including declaring and **DISCARDED**) **and** on ModuleDescription Title / Inhalt / Lernziele JSON.
- Append FloDown version rows / bump `currentVersion` (Q1 = B); do not rewrite historic version JSON.
- Remove the matching `declaredSymbolsInfo` object on the declaring block in the **same** transaction.
- Keep FloDown definition blocks and module description rows; keep definition text.
- Symbol Replacement **lists** FloDown hits (Discarded chip when status is DISCARDED) and module statement hits (module id + Title/Inhalt/Lernziele). Not silent.
- Single server apply: iterate all FloDown blocks and module descriptions; no client ID list; no primary-only `replaceSemantic` for this flow.
- Deduplication UI: unconfirmed list, then section **Confirmed not a duplicate**.
- Curator/Admin only for Confirm replace and confirm/undo (Q4).
- PRD/SDD deltas: drop-declaration; same-block rewrite; module statements in R-SYM-03; discarded included; role gate; confirmed section; Q1 = B (still version FloDown blocks).



## Non-goals and v2



### Non-goals (not in this change)

- Deleting or rewriting **page mark references**.
- Rewriting **historic** `FloDownBlockVersion.statement` JSON.
- Per-block opt-out in the replacement modal.
- Dedup ranking / “only show likely duplicates”.
- Closing R-FDB-08 / BUG-001 ownership on all FloDown mutations.
- Changing **NOT A DUPLICATE** semantics (still R-SYM-04 on the declaration record). After a successful Use this the declaration is **gone**, so there is nothing left to confirm on that URI.



### v2 (separate FR later)

- Curator pass over mark references whose display name matched a dropped local symbol.
- Optional: filter Deduplication to unconfirmed-only by default (v1 already moves confirmed to the bottom; hiding them entirely can wait).

---



## PRD change decision

- [x] **PRD delta required** — drop local declaration; rewrite same-block + discarded FloDown + module Title/Inhalt/Lernziele; list all hits (Discarded chip; module labels); confirmed section title; Curator/Admin. R-SYM-03 widened. **Q1 = B:** still append FloDown versions; do not rewrite historic JSON. R-FDB-04 unchanged (discarded still excluded from export queues).
- [ ] **No PRD change**

**Human confirmation:** requester 2026-09-18 (this conversation).

---



## Accepted tradeoffs


| Original ask | What v1 ships instead | Why acceptable | Agreed by | Date |
| --- | --- | --- | --- | --- |
| “Version history is not to be updated” | Append new `FloDownBlockVersion` rows; never rewrite old version JSON | Keeps latest snapshot aligned with current statement (R-FDB-02 / R-SYM-03) | requester | 2026-09-18 |
| Engineer default: skip DISCARDED | Rewrite discarded statements; list with Discarded chip | Avoids dangling local URIs if the block is un-discarded; curator still sees status | requester | 2026-09-18 |

---



## Human decisions (required before Propose)

- [x] **Restatement** — updated 2026-09-18 from Q1–Q6.
- [x] **Upstream audit** — compliance pass; no ADR conflict.
- [x] **Open questions** — Q1–Q6 resolved 2026-09-18.
- [x] **Approach** — Q1 = B; discarded rewrite + chip; list module hits; Curator/Admin; confirmed section title.
- [x] **v1 scope** — as in v1 scope section.
- [x] **Non-goals / v2** — mark references unchanged; historic JSON not rewritten.
- [x] **PRD change** — PRD delta required (confirmed 2026-09-18).
- [x] **Tradeoffs** — Q1 B vs original “no version history” wording (P2).

**Lock it — sign-off**

```
Clarify approved: Abhishek Chugh — 2026-09-18
Propose may begin.
```

