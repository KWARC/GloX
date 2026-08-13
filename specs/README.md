# `/specs` — GloX documentation scheme

Binding specs and workflow docs for **GloX** (The FAUstairs Glossary Extractors and Curator).
New adopters of the harness pattern should start at [BACKFILL.md](./BACKFILL.md).

Truth is **layered, not monolithic**:

| Layer | Role | Binds implementation? |
| --- | --- | --- |
| **Product** (`/specs/product/`) | Briefs, roadmap, shipped-feature inventory | No — orientation only |
| **PRDs** (`/specs/prds/`) | Binding requirements (what the system must do) | Yes |
| **Engineering** (`/specs/engineering/`) | SDDs, decisions, external-deps, deployment | Yes (SDDs in critical areas) |
| **Changes** (`/specs/changes/`) | OPSX work-in-flight (Clarify → Propose → Apply → Archive) | During full SDD only |
| **Review** (`/specs/review/`) | Review gates + Testing Trophy playbook | Process |
| **Meta** (`/specs/meta/`) | Domain dictionary (ubiquitous language) | Vocabulary contract |
| **Organization** (`/specs/organization/`) | People, accountability, incidents | Meta / escalation |

**Start here (read order):**

| Order | Document | Canonical for |
| --- | --- | --- |
| 1 | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Workflow — lightweight vs full SDD, OPSX |
| 2 | [ai-native-development-architecture.md](./ai-native-development-architecture.md) | System design — layers, operating modes |
| 2a | [traced-knowledge-graph.md](./traced-knowledge-graph.md) | Node kinds, upstream edges |
| 2b | [changes/CLARIFY_AND_PROPOSE.md](./changes/CLARIFY_AND_PROPOSE.md) | Clarify → Propose principles |
| 3 | [engineering/spec-authoring.md](./engineering/spec-authoring.md) | EARS, templates, dictionary rules |
| 4 | [review/REVIEW_GUIDE.md](./review/REVIEW_GUIDE.md) | Review gates + Testing Trophy |
| 4b | [review/TESTING_GUIDE.md](./review/TESTING_GUIDE.md) | How to write/generate tests |

We are **lightweight by default**; use full SDD in critical areas — see
[architecture §2](./ai-native-development-architecture.md#2-operating-modes).
