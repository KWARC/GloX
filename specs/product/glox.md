# GloX — FAUstairs glossary extraction and curation

> **Layer:** Intent / **context** — orientation only, not a binding build spec. **Do not write tests
> from this file.** Testable MUST rules belong in `/specs/prds/` and `/specs/engineering/features/`.
>
> **Doc ownership:** See [Product doc ownership](#product-doc-ownership) below.
>
> **Commercial / billing:** N/A — academic research tool; no SKUs or entitlements.
>
> **Implementation:** single TanStack Start app — [Implementation map](#implementation-map).

---

## Inputs

- **Design source:** [GloX blue note](../../blue/workflow/note.en.pdf) (living document)
- **Org / accountability:** [`organization.md`](../organization/organization.md)
- **Binding requirements:** [`prds/domains/`](../prds/domains/)

---

## Vision & positioning

GloX supports the [FAUstairs](https://faustairs.fau.de) project in building and curating a
**domain model** — key concepts and definitions — for FAU courses, with downstream formative-assessment
services. GloX is the tool ecosystem for two major workflows:

1. **Glossary extraction** — identify concepts in source materials, annotate with symbol names,
   synonyms, and definitions, export to FloDown/FTML.
2. **Domain model curation** — collect glossaries, annotate with term references, deduplicate, and
   canonicalize toward disciplinary ontologies on MathHub.

## Target customer & use cases

| Stakeholder | Use case |
| --- | --- |
| **GloXers** (KR + domain specialists) | Systematic extraction from module descriptions and course materials; curation toward MathHub |
| **Instructors** | Contribute course PDFs; review extracted definitions |
| **Program directors / coordinators** | Oversee domain model coverage for degree programs |
| **FAUstairs engineers** | Integrate exported sTeX/FTML into assessment pipelines |

## Core value proposition

- Structured workflow from raw course materials → semantically annotated definitions → MathHub-ready
  export.
- FTML-native editing with symbol references, definienda, and FloDown preview.
- FAU module catalog integration for batch processing hundreds of module descriptions.
- LLM-assisted suggestions for definitions and definienda (human-reviewed).

## Plans & packaging

N/A — single deployment for FAUstairs research; no commercial tiers.

## Features

**Last verified:** 2026-08-11

See [`glox-features.md`](./glox-features.md) for the shipped capability inventory.

## Known gaps & non-goals

| Gap / non-goal | Notes |
| --- | --- |
| StudOn integration | Listed in blue note as future information source; not implemented |
| HTML/pandoc GloX | Blue note envisions generic HTML extraction; current app focuses on PDF + module descriptions |
| Multi-tenant / partner branding | Out of scope — single FAUstairs deployment |
| Automated test suite | Vitest configured but no tests yet — see [`TESTING_GUIDE.md`](../review/TESTING_GUIDE.md) |

## Prioritization principles

1. **MathHub export correctness** over UI polish.
2. **GloXer workflow efficiency** for module-description batch processing.
3. **Semantic integrity** — symbol identity, symref consistency, provenance.
4. **Security basics** — auth, ownership, role gates — before new features.

## Roadmap

### Now

- PDF extraction and FloDown block editing
- FAU module description workflow
- Curation status pipeline and sTeX export

### Next

- Improved deduplication workflow and symbol propagation UX
- Integration test coverage for critical areas
- <!-- [BACKFILL-TODO: Confirm with PI] --> StudOn / Campo live data feeds

### Later

- Generic HTML document extraction (pandoc path from blue note)
- Concept spotter / enhanced LLM assistance
- Translation workflow for internationalized concept names (blue note §3.1)

## Customer feedback

<!-- [BACKFILL-TODO: Link feedback channel if one exists] -->

Collected informally from GloXer sessions; no formal feedback doc yet.

## Success metrics

| Metric | Definition | Accountable | Notes |
| --- | --- | --- | --- |
| Module descriptions processed | Count of ModuleDescription records with ≥1 finalized FloDown block | <!-- TODO --> | |
| Definitions exported to MathHub | FloDown blocks at SUBMITTED_TO_MATHHUB status | <!-- TODO --> | |
| Active GloXers | Monthly unique users with EXTRACTOR+ role | <!-- TODO --> | |

**Reporting:** Single deployment; no per-tenant rollups.
**Last snapshot:** *(not yet tracked)*

## Customer lifecycle

1. Admin or existing user invites GloXer → signup with email verification.
2. Extractor uploads PDFs or opens module descriptions → extracts definitions.
3. Curator reviews curation queue → finalizes and exports sTeX.
4. Content submitted to MathHub archive.

## GTM & distribution

Internal FAUstairs tool; deployed at glox.kwarc.info

## Risks & dependencies

| Risk | Mitigation |
| --- | --- |
| MathHub availability | Document quirks in [`external-deps/vendors/mathhub.md`](../engineering/external-deps/vendors/mathhub.md) |
| Module catalog staleness | Ops procedure in `prisma/modules-tar-update.md` |
| LLM suggestion quality | Human review required before persisting extractions |
| Missing document-ownership checks on some serverFns | Tracked as BUG in auth SDD; fix before production hardening |

## Product doc ownership

| Concern | Accountable | Typical responsible (today) |
| --- | --- | --- |
| Product direction & external promises | Michael Kohlhase | Michael Kohlhase (advisor: Marc Berges) |
| Roadmap narrative (this doc) | Abhishek Chugh | Abhishek Chugh |
| Metric definitions & feature linkage | Abhishek Chugh | Abhishek Chugh |
| Capability inventory accuracy | Abhishek Chugh | Keerthan K |
| FloDown / ontology foundations | Dennis Müller | Dennis Müller |

---

## Implementation map

| Component | Path |
| --- | --- |
| Web app (UI + server functions) | `src/` |
| Database schema | `prisma/schema.prisma` |
| FAU modules catalog | `modules/` (configured via `MODULES_DIR`) |
| FloDown WASM assets | `public/flodown/` |
| Uploaded PDFs (runtime) | `uploads/` |
| Static symbolic catalog | `catalog.json` |

## Related docs

- [`glox-features.md`](./glox-features.md) — shipped features
- [`../prds/domains/auth.md`](../prds/domains/auth.md) — authentication PRD
- [`../prds/domains/flodown-blocks.md`](../prds/domains/flodown-blocks.md) — FloDown block PRD
- [`../../public/flodown/README.md`](../../public/flodown/README.md) — FloDown integration guide
- [`../../blue/workflow/note.en.pdf`](../../blue/workflow/note.en.pdf) — design blue note
