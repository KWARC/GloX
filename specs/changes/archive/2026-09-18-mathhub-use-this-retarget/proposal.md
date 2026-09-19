# Proposal: MathHub Use this — drop local declaration and retarget all current FTML

> **Layer:** *what* — intent, scope, and optional **PRD delta**. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical PRDs until Archive.
>
> **Policy:** `proposal.md` records *what* (including an optional PRD delta). `design.md` records *how*
> (the SDD delta). `tasks.md` records *do* — atomic Apply steps only, with no new requirements.
>
> **Prerequisites:** Signed [`clarify.md`](./clarify.md) (**Lock it**). Complete
> [Clarify](./CLARIFY_AND_PROPOSE.md#phase-a--clarify) before drafting this file.

---

## Intent and scope

Deduplication **Use this** (Confirm replace) currently retargets some definienda to a MathHub URI
but leaves the **local declaration** in place, skips **same-block** symrefs, skips **module**
Title/Inhalt/Lernziele JSON, and updates only client-selected FloDown IDs. That re-declares a
concept MathHub already owns and leaves dangling local URIs.

v1: Confirm replace means this local symbol **is** the MathHub concept. The system rewrites
**current** definienda and symrefs that used that local URI (every FloDown block including the
defining and discarded blocks; every module Title/Inhalt/Lernziele statement), **drops** the local
declaration, and **keeps** definition blocks and module rows. The curator **sees** the blast radius
before confirm. FloDown **version rows are appended**; historic version JSON is not rewritten.

Locked restatement: [`clarify.md`](./clarify.md) (Lock it 2026-09-18).

## Non-goals

- Deleting or rewriting **page mark references**.
- Rewriting **historic** `FloDownBlockVersion.statement` JSON.
- Per-block opt-out in the replacement modal.
- Filtering Deduplication to “likely duplicates” only.
- Closing document-ownership gaps (R-FDB-08 / BUG-001) on glossary-wide rewrite.
- Changing **NOT A DUPLICATE** semantics (R-SYM-04). After a successful Use this the declaration is
  gone.
- Silent rewrite of module statements (Q6: list them).
- Skipping discarded FloDown statements (Q3: rewrite and chip in the list).
- Client-supplied FloDown ID lists on the write path.

## Iteration plan

### v1 (this change)

- One Curator/Admin write: local URI + MathHub URI; scan every FloDown block and every
  ModuleDescription; rewrite matches; drop declaration; version changed FloDown blocks.
- One Curator/Admin read for Symbol Replacement: same scan, listed (not silent); Discarded chip;
  module id + Title/Inhalt/Lernziele labels; include defining block.
- Deduplication page: unconfirmed first; section **Confirmed not a duplicate**.
- Dedup and Semantic Panel declared-definiendum **Use this** share that write path.
- PRD/SDD deltas as below.

### v2 (after user feedback — separate FR)

- Curator pass over mark references whose display name matched a dropped local symbol.
- Optional: hide confirmed cards entirely (v1 only moves them to the bottom).

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | done | Signed `clarify.md`; `symbols-semantics.md` R-SYM-03/04/06; `propagation.md` S-SYM-03/06a; `registry.md`; `flodown-blocks.md` R-FDB-02/04; `module-descriptions.md` R-MOD-04/21; D-FTML-05 / R-SYM-18 |
| ADR alignment | pass | Opaque whole-string URI replace only. No mint. |
| Compliance | pass | No compliance PRDs |
| Blocking questions | none | Q1–Q6 locked; Lock it 2026-09-18 |

## PRD delta

Fold into [`specs/prds/domains/symbols-semantics.md`](../prds/domains/symbols-semantics.md) at
Archive. Do not edit the canonical PRD until then.

**Replace R-SYM-03** (widen beyond FloDown-only “propagation”):

**R-SYM-03 (Event-Driven):** WHEN a Curator or Admin confirms replacing a local symbol URI with a
MathHub URI, the system MUST replace that local URI with the MathHub URI on every **current**
FloDown block statement that contains it (definienda and symrefs; including discarded blocks and
the declaring block) and on every ModuleDescription `titleStatement`, `inhaltStatement`, and
`lernzieleStatement` that contains it, and MUST append a version history record for each **changed
FloDown block**. The system MUST NOT rewrite historic `FloDownBlockVersion` statement JSON.

**Upstream intent (Q1 = B):** Version rows stay; old snapshots keep the local URI.

**R-SYM-20 (Event-Driven):** WHEN that confirm replace succeeds, the system MUST remove the local
declaration record for that URI and MUST keep the FloDown blocks and ModuleDescription rows that
held the rewritten statements.

**Rationale:** MathHub already declares the concept; a second local `\symdecl*` is false identity.
The glossary text stays.

**R-SYM-21 (Event-Driven):** WHEN a Curator or Admin opens Confirm replace for that local URI, the
system MUST list every FloDown block and every Title/Inhalt/Lernziele statement that currently
contains the local URI (including the declaring block). WHILE a listed FloDown block has status
DISCARDED, the system MUST indicate Discarded on that list entry. The system MUST NOT apply the
rewrite without that list.

**R-SYM-22 (Event-Driven):** WHEN a Curator or Admin views Deduplication, the system MUST list
unconfirmed local declarations first and MUST list declarations with the confirmed-not-duplicate
flag under a section titled **Confirmed not a duplicate**.

**Amend R-SYM-06:** Extractor-role users MUST NOT confirm Deduplication **Use this** / Confirm
replace (same class as confirm-not-duplicate).

R-FDB-04 is unchanged: discarded blocks stay out of curation **export queues**.

R-FDB-02 / existing R-SYM-03 versioning: v1 **keeps** appending FloDown versions (Clarify Q1 = B).

## Upstream links

| Kind | Link |
| --- | --- |
| Compliance | N/A |
| Commercial | N/A |
| Product context (orientation) | [`glox-features.md`](../product/glox-features.md) — Symbols & deduplication |
| Existing PRDs | [`symbols-semantics.md`](../prds/domains/symbols-semantics.md), [`flodown-blocks.md`](../prds/domains/flodown-blocks.md), [`module-descriptions.md`](../prds/domains/module-descriptions.md) |

## Resolved questions

| Question | Resolution | Owner | Date |
| --- | --- | --- | --- |
| Q1 Version history | **B** — append FloDown version rows; never rewrite historic version JSON | requester | 2026-09-18 |
| Q2 Mark references | Leave as-is (v2) | requester | 2026-09-18 |
| Q3 DISCARDED | Rewrite; list with Discarded chip | requester | 2026-09-18 |
| Q4 Role gate | Curator/Admin on Confirm replace and confirm/undo | requester | 2026-09-18 |
| Q5 Confirmed section title | **Confirmed not a duplicate** | requester | 2026-09-18 |
| Q6 Module statements in list | List them (not silent) | requester | 2026-09-18 |
| Apply vs ID list | Iterate all FloDown blocks and ModuleDescriptions; no client ID list; re-scan on write | requester | 2026-09-18 |
| Handler names | `listLocalSymbolUriHits` / `replaceLocalSymbolWithMathHub` | requester | 2026-09-18 |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4):

Upstream review: Abhishek Chugh — 2026-09-18
Scope: proposal
Teach-back: confirmed
-->
