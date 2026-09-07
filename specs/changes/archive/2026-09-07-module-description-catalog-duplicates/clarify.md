# Clarify: Module description duplicates (exact / near)

> **Phase:** Clarify — **locked**. Propose may begin (`opsx-propose`). Do **not** invent policy
> beyond this file.
>
> **Canonical guide:** [CLARIFY_AND_PROPOSE.md](../CLARIFY_AND_PROPOSE.md).
>
> **Mode:** Full SDD. Cross-domain (catalog search, ModuleDescription workspace, FloDown
> delete/reset, sTeX export). Touches critical areas: FloDown block lifecycle, FTML/sTeX export,
> role gates.

---

## Feature request (input)

Requester 2026-09-02 (this conversation). Prior catalog analysis: exact clones are common (~2 505
clusters / 11 217 module IDs); near-duplicates also exist (~333 clusters); same `elementnr` is
**not** a reliable identity (30 divergent groups, e.g. shared thesis code `1999`).

1. GloX detects exact/near duplicates **offline** and stores the result in a `duplicates.json`
   file. Detection uses **only** three fields: title, Inhalt, Lernziele und Kompetenzen.
2. At catalog search (**U1**), every hit stays visible and is annotated with exact/near peers
   from `duplicates.json` (e.g. `62083` is an exact duplicate of `42438`).
3. When the user chooses a module, they can **mark it as a duplicate** of another module
   (suggested or any extracted module). There is **no deny**. Ignoring the suggestion leaves the
   module independent. Mark-as-duplicate stays available **after** a DB row exists; then existing
   extracted data (Inhalt, Lernziele, definitions) is **deleted after a warning**. Only **title**
   remains on the duplicate row (needed for near-duplicate export).
4. While marked a duplicate, the UI **disables** semantic updates and symbol/definition addition.
5. Download `{moduleId}.{lang}.tex` for the alias: **Title** always from the alias row’s stored
   catalog title (**E1**); Inhalt and Lernziele from the canonical DB.
6. **Download all** includes **both** `42438.de.tex` and `62083.de.tex`.

(FR example IDs: Lineare Algebra I `42438` / `62083`.)

Offline detectors already exist (`scripts/find-module-description-duplicates.mjs --match exact|near`)
and feed `duplicates.json`; they are not the product UI.

---

## Restatement

GloXers should not re-annotate Campo clones of the same syllabus. The system **precomputes** exact
and near clusters from catalog JSON (three fields only), writes `duplicates.json`, and **suggests**
those peers when a user searches or opens a module. A human may **mark** the current `moduleId` as
an alias of a **canonical** ModuleDescription that already exists in the DB, or **ignore** the
suggestion and extract independently. There is **no deny** and no persisted “not a duplicate.”
Mark-as-duplicate is **always** offered on the workspace.

After mark, the alias is a **publication identity** (its own `{moduleId}.{language}.tex` in single
and bulk export) but **not** an independent semantic workspace. The row keeps **only title**
(catalog title of this `moduleId`). Inhalt, Lernziele, definitions, and all FloDown on that row
are **deleted** at mark time (warning first). Export **Title** is always this row’s stored catalog
title (**E1**, no title semantics). **Inhalt** and **Lernziele** come from the canonical row’s
annotated DB statements. Unmark (Q8) re-seeds a normal workspace from this module’s catalog.

**Human approval:** approved 2026-09-02 by requester (Lock it).

---

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | yes | `prds/domains/module-descriptions.md` (R-MOD-01…15); `workspace.md`; `export.md`; `flodown-blocks.md` (R-FDB-03); `domain-dictionary.yaml`; `glox-features.md`; ADRs `flodown-persist-and-boundary.md` |
| ADR alignment | pass | No persist-URI or session ADR conflict. |
| Compliance | pass | No compliance PRDs. No HALT. |
| Blast radius (`code`) | **large — critical** | Prisma `ModuleDescription`; serverFns; catalog search/list; workspace; reset/delete; TeX + bulk zip; FloDown delete + orphan symbols |
| Blocking questions | **none blocking** | Q1–Q12 resolved 2026-09-02. JSON **module-keyed** map + U1 locked (requester). Confirm envelope vs bare top-level keys if needed — recommendation below. |

R-MOD-04/05/11 will need PRD deltas: alias rows are read-only; TeX Title is alias catalog title
(E1); Inhalt/Lernziele from canonical. Mark-as-duplicate is a **destructive** FloDown delete
(R-MOD-09 / R-FDB-03).

---

## `duplicates.json` shape

**Locked location (Q10):** `MODULES_DIR/duplicates.json` (default `modules/duplicates.json`).
Produced offline by the detector script. The app **only reads** it. Not regenerated from the UI
in v1.

**What the file is:** static **catalog** facts. It does **not** record who is extracted or who
was marked an alias — that is the DB. **C2** suggested canonical is computed at runtime.

**Locked display (Q2 / U1):** search is a lookup of **this hit’s** `moduleId`. A cluster list
forces every request to scan or pre-index. A **module-keyed** file matches U1.

### Chosen schema (v1) — lookup map, not cluster list

Do **not** use raw top-level keys `{ "62083": …, "version": 1 }`. A metadata field would collide
with a module id in principle; `jq` and TypeScript are cleaner with an envelope.

```json
{
  "version": 1,
  "generatedAt": "2026-09-02T10:00:00.000Z",
  "fields": ["title", "Inhalt", "Lernziele und Kompetenzen"],
  "nearThreshold": 0.9,
  "modules": {
    "62083": {
      "exact": [
        { "moduleId": "42438", "title": "Lineare Algebra I" }
      ],
      "near": []
    },
    "42438": {
      "exact": [
        { "moduleId": "62083", "title": "Lineare Algebra I" }
      ],
      "near": []
    }
  }
}
```

Near example for one key:

```json
"121953": {
  "exact": [
    { "moduleId": "121954", "title": "Computer Graphics" }
  ],
  "near": [
    {
      "moduleId": "69341",
      "title": "Computer Graphics",
      "score": 0.94,
      "nearKind": "similar"
    }
  ]
}
```

**Rules:**

| Rule | Meaning |
| --- | --- |
| `modules` | Keys are `moduleId` strings. **Omit** ids with no peers (no empty `{ exact:[], near:[] }`). |
| `exact` / `near` | Two arrays. A peer MUST NOT appear in both; **exact wins** at generation time. |
| Peer object | `moduleId` + catalog `title` (for U1 copy). Near peers also `score` (pair Jaccard) and `nearKind`. No `path`/`faculty`/`elementnr` in v1 (catalog search already has faculty from the hit). |
| No self | `62083` is never listed under `modules["62083"]`. |
| Symmetry | If A lists B as exact, B lists A as exact (same for near). Generator MUST assert this; it is the main debug check. |
| Sort | Each array sorted by numeric `moduleId` so git diffs and `jq` output are stable. |
| Suggested canonical | **Not in the file.** Runtime C2 over `exact` then `near` (exact peers first). |
| Size | Redundant vs a cluster list (each pair stored twice). Still small (low MB). Worth it for U1. |

**Implementation:** `const hint = file.modules[moduleId]` — no cluster walk. Search and workspace
share one helper: primary suggestion = C2 among `exact` if any extracted/lowest id, else C2 among
`near`.

**Debugging:** `jq '.modules["62083"]'`. Asymmetry = generator bug. Missing key = no catalog
peers. Compare two regenerations with sorted keys.

**Generator:** still cluster internally (exact buckets, then near), then **emit the map**. Do not
keep `clusters[]` in the shipped file (two shapes would drift).

**Tradeoff vs cluster-only file:** larger, duplicated titles, pair `score` instead of cluster
`minScore` (better for U1). Lost: one `id` for “this whole HCI blob.” v1 does not need that in
the UI. If ops wants a cluster dump, it can be a second debug artifact, not what the app reads.

---

## Open questions

| Question | Status | Resolution / owner | Date |
| --- | --- | --- | --- |
| **Q1.** Suggested “original” in a cluster? | **resolved** | **C2:** prefer a peer that already has a ModuleDescription; else lowest numeric `moduleId`. Tie-break among extracted peers: lowest `moduleId`. User may still pick any extracted module (Q3). | 2026-09-02 |
| **Q2.** How exact vs near appear at catalog selection? | **resolved** | **U1:** annotate every search hit; do not collapse clusters. Copy uses `duplicates.json` `exact` / `near` lists + runtime C2 + whether that peer has a DB row. | 2026-09-02 |
| **Q3.** Alias of a catalog id with **no** DB row? | **resolved** | **T1:** canonical **must** already be a ModuleDescription row. | 2026-09-02 |
| **Q4.** Persist deny? | **resolved** | **No deny.** User affirms (marks duplicate) or **ignores**. Nothing persisted for ignore. Mark-as-duplicate **always** shown. | 2026-09-02 |
| **Q5.** Alias storage? | **resolved** | Real `ModuleDescription` row + `duplicateOfModuleId` (FK to canonical row). One row per exported `moduleId`. After mark, row retains **title only**; Inhalt/Lernziele statements empty or unused; no definition blocks. | 2026-09-02 |
| **Q6.** Title section of alias TeX? | **resolved** | **E1:** always the alias row’s stored catalog title (plain text, no semantics). Exact and near use the same Title rule. Inhalt/Lernziele always from canonical DB. | 2026-09-02 |
| **Q7.** Alias definition TeX in the zip? | **resolved** | **N/A.** Marking duplicate **deletes** all definitions on that module. Alias zip contribution is the **module** `{id}.{lang}.tex` only. Canonical still exports its own definitions. | 2026-09-02 |
| **Q8.** Unmark / change canonical? | **resolved** | **Yes.** Unmark re-seeds title/Inhalt/Lernziele from **this** module’s catalog (independent workspace). Changing canonical = unmark + mark again (same delete warning if the row is not already an alias). | 2026-09-02 |
| **Q9.** Who may mark duplicate? | **resolved** | **Extractor+** may mark/unmark. Export remains Curator/Admin (R-MOD-15). | 2026-09-02 |
| **Q10.** File path / regen? | **resolved** | `MODULES_DIR/duplicates.json`; script writes; app reads; no in-app regen in v1. | 2026-09-02 |
| **Q11.** Near cluster with different titles — still suggest? | **resolved** | **Yes.** Label as near. Title in TeX is always the alias catalog title (E1). | 2026-09-02 |
| **Q12.** `elementnr` as duplicate identity? | **resolved** | **No.** Non-goal. | 2026-09-02 |

### Q6 restated (was unclear)

Export builds **one module TeX file per `moduleId`**: `{62083}.{language}.tex` with three
sections: **Title**, **Inhalt**, **Lernziele und Kompetenzen**.

After mark, the **62083** DB row stores **only its catalog title**. **42438** still holds the
annotated title, Inhalt, and Lernziele (and definitions).

**Inhalt** and **Lernziele** in `62083.*.tex` **always** come from **42438’s DB** (the annotated
statements). That part is locked.

**Q6 is only about the Title section of `62083.*.tex`:**

Imagine 42438’s Title in the DB is not plain catalog text — the curator marked symbols in the
title. 62083’s stored title is always **plain catalog text** (no semantics), even if the catalog
title string equals 42438’s.

| | Title text in `62083.de.tex` | Title **semantics** (definienda / symrefs) |
| --- | --- | --- |
| **E1 — Alias catalog title** | Always 62083’s stored title | Never (plain text). Even **exact** clones: 62083.tex Title has the same words as 42438’s catalog title, but **not** 42438’s title annotations. |
| **E2 — Canonical title when exact** | **Exact** pair: use 42438’s `titleStatement` (identical file body except filename). **Near** pair: use 62083’s stored title (titles may differ; do not paste 42438’s annotated title onto a different heading). | Exact: yes, copied from canonical. Near: no. |

**Chosen (requester 2026-09-02): E1.** Alias TeX Title is never taken from the canonical
`titleStatement`. Exact alias files are therefore **not** guaranteed identical to the canonical
module TeX in the Title section when the canonical title has annotations.

---

## Options

### Canonical suggestion (Q1) — **locked C2**

| Option | Product impact | Engineering cost | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| **C1** Lowest numeric `moduleId` | Stable | S | Suggested original may be unextracted | Label fallback |
| **C2** Prefer extracted peer; else C1 | Matches “duplicate of one already extracted” | S | Two extracted: lowest id | **Chosen** |
| **C3** No default | More clicks | S | Worse for clones | Reject as sole path |

### Catalog selection UI (Q2) — **locked U1**

Catalog “selection” is a **search result list**. U1 keeps the typed `moduleId` visible.

**U1 copy (locked draft):**

- **Exact**, C2 peer extracted: `Exact duplicate of 42438 (Lineare Algebra I) — already extracted.`
- **Exact**, C2 peer not extracted: `Exact duplicate of 42438 (Lineare Algebra I) — not extracted yet.`
- **Near:** `Possible near-duplicate of 42438 (score 0.95). Titles or wording may differ.`
- Extra peers: `+N other catalog matches` (exact counted first).
- If the row is **already an alias** in the DB, search may additionally show that fact (DB, not the JSON file).
- No deny copy (Q4).

U2–U5 remain v2 / rejected as in the table (U2 reject v1; U3–U5 v2).

### Canonical must exist (Q3) — **locked T1**

| Option | Product impact | Engineering cost | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| **T1** Target must be an existing ModuleDescription | Export always has a canonical body | S | Cannot pre-alias | **Chosen** |
| **T2** Catalog id with no row | Early filing | M | Empty export | Reject v1 |

### Persistence (Q4–Q5) — **locked**

- **Q4 Chosen:** no deny, no denial table. Suggestions from `duplicates.json` every time until
  the user **marks** duplicate (then the row is an alias). Ignore = do nothing.
- **Q5 Chosen:** `ModuleDescription.duplicateOfModuleId` nullable FK. Alias row: **title only**.

### Export (Q6–Q7)

- **Q7 Chosen:** N/A — no definitions on alias; Download all adds alias **module** TeX plus
  canonical module TeX and canonical definition TeX.
- **Q6 Chosen: E1.** Alias Title = stored catalog title only.

---

**Chosen approach (2026-09-02 requester):** C2, **U1**, T1, Q4 ignore/no-deny, Q5 FK + title-only
alias row, Q6 **E1**, Q7 N/A, Q8 unmark, Q9 Extractor+, Q10 `MODULES_DIR/duplicates.json`,
**module-keyed `modules` map** (exact/near arrays), Q11 still suggest near, Q12 no elementnr.

---

## v1 scope

- Detector writes module-keyed `duplicates.json`; app `modules[id].exact` / `.near`.
- Catalog search **U1** annotations (C2 + extracted flag from DB).
- Workspace **always** offers mark-as-duplicate of any extracted module (and a C2 suggestion when the file has peers).
- Mark: warning; delete Inhalt/Lernziele/definitions on this row; keep title; set
  `duplicateOfModuleId`. Server rejects semantic mutations on aliases.
- Unmark: re-seed three fields from this module’s catalog.
- Export + Download all: alias `{moduleId}.{language}.tex` with **E1** Title + canonical
  Inhalt/Lernziele; plus canonical module and definition TeX.
- Roles: Extractor+ mark/unmark; Curator/Admin export.
- Tests: JSON contract; search hints; mark deletes FloDown; mutation reject; TeX composition;
  zip contains both module filenames.

---

## Non-goals and v2

### Non-goals (not in this change)

- `elementnr` as duplicate key.
- Runtime all-pairs recompute.
- Persist deny / “not a duplicate.”
- Auto-affirm from `duplicates.json`.
- Alias-of-alias (canonical MUST be a non-alias row; reject cycles).
- Definitions retained on an alias.
- Live Campo API; PDF file-hash duplicates; curator approval queue for marks.
- In-app regen of `duplicates.json`.

### v2 (separate FR later)

- U3/U4/U5 if U1 is too noisy.
- Diff UI for near pairs.
- T2 (alias before canonical exists).
- Bulk-mark an exact cluster.
- Admin button to regenerate `duplicates.json`.

---

## PRD change decision

- [x] **PRD delta required** — new or changed binding outcomes for v1
- [ ] **No PRD change** — governed by:

**Recommendation:** **PRD delta required** (`module-descriptions.md` + export SDD): hints file;
mark/unmark; title-only alias; mutation forbid; composite TeX (E1 Title + canonical body); bulk zip both module files;
destructive mark (R-FDB-03).

**Human confirmation:** requester, 2026-09-02 (Lock it) — PRD delta required.

---

## Accepted tradeoffs

| Original ask | What v1 ships instead | Why acceptable | Agreed by | Date |
| --- | --- | --- | --- | --- |
| Affirm **or deny** | Mark duplicate **or ignore**; no deny | Requester 2026-09-02 | requester | 2026-09-02 |
| Mark duplicate of **any** module | Any **extracted** ModuleDescription (T1) | Canonical body lives in DB | requester | 2026-09-02 |
| Duplicate keeps extracted definitions | Definitions **deleted** at mark; title only | Requester 2026-09-02 | requester | 2026-09-02 |
| Exact alias TeX identical except filename | **E1:** Title from alias catalog (no canonical title annotations) | Simpler; matches title-only alias row | requester | 2026-09-02 |
| “Dropdown” | **U1** annotated search list (not a combobox, not collapsed clusters) | Typed ID must stay visible | requester | 2026-09-02 |
| Cluster-list `duplicates.json` | **Module-keyed** `modules[id].{exact,near}` under a version envelope | Matches U1 lookup; easier `jq` | requester + engineer | 2026-09-02 |

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
Clarify approved: requester — 2026-09-02
Propose may begin.
```
