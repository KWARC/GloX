# `/specs` — Portable documentation scheme

This archive is a **project-agnostic copy** of the meta documents that define Wald's
**docs-as-contracts** harness. Copy the tree into your repo as `/specs` (or merge with an existing
docs root) and follow [BACKFILL.md](./BACKFILL.md) to populate project-specific content.

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
| 1 | [BACKFILL.md](./BACKFILL.md) | First-time adoption in a new repo |
| 2 | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Workflow — lightweight vs full SDD, OPSX |
| 3 | [ai-native-development-architecture.md](./ai-native-development-architecture.md) | System design — layers, operating modes |
| 3a | [traced-knowledge-graph.md](./traced-knowledge-graph.md) | Node kinds, upstream edges |
| 3b | [changes/CLARIFY_AND_PROPOSE.md](./changes/CLARIFY_AND_PROPOSE.md) | Clarify → Propose principles |
| 4 | [engineering/spec-authoring.md](./engineering/spec-authoring.md) | EARS, templates, dictionary rules |
| 5 | [review/REVIEW_GUIDE.md](./review/REVIEW_GUIDE.md) | Review gates + Testing Trophy |
| 5b | [review/TESTING_GUIDE.md](./review/TESTING_GUIDE.md) | How to write/generate tests |

We are **lightweight by default**; use full SDD in critical areas — see
[architecture §2](./ai-native-development-architecture.md#2-operating-modes).

## Layout

```
/specs
  ├── README.md
  ├── BACKFILL.md
  ├── ai-native-development-architecture.md
  ├── traced-knowledge-graph.md
  ├── DEVELOPER_GUIDE.md
  ├── /organization              # People, accountability, incidents
  ├── /product                   # Product docs (briefs) — not PRDs
  ├── /prds
  │   ├── /compliance            # Supreme authority (if applicable)
  │   ├── /commercial            # SKUs, entitlements (if applicable)
  │   └── /domains               # Domain PRDs
  ├── /meta
  │   └── domain-dictionary.yaml
  ├── /engineering
  │   ├── /features              # SDDs (critical areas)
  │   ├── /decisions             # D-* atoms
  │   ├── /external-deps         # E-* vendor/library facts
  │   └── /deployment            # Runtime, release, feature flags
  ├── /review
  └── /changes                   # OPSX deltas; archive/; _TEMPLATE/
```

See [MANIFEST.md](./MANIFEST.md) for what this archive includes and deliberately omits.
