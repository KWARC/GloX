# Proposal: Module description catalog duplicates

> **Layer:** *what* — intent, scope, and optional **PRD delta**. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical PRDs until Archive.
>
> **Policy:** `proposal.md` records *what* (including an optional PRD delta). `design.md` records *how*
> (the SDD delta). `tasks.md` records *do* — atomic Apply steps only, with no new requirements.
>
> **Prerequisites:** Signed `[clarify.md](./clarify.md)` (**Lock it**). Complete
> [Clarify](./CLARIFY_AND_PROPOSE.md#phase-a--clarify) before drafting this file.

---

## Intent and scope

GloXers must not re-annotate Campo clones of the same syllabus (title, Inhalt, Lernziele und
Kompetenzen). v1 precomputes **exact** and **near** catalog peers offline, surfaces them on every
catalog search hit (**U1**), and lets an Extractor, Curator, or Admin **mark** a module description
as a duplicate of another description that already exists. There is **no deny**; ignoring a hint
leaves the module independent. Mark-as-duplicate stays available after a description already exists;
the user is **warned**, then Inhalt, Lernziele, definitions, and related FloDown on **this**
description are deleted. The duplicate row keeps **only its catalog title**.

A marked duplicate is a **publication identity** (its own module TeX file in single and bulk
export) but not a semantic workspace. TeX **Title** is always that stored catalog title (**E1**).
**Inhalt** and **Lernziele** come from the canonical description’s annotated statements. Unmark
re-seeds an independent workspace from this module’s catalog.

This is the locked restatement from `[clarify.md](./clarify.md)` (requester, 2026-09-02).

## Non-goals

- Using exam numbers (`elementnr`) or program/PO as the duplicate key.
- Recomputing all-pairs near-duplicates on each user request.
- Persisting “not a duplicate” / deny.
- Auto-marking from the catalog index without a human.
- Collapsing catalog search to one row per cluster (U2).
- Marking a duplicate of a catalog module that has **no** description yet (T2).
- Alias-of-alias chains (canonical MUST be a non-duplicate description).
- Keeping definitions on a description after it is marked duplicate.
- Live Campo API; PDF file-hash duplicates; curator approval queue for marks.
- Regenerating the catalog duplicate index from an in-app control.



## Iteration plan



### v1 (this change)

- Offline catalog duplicate index (exact and near on the three fields); app reads only.
- Catalog search annotates every hit (U1) with a C2 suggestion (prefer an already-created
description among peers; else lowest module identifier) plus extra-peer count.
- Mark / unmark duplicate; Extractor+; warning + delete of this description’s extracted body and
definitions; title-only duplicate row; server rejects semantic mutations on duplicates.
- Export: duplicate `{moduleId}.{language}.tex` with E1 Title + canonical Inhalt/Lernziele;
Download all includes both module files; definitions only from the canonical description.
- PRD delta on module-descriptions; SDD on workspace + export; dictionary term at Archive.



### v2 (after user feedback — separate FR)

- U3/U4/U5 (near-only-on-workspace, hide-aliases filter, grouped title search).
- Diff UI for near pairs.
- T2 (mark before the canonical description exists).
- Bulk-mark an exact peer set.
- In-app regeneration of the catalog duplicate index.



## Upstream audit


| Check              | Result | Notes                                                                                                                                                                                                                                                          |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specs read         | done   | Signed `clarify.md`; canonical `module-descriptions.md` now includes **R-MOD-16–18** (faculty/subject search, 2026-09-02 merge). Duplicate delta uses **R-MOD-19–24**. `workspace.md` **S-MOD-16–18** kept for org search; duplicate SDD uses **S-MOD-19–24**. |
| ADR alignment      | pass   | No persist-URI or session ADR conflict.                                                                                                                                                                                                                        |
| Compliance         | pass   | No compliance PRDs. No HALT.                                                                                                                                                                                                                                   |
| Blocking questions | none   | Q1–Q12 resolved; Lock it 2026-09-02.                                                                                                                                                                                                                           |




## PRD delta

Fold into `[specs/prds/domains/module-descriptions.md](../prds/domains/module-descriptions.md)` at
Archive. Do not edit the canonical PRD until then.

Add to the domain blurb that GloXers may mark a module description as a **duplicate** of another
already-created description so catalog clones share annotated Inhalt and Lernziele.

### Product outcomes (amend)

**R-MOD-04** — add that this rule does **not** apply WHILE the description is marked as a duplicate
of another (see R-MOD-21). Same exception note on **R-MOD-05** and **R-MOD-06**.

**R-MOD-11** — add that WHEN the description is a duplicate, the module TeX MUST follow R-MOD-23
instead of using only that description’s own three annotated statements.

### Product outcomes (add)

**R-MOD-19 (Event-Driven):** WHEN an Extractor, Curator, or Admin searches the module catalog, the
system MUST, for each result that has known exact or near catalog peers on title, Inhalt, and
Lernziele, inform the user of those peers without hiding the searched module identifier.

**Rationale:** Users look up a specific module identifier; collapsing clones would hide that hit.

**R-MOD-20 (Event-Driven):** WHEN an Extractor, Curator, or Admin marks a module description as a
duplicate of another, the system MUST require that the other description already exists, MUST NOT
allow the other description to itself be a duplicate, and MUST then remove extracted Inhalt,
Lernziele, definitions, and related glossary blocks on **this** description while retaining this
description’s catalog title. WHEN this description already exists, the system MUST warn before that
removal. WHEN this description does not yet exist, the system MUST NOT show that deletion warning.
The mark UI MUST NOT pre-select a catalog peer that has no description or that is itself a
duplicate. WHEN more than one exact or near catalog peer already has a non-duplicate description,
the mark UI MUST list those peers as potential originals, grouped by exact vs near.

**Rationale:** Destructive FloDown delete is the same incident class as reset (data loss of curated
statements and definitions). The original of a mark MUST already be a real description (T1); an
unpersisted catalog clone is not a valid default.

**R-MOD-21 (State-Driven):** WHILE a module description is marked as a duplicate of another, the
system MUST NOT allow adding or changing semantics on that description, and MUST NOT allow adding
symbols or definitions on that description.

**Applies as exception to:** R-MOD-04, R-MOD-05, R-MOD-06.

**Rationale:** Duplicate descriptions are publication aliases, not a second semantic workspace.

**R-MOD-22 (Event-Driven):** WHEN an Extractor, Curator, or Admin unmarks a duplicate, the system
MUST restore an independent workspace by re-seeding title, Inhalt, and Lernziele from this module’s
catalog entry.

**R-MOD-23 (Event-Driven):** WHEN a Curator or Admin exports a module description that is marked as
a duplicate of another, the system MUST produce a module TeX file named from **this** module
identifier and language whose Title section is this description’s retained catalog title (plain
text) and whose Inhalt and Lernziele sections are the **canonical** description’s annotated
statements.

**Rationale:** Near-duplicate titles can differ; title semantics stay on the canonical description
only (Clarify E1).

**R-MOD-24 (Event-Driven):** WHEN a Curator or Admin exports all module descriptions, the system
MUST include the module TeX file for each duplicate description as well as for each canonical
description.

### Binding operator / compliance promises (add)

N/A — access remains R-MOD-13; export role remains R-MOD-15. Destructive mark is a **product**
warning (R-MOD-20), not a new Binding rule.

### Out of scope (add bullets)

- Catalog duplicate detection algorithm details and file layout — SDD
- Exam-number identity for duplicates



### Traceability (add rows)


| PRD rule | SDD rule(s)             |
| -------- | ----------------------- |
| R-MOD-19 | `workspace.md` S-MOD-19 |
| R-MOD-20 | `workspace.md` S-MOD-20 |
| R-MOD-21 | `workspace.md` S-MOD-21 |
| R-MOD-22 | `workspace.md` S-MOD-22 |
| R-MOD-23 | `export.md` S-MOD-23    |
| R-MOD-24 | `export.md` S-MOD-24    |


**Numbering (after main merge 2026-09-02):** canonical **R-MOD-16–18** / **S-MOD-16–18** are
catalog faculty/subject-area search. Duplicate-feature rules start at **19**. Export uses
**S-MOD-23–24** so they do not collide with workspace **S-MOD-19–22**.

## Upstream links


| Kind                          | Link                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Compliance                    | none                                                                                                                                                   |
| Commercial                    | none                                                                                                                                                   |
| Product context (orientation) | `[product/glox.md](../product/glox.md)`, `[product/glox-features.md](../product/glox-features.md)`                                                     |
| Existing PRDs                 | `[prds/domains/module-descriptions.md](../prds/domains/module-descriptions.md)`, `[prds/domains/flodown-blocks.md](../prds/domains/flodown-blocks.md)` |




## Resolved questions


| Question                      | Resolution                                                 | Owner     | Date       |
| ----------------------------- | ---------------------------------------------------------- | --------- | ---------- |
| Q1 suggested original         | C2: extracted peer else lowest module id                   | requester | 2026-09-02 |
| Q2 search UI                  | U1 annotate every hit                                      | requester | 2026-09-02 |
| Q3 mark without canonical row | T1: canonical must exist                                   | requester | 2026-09-02 |
| Q4 deny                       | No deny; ignore or mark; control always shown              | requester | 2026-09-02 |
| Q5 storage                    | Description row + duplicate-of link; title only after mark | requester | 2026-09-02 |
| Q6 alias Title in TeX         | E1: always this row’s catalog title                        | requester | 2026-09-02 |
| Q7 alias definition TeX       | N/A; definitions deleted on mark                           | requester | 2026-09-02 |
| Q8 unmark                     | Yes; re-seed from this catalog module                      | requester | 2026-09-02 |
| Q9 roles                      | Extractor+ mark/unmark; Curator/Admin export               | requester | 2026-09-02 |
| Q10 index file                | Offline file next to the catalog; app reads only           | requester | 2026-09-02 |
| Q11 different near titles     | Still suggest; E1 title                                    | requester | 2026-09-02 |
| Q12 elementnr identity        | Non-goal                                                   | requester | 2026-09-02 |
| JSON shape                    | Envelope + `modules[id].exact` / `.near`                   | requester | 2026-09-02 |


---

