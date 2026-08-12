# Specs manifest — GloX

Inventory of the `/specs` documentation harness for the GloX repository.

## Included (scheme / process)

| Path | Purpose |
| --- | --- |
| `README.md` | Entry point and folder taxonomy |
| `BACKFILL.md` | Adoption guide for harness setup |
| `DEVELOPER_GUIDE.md` | Human/agent workflow (lightweight vs full SDD, OPSX) |
| `ai-native-development-architecture.md` | Layered spec model, operating modes, classifier |
| `traced-knowledge-graph.md` | Node kinds, upstream graph, engagement inputs |
| `changes/` | OPSX delta workflow + `_TEMPLATE/` + `CLARIFY_AND_PROPOSE.md` |
| `engineering/spec-authoring.md` | EARS, frontmatter, PRD/SDD/decision craft |
| `engineering/glossary.md` | Redirect to domain dictionary |
| `engineering/decisions/_TEMPLATE.md` | Decision atom template |
| `engineering/features/_TEMPLATE/` | SDD + topic index templates |
| `engineering/featured.md` | Gold-standard examples index |
| `prds/_TEMPLATE/prd.md` | PRD template |
| `product/_TEMPLATE.md` | Product brief template |
| `meta/domain-dictionary.yaml` | Ubiquitous language |
| `review/REVIEW_GUIDE.md` | Upstream review, Verify, Testing Trophy |
| `review/TESTING_GUIDE.md` | GloX test layout and CI strategy |

## GloX-specific content (populated)

| Path | Purpose |
| --- | --- |
| `product/glox.md` | Product brief |
| `product/glox-features.md` | Shipped feature inventory |
| `prds/domains/*.md` | Domain PRDs (auth, documents, FloDown, …) |
| `engineering/features/*/` | SDDs for critical areas (auth, documents, FloDown, symbols, modules, curation) |
| `engineering/decisions/` | JWT fingerprint, password storage |
| `engineering/external-deps/` | OpenAI, MathHub, FloDown, FTML vendor facts |
| `engineering/featured.md` | Featured PRD/SDD gold-standard index |
| `meta/domain-dictionary.yaml` + FloDown/FTML SDDs | Entity ↔ FloDown/FTML mapping |

## Optional / not yet implemented

| Item | Notes |
| --- | --- |
| `pnpm run specs:check-*` | CI lint scripts — see BACKFILL §6, `backfill_todo.md` |
| Playwright E2E | Not configured — see TESTING_GUIDE |
| Vitest integration tests | Runner exists; no test files yet |

## Cursor skills

Agent execution: `.cursor/skills/opsx-*`, `lightweight-plan-archive`, `frontend-skill`, `backend-skill`.
Manifest: `.cursor/skills/opsx/_manifest.yaml`.
