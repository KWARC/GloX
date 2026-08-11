# `/specs/prds` — Product requirements (binding)

**PRDs are docs-as-contracts** — testable obligations on the implementation path for full SDD.
EARS in critical areas. Update in the **same commit** as behavior changes.

**Classifier:** [two-filter tree](../ai-native-development-architecture.md#46-classifying-a-rule-two-filter--wording-constraint)
([spec-authoring §7](../engineering/spec-authoring.md#what-belongs-in-prd-sdd-and-code)) — Product
outcomes and thin Binding incident-risk promises. Stack how lives in SDDs.

**Not PRDs:** product briefs and feature inventory in [`/specs/product/`](../product/) — orientation only.

| Directory | Role |
| --- | --- |
| [compliance/](./compliance/) | **Supreme authority** — customer/auditor/regulatory promises (OPSX halts here) |
| [commercial/](./commercial/) | SKUs, plan gates, packaging (if applicable) |
| [domains/](./domains/) | Domain product outcomes (two-filter) |

Tech specs that wire the current stack: [`/specs/engineering/features/`](../engineering/features/).

## Start from template

Copy [`_TEMPLATE/prd.md`](./_TEMPLATE/prd.md) into `domains/`, `commercial/`, or `compliance/` when
authoring a new PRD. [`_TEMPLATE/`](./_TEMPLATE/) stays pristine on `main`.
