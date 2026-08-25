# Proposal: Opaque FloDown symbol URIs and declaration records

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

Local symbol identity today is a **short name** in FTML, a parallel `declaredSymbols` name list, and
a `Symbol` catalog keyed by name plus export identity. GloX **mints** MathHub-shaped symbol URIs only
at preview/export. That split breaks once identity moves must keep references honest.

v1 makes the **FloDown-returned symbol URI** the only local identity. GloXers declare in the browser;
the system stores that opaque string on the statement and on the declaring FloDown block’s
**declaration records** (display name, URI, confirmation, confirming user, optional alias). The
separate Symbol catalog and the name-only declared-symbols list go away after a one-shot backfill.
When a file’s export identity or a declared name changes, FloDown supplies the **new** URI; the
system replaces the **old** URI string everywhere it occurs and does not interpret URI structure.
Scale is small: uniqueness and catalog search may scan all declaration records.

Locked restatement: [`clarify.md`](./clarify.md) (requester, 2026-08-25).

## Non-goals

- FloDown WASM on the server.
- GloX-generated persist symbol URIs, or alerting when FloDown’s string differs from a GloX-built
  “expected” URI.
- Parsing stored symbol URIs (archive, path, module, or name token) for rewrite, display, or
  uniqueness.
- Removing **document** URI assembly used only to mount FloDown documents (not catalog identity).
- Persisting `for_symbols` or solving preview hover / fragment fetch (D-FTML-03).
- Removing `/flodown-lab`.
- Changing MathHub search APIs or stemming languages.
- Restoring mark-reference “create a local symbol with no declaring definition.”
- Rewriting historic FloDown block **version** rows (current statements and module-description JSON
  only).

## Iteration plan

### v1 (this change)

- Persist FloDown `addSymbolDeclaration` return values as local `uri` on statements.
- Declaration records on the declaring FloDown block; drop `Symbol` and name-only declared-symbols
  after backfill.
- Unique local identity is the opaque URI (one live declaration).
- Export-identity moves and declared-name rename: opaque whole-database replace of listed URIs.
- Declare requires a client-supplied FloDown URI; extract/LLM cannot invent one.
- Mark references use an existing local URI or a MathHub URI.
- ADRs: never mint/parse symbol URIs; no server WASM; supersede persist-short-names and the
  declared-symbols column atom.
- PRD delta on symbols-semantics (and dictionary/lifecycle at Archive).

### v2 (after user feedback — separate FR)

- Drop leftover dual-read of short names if any safety net remains after the script.
- Rewrite FloDown block version history to follow new URIs.
- Optional: persist `for_symbols`.
- Optional: a database unique index on declaration URIs.

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | done | From signed `clarify.md`: D-FTML-01…04; `ftml.md`; `lifecycle.md`; registry / propagation / search; PRD `symbols-semantics.md`; `mathhub.md`; `flodown.md` |
| ADR alignment | **conflict — supersede** | D-FTML-01 (short names in DB); D-FTML-04 (`declaredSymbols` names). D-FTML-02 (document `fromUri`) and D-FTML-03 (hover mount) stay. New atoms: never mint/parse symbol URIs; no server WASM. |
| Compliance | pass | No compliance PRDs |
| Blocking questions | none | Q1–Q6 resolved; Lock it 2026-08-25 |

## PRD delta

Fold into [`specs/prds/domains/symbols-semantics.md`](../prds/domains/symbols-semantics.md) at Archive.
Do not edit the canonical PRD until then.

Update the domain blurb: a Symbol is a declared concept whose identity is the opaque URI FloDown
returned; declaration records live on the declaring FloDown block (not a separate catalog table).

### Product outcomes (replace)

**R-SYM-01 (Event-Driven):** WHEN an Extractor, Curator, or Admin **declares** a symbol on a FloDown
block, the system MUST record a declaration on that block that includes the symbol’s display name
and the symbol URI FloDown returned, and MUST store that same URI on the declaring definiendum.

**Rationale:** A definiendum can name an already-declared symbol (E-FTML-06). Only a declaration
owns the local symbol URI.

**R-SYM-02 (Ubiquitous):** The system MUST allow at most one non-discarded FloDown block to declare
a given local symbol URI.

**R-SYM-04 (Event-Driven):** WHEN a Curator confirms a Symbol is not a duplicate, the system MUST
set the confirmed flag and MUST record the confirming user on that symbol’s declaration record.

**R-SYM-08 (Event-Driven):** WHEN a Curator or Admin attempts to delete a local symbol declaration,
IF any non-discarded FloDown block still declares that symbol URI, the system MUST reject the
deletion and MUST leave the declaration in place.

**R-SYM-16 (Event-Driven):** WHEN a user changes a FloDown block’s export identity or the display
name of a declared local symbol, the system MUST replace the previous FloDown symbol URI with the
new FloDown symbol URI in every stored statement and declaration record that used the previous
URI, and MUST NOT change other symbol URIs.

**R-SYM-17 (Ubiquitous):** The system MUST NOT create a local symbol catalog entry that is not a
declaration on a FloDown block. Mark references MUST use an existing local symbol URI or a MathHub
URI.

### Product outcomes (keep)

R-SYM-03, R-SYM-05, R-SYM-09 through R-SYM-14 unchanged. R-SYM-05 still covers catalog search
(including local display names on declaration records).

### Binding operator / compliance promises (add)

**R-SYM-18 (Ubiquitous):** The system MUST NOT construct a local symbol URI and MUST NOT interpret
a stored local symbol URI as structured fields (archive, path, module, or name token).

**Rationale:** Invented or parsed URIs silently change MathHub/export identity — semantic corruption
of the glossary.

**R-SYM-19 (Ubiquitous):** The system MUST NOT persist a local symbol declaration unless the symbol
URI was supplied as the value FloDown returned for that declaration.

**Rationale:** Server- or model-invented URIs are the same incident class as R-SYM-18 (false export
identity).

### Binding (keep, wording)

**R-SYM-06 (Ubiquitous):** The system MUST NOT allow Extractor-role users to delete unassociated
local symbol declarations or confirm deduplication.

**Rationale:** Symbol registry changes affect export identity and MathHub canonicalization — only
Curators and Admins may perform destructive symbol operations.

R-SYM-07 and R-SYM-15 unchanged.

### Traceability (add/replace at Archive)

| PRD rule | SDD rule(s) |
| --- | --- |
| R-SYM-01 | `registry.md` S-SYM-01 |
| R-SYM-02 | `registry.md` S-SYM-02 |
| R-SYM-04 | `registry.md` S-SYM-04 |
| R-SYM-08 | `registry.md` S-SYM-08 |
| R-SYM-16 | `registry.md` S-SYM-10; `lifecycle.md` S-FDB-06a |
| R-SYM-17 | `registry.md` S-SYM-11 |
| R-SYM-18 | `registry.md` S-SYM-13; D-FTML-05 |
| R-SYM-19 | `registry.md` S-SYM-09 |

## Upstream links

| Kind | Link |
| --- | --- |
| Compliance | N/A |
| Commercial | N/A |
| Product context (orientation) | [`clarify.md`](./clarify.md) |
| Existing PRDs | [`symbols-semantics.md`](../prds/domains/symbols-semantics.md), [`flodown-blocks.md`](../prds/domains/flodown-blocks.md) |

## Resolved questions

| Question | Resolution | Owner | Date |
| --- | --- | --- | --- |
| Q1 Unique key | Opaque local symbol URI; display name is search-only; language is not in the URI | requester | 2026-08-25 |
| Q2 Who mints | Nobody in GloX. FloDown (browser) only. Never mint, never parse, never WASM on the server | requester | 2026-08-25 |
| Q3 Migration | One-shot script; temporary mint allowed then deleted; drop `Symbol` and name-only declared-symbols | requester | 2026-08-25 |
| Q4 Identity rewrite vs MathHub | Replace exact URI strings listed on the moved/renamed declarations; do not parse; external MathHub URIs unchanged | requester | 2026-08-25 |
| Q5 Name-token rename | In v1; same opaque replace engine | requester | 2026-08-25 |
| Q6 Mark-ref / LLM | No catalog without a declaring block; no server-minted URI; extract/LLM declare only after the client supplies FloDown’s string | requester | 2026-08-25 |

**Chosen approach (Clarify option C):** opaque FloDown URIs; declaration records on the declaring
block; one-shot backfill then delete mint helpers.

**P2:** Original FR preferred FloDown URIs and assessed GloX minting. v1 never mints. Interim
Clarify lock (GloX mints; FloDown is a check) superseded 2026-08-25.

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4):

Upstream review: <name> — <date>
Scope: proposal
Teach-back: confirmed
-->
