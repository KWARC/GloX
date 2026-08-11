# Organization specs

**Meta layer** — who we are and **who owns what** for security and critical product areas. Not
product technical detail (that lives in [`/specs/product/`](../product/) or
[`/specs/engineering/features/`](../engineering/features/) SDDs).

| Document | Purpose |
| --- | --- |
| [organization.md](./organization.md) | People roster, critical areas, escalation |
| [incidents/](./incidents/) | Postmortems and incident records |
| [engineering/features/](../engineering/features/) | Tech specs (SDDs) for critical areas |

Full `/specs` index: [`/specs/README.md`](../README.md). Architecture:
[`ai-native-development-architecture.md`](../ai-native-development-architecture.md) §4 (taxonomy).
Product-doc authoring: [`product/README.md`](../product/README.md).

**Backfill:** Keep [`organization.md`](./organization.md) current with owners for each critical area
in root `AGENTS.md`. That file is enough for HALT escalation — no separate accountability tree.
