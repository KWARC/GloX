# Clarify: Catalog search faculty and subject area

> **Phase:** Clarify — decision record before delta files. Copy from `_TEMPLATE/` at the start of
> Clarify; update iteratively until the human signs off. Do **not** draft `proposal.md`, `design.md`,
> or `tasks.md` until **Human decisions** below are complete and signed.
>
> **Canonical guide:** [CLARIFY_AND_PROPOSE.md](../CLARIFY_AND_PROPOSE.md).

---

## Feature request (input)

Show each searched module’s faculty and subject area in gray beneath its title on the Module
descriptions catalog search page, using data from `hierarchy.json`, and sort results by faculty first
and subject area second.

Session: requester asked for **full SDD** even though [DEVELOPER_GUIDE §1](../DEVELOPER_GUIDE.md#1-choose-your-mode)
would normally treat this as lightweight UI (no auth/tenancy/compliance signal).

## Restatement

When an authenticated Extractor, Curator, or Admin searches the FAU module catalog on
`/module-descriptions`, each hit still shows module ID and title. Under the title, the UI shows that
module’s **faculty** and **subject area** from the catalog hierarchy file (`hierarchy.json` under
`MODULES_DIR`), in muted gray. Hits are ordered by faculty, then subject area. Search matching
(ID prefix vs title substring) and role gating stay as today. The in-progress **Modules** list and
the module workspace organization panel are unchanged unless we later expand scope.

**Human approval:** approved on 2026-09-02 by Keerthan K

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | done | [`prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) **R-MOD-01** — catalog search must return matches; does not mention faculty, subject area, or sort. **R-MOD-13** — Extractor+ only (unchanged). [`engineering/features/module-descriptions/workspace.md`](../engineering/features/module-descriptions/workspace.md) **S-MOD-01** — `searchModuleDescriptions` → `searchModules`; data contract notes unclassified modules may omit faculty/subject area. [`product/glox-features.md`](../product/glox-features.md) — “FAU module catalog search — Search hierarchy from `MODULES_DIR`.” |
| ADR alignment | pass | No `D-*` atom covers catalog search ranking or organization display. No new ADR needed. |
| Compliance | pass | File-based catalog only (PRD out of scope: live Campo/StudOn). No vendor/compliance PRD contradiction. |
| Blast radius (`code` in frontmatter) | catalog search UI + catalog loader | [`src/routes/module-descriptions/index.tsx`](../../src/routes/module-descriptions/index.tsx) catalog table; [`src/server/modules/moduleCatalog.ts`](../../src/server/modules/moduleCatalog.ts) `loadCatalog` / `searchModules` (today maps `faculty`/`subjectArea` to `null`); [`src/serverFns/moduleDescription.server.ts`](../../src/serverFns/moduleDescription.server.ts) `searchModuleDescriptions` (auth unchanged). Does **not** change FloDown, symbols, export, or session JWT. |
| Blocking questions | none | Recommendations accepted with Lock it. |

**Code fact (not a spec gap):** `searchIndex` is built from `hierarchy.json` modules but currently
discards `faculty` / `subjectArea`. Per-module JSON `organizations` already feed the workspace
detail page. The FR binds **hierarchy** as the search-list source, not a round-trip into each
module JSON file.

## Open questions

| Question | Status | Resolution / owner | Date |
| --- | --- | --- | --- |
| When `faculty` or `subjectArea` is missing (e.g. unclassified path), what does the subtitle show? | resolved | Omit the gray line (or the missing part). Do not invent “Unclassified”. | 2026-09-02 |
| When two hits share the same faculty and subject area, what is the next sort key? | resolved | Title (case-insensitive), then `moduleId`, for a stable order. | 2026-09-02 |
| Should faculty and subject area sort use German locale rules (umlauts), or default string compare? | resolved | Default runtime string compare in v1 (same pattern as existing bare `localeCompare` elsewhere); no locale-specific product promise. | 2026-09-02 |

## Options

N/A — single recommended path. The FR already names the page, the visual (gray under title), the
data file, and the two-key sort.

**Chosen approach:** Read `faculty` and `subjectArea` from each `hierarchy.json` module entry into
the existing `ModuleSearchResult` search index; `searchModules` returns those fields and orders
matches by faculty then subject area (then title / id as above). Catalog search table renders a
muted subtitle under the title. Leave match rules, result cap, and Extractor+ auth unchanged.

If hierarchy rows still lack those fields until a data sync, the UI omits the subtitle; that is a
catalog-data issue, not a second product surface.

## v1 scope

- Catalog search results on `/module-descriptions` show faculty and subject area in muted text
  beneath the module title when present in `hierarchy.json`.
- Those results are sorted by faculty, then subject area (then title, then module ID).
- `searchModules` / `searchModuleDescriptions` expose the same two fields (null when absent).
- Specs: PRD + workspace SDD deltas for the new observable search list behavior.

## Non-goals and v2

### Non-goals (not in this change)

- In-progress **Modules** table (ID / title / lang / status / updated).
- Module workspace “Organization & programs” panel (already uses per-module JSON).
- Filter/facet UI by faculty or subject area.
- Changing search match rules, result limit, or who may search.
- Live Campo/StudOn catalog; writing new organization fields into per-module JSON as part of this FR
  (hierarchy is the search source).
- Auth, FloDown, symbols, or TeX export.

### v2 (separate FR later)

- Filter catalog search by faculty / subject area.
- Apply the same subtitle + sort to the in-progress list if product wants parity.
- Locale-aware German sort if extractors notice umlaut ordering.

## PRD change decision

- [x] **PRD delta required** — new or changed binding outcomes for v1
- [ ] **No PRD change** — governed by: <!-- links -->

**Recommendation:** Extend catalog-search outcomes beyond **R-MOD-01** (matches only). Users will
see organization under the title and a different result order — that is a product promise, not only
stack wiring. Keep **R-MOD-13** as-is. SDD (`workspace.md` S-MOD-01 + data contract) will say
hierarchy fields, nulls, and sort keys.

**Human confirmation:** Keerthan K, 2026-09-02

## Accepted tradeoffs

N/A — v1 ships the original ask. Missing-org omit and tertiary title/id sort are defaults, not a
narrowed product promise.

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
Clarify approved: Keerthan K — 2026-09-02
Propose may begin.
```
