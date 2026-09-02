# Design: Catalog search faculty and subject area

> **Layer:** *how* — **SDD / tech-spec delta** for the current stack. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical tech specs until Archive.
>
> **Depends on:** Signed `clarify.md`; `proposal.md` reviewed. SDD = policy and boundaries on the current stack — not pseudo-code.
> See [spec-authoring §7](../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).

---

## SDD delta

Fold at Archive into
[`specs/engineering/features/module-descriptions/workspace.md`](../engineering/features/module-descriptions/workspace.md).
Do not edit that canonical path until Archive.

This SDD implements proposal PRD rules **R-MOD-16**, **R-MOD-17**, and **R-MOD-18**. It extends
catalog search only. **S-MOD-01** (Extractor+ + return matches) and **S-MOD-13** (route/serverFn
access) stay in force. It does not change create/list, workspace organization from per-module JSON,
FloDown, symbols, or export.

### Domain context (delta)

Catalog search continues to own FAU hierarchy lookup for the Module descriptions page. v1 adds
hierarchy faculty and subject area on each search hit, muted presentation under the title, and
faculty-then-subject-area ordering.

Out of scope (unchanged siblings / proposal Non-goals):

- In-progress Modules list — same route, different table
- Module workspace “Organization & programs” — per-module JSON `organizations`
- Module TeX export — [`export.md`](../engineering/features/module-descriptions/export.md)

### Architecture boundaries (delta)

| Layer | Responsibility |
| --- | --- |
| `src/server/modules/moduleCatalog.ts` | When loading the search index from `hierarchy.json`, copy each module’s `faculty` and `subjectArea` into `ModuleSearchResult` (null when absent). `searchModules` returns those fields and orders matches per S-MOD-17. Search MUST NOT open per-module JSON solely to obtain organization for the search list. |
| `src/serverFns/moduleDescription.server.ts` `searchModuleDescriptions` | Unchanged auth (`requireExtractorPlus`); returns `searchModules` results including the two organization fields. |
| `src/routes/module-descriptions/index.tsx` | Catalog search table shows muted faculty / subject area text beneath the title when present; omits invented labels when absent. In-progress Modules table unchanged. |

### Data contracts (delta)

| Field / enum | Values / notes |
| --- | --- |
| Hierarchy module `faculty` / `subjectArea` | Optional strings on each `hierarchy.json` module entry. Search index maps missing or blank values to `null`. Unclassified paths may omit both. |
| `ModuleSearchResult` | `{ moduleId, title, faculty: string \| null, subjectArea: string \| null }` — search list source of truth for organization on this page. |
| Catalog `organizations` / `programs` (per-module JSON) | Unchanged: workspace detail only; loader still drops null/incomplete rows. Not the catalog-search org source. |

### Business rules (add)

**S-MOD-16 (Event-Driven):** WHEN `searchModules` returns matches, each result MUST include `faculty`
and `subjectArea` taken from that module’s `hierarchy.json` entry (null when absent), and WHEN the
catalog search table on `/module-descriptions` renders a hit that has either value, the UI MUST show
those values in muted text beneath the module title (omit the missing part when only one is present;
omit the subtitle when both are null).

**Upstream:** R-MOD-16, R-MOD-18

**S-MOD-17 (Event-Driven):** WHEN `searchModules` returns a non-empty match list, the system MUST
order matches by `faculty` first, then `subjectArea`, then title (case-insensitive), then
`moduleId`. String compares MUST use default runtime comparison (bare `localeCompare` / equivalent)
without a German locale. Absent `faculty` or `subjectArea` MUST compare as the empty string so order
stays defined.

**Upstream:** R-MOD-17

**S-MOD-18 (Ubiquitous):** Catalog search MUST NOT invent faculty or subject area labels (including
“Unclassified”) when hierarchy values are absent, and MUST NOT substitute per-module JSON
`organizations` for missing hierarchy fields on the search list.

**Upstream:** R-MOD-18

### Existing rules (unchanged; still apply)

**S-MOD-01** — `searchModuleDescriptions` MUST call `requireExtractorPlus` and MUST return matches
from `searchModules` (now including org fields and sort).

**Upstream:** R-MOD-01

**S-MOD-13** — Module description route loaders and dedicated module serverFns MUST reject callers
who are not Extractor, Curator, or Admin.

**Upstream:** R-MOD-13

## Boundaries

| Area | Paths / identifiers |
| --- | --- |
| Code | `src/server/modules/moduleCatalog.ts` (`loadCatalog`, `searchModules`, `ModuleSearchResult`); `src/serverFns/moduleDescription.server.ts` (`searchModuleDescriptions` — auth only); `src/routes/module-descriptions/index.tsx` (catalog search table only) |
| Data | `MODULES_DIR/hierarchy.json` module entries; no Prisma schema change |
| Tenants / tiers | N/A — role gate remains Extractor+ |
| Out of blast radius | `$moduleId.tsx` org panel; in-progress Modules table; FloDown; symbols; export; JWT |

## ADR alignment

Pass — no new or superseded `D-*` atom. Catalog search ranking is SDD policy only.

## Operations

| Concern | Link or N/A |
| --- | --- |
| Vendors | N/A — static files under `MODULES_DIR` |
| Deployment / flags | N/A — no new env vars; existing `MODULES_DIR` |

Hierarchy data quality (whether `faculty` / `subjectArea` are populated) is a catalog sync concern
(`scripts/sync-hierarchy-module-organizations.mjs`), not a runtime feature flag.

## Test mapping

| Rule ID / summary | Test (file or describe block) | Layer |
| --- | --- | --- |
| S-MOD-16 / R-MOD-16 — search results carry hierarchy faculty and subjectArea | `moduleCatalog` unit: load/search with fixture hierarchy entries that include both fields | unit |
| S-MOD-16 / R-MOD-18 — null when hierarchy omits fields; no invented label | unit: hierarchy entry without faculty/subjectArea → both null | unit |
| S-MOD-17 / R-MOD-17 — order faculty, then subjectArea, then title, then moduleId | unit: `searchModules` returns matches in that order across mixed faculties / areas / titles | unit |
| S-MOD-17 — absent org compares as empty; no `de` locale required | unit: null faculty/subjectArea sort stably with bare string compare | unit |
| S-MOD-18 — search MUST NOT invent “Unclassified” | covered by null-field unit; negative assert no substituted label in result payload | unit |
| S-MOD-01 — Extractor+ still required | existing gap or thin serverFn auth test if already patterned elsewhere; do not regress | integration / gap |
| UI muted subtitle under title | Prefer unit coverage of search contract; optional thin route/component check if the team already tests Mantine tables that way — not a new E2E requirement for v1 | optional |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4) — add after review:

Upstream review: <name> — <date>
Scope: design
Teach-back: confirmed
-->
