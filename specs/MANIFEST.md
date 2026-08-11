# Archive manifest

Portable export of the **documentation harness** from the Wald monorepo (`wald-nx-next`). Generated for
reuse in unrelated projects.

## Included (scheme / process)

| Path | Purpose |
| --- | --- |
| `README.md` | Entry point and folder taxonomy (sanitized) |
| `BACKFILL.md` | Step-by-step adoption guide for a new repo |
| `DEVELOPER_GUIDE.md` | Human/agent workflow (lightweight vs full SDD, OPSX) |
| `ai-native-development-architecture.md` | Layered spec model, operating modes, classifier |
| `traced-knowledge-graph.md` | Node kinds, upstream graph, engagement inputs |
| `changes/` | OPSX delta workflow + `_TEMPLATE/` + `CLARIFY_AND_PROPOSE.md` |
| `engineering/spec-authoring.md` | EARS, frontmatter, PRD/SDD/decision craft |
| `engineering/glossary.md` | Redirect to domain dictionary |
| `engineering/decisions/_TEMPLATE.md` | Decision atom template |
| `engineering/features/_TEMPLATE/` | SDD + topic index templates |
| `engineering/feature.md` | How to mark gold-standard examples (empty index) |
| `engineering/README.md` | Engineering folder index (sanitized) |
| `engineering/decisions/README.md` | Decision format (sanitized) |
| `engineering/features/README.md` | SDD folder index (sanitized) |
| `engineering/external-deps/README.md` | E-* classifier (sanitized) |
| `prds/_TEMPLATE/prd.md` | PRD template |
| `prds/README.md` | PRD folder index |
| `product/_TEMPLATE.md` | Product brief template |
| `product/README.md` | Product doc rules (sanitized) |
| `meta/README.md` | Dictionary location |
| `meta/domain-dictionary.TEMPLATE.yaml` | Starter dictionary (process terms only) |
| `organization/README.md` | Org meta layer (sanitized) |
| `organization/incidents/README.md` | Incident/postmortem convention |
| `review/REVIEW_GUIDE.md` | Upstream review, Verify, Testing Trophy |
| `review/TESTING_GUIDE.md` | Test layout and CI strategy (adapt examples) |
| `review/README.md` | Review folder index |
| `review/ai-native-development-architecture-industry-review/README.md` | Optional periodic benchmark layout |

## Deliberately excluded (project data)

| Category | Examples in Wald repo | Your backfill |
| --- | --- | --- |
| Product briefs | `wald-saas.md`, feature inventories | Write under `/specs/product/` |
| PRDs | compliance, commercial, domain PRDs | Write under `/specs/prds/` |
| SDDs | billing, onboarding, routing, encryption | Write under `/specs/engineering/features/` |
| Decisions | `D-BILL-*`, `D-ROUTE-*`, … | Write under `/specs/engineering/decisions/` |
| External deps | OpenAI, Vertex, libsodium quirks | Write under `/specs/engineering/external-deps/` |
| Deployment | LD, release runbook, env | Write under `/specs/engineering/deployment/` |
| Domain dictionary | Full `domain-dictionary.yaml` | Start from `domain-dictionary.TEMPLATE.yaml` |
| Organization roster | `organization.md` | Write under `/specs/organization/` |
| OPSX archives | Dated folders under `changes/archive/` | Created as you ship full SDD work |
| CI lint scripts | `pnpm run specs:check-*` | Optional — see BACKFILL §6 |
| Cursor skills | `.cursor/skills/opsx-*` | Optional — see BACKFILL §7 |

## Wald-specific examples in copied docs

Some canonical files (`spec-authoring.md`, `TESTING_GUIDE.md`, architecture) still mention Wald as
**illustrative examples** of how to apply the scheme. Replace or ignore those when backfilling; they are
not requirements for your project.

## Version

Exported from `wald-nx-next` specs tree. Re-export after major harness changes if you want to sync
improvements back to other repos.
