# `/specs/product` — Product docs (not PRDs)

**Orientation only** — briefs, roadmap, shipped-feature inventory. **Not on the implementation path.**
Do not write tests from these files.

| Doc | Purpose |
| --- | --- |
| *(add your product briefs here)* | Vision, roadmap, metrics |

**Binding requirements:** [`/specs/prds/`](../prds/) and [`/specs/engineering/features/`](../engineering/features/).

**Upstream inputs:** each brief SHOULD include a lightweight `## Inputs` section linking feedback,
commercial PRDs, and org context — not engagement dashboards alone
([traced knowledge graph §4.7](../traced-knowledge-graph.md#47-product-brief-upstreams)).

Template: [`_TEMPLATE.md`](./_TEMPLATE.md). Taxonomy: [architecture §4.2](../ai-native-development-architecture.md#42-product-docs--orientation-only).

---

## Authoring rules

**DRY:** each fact once in its canonical file; elsewhere one-line pointers. No duplicate tables.

**Term hierarchy (org → product → engineering):** define terms in
[`domain-dictionary.yaml`](../meta/domain-dictionary.yaml) only, then link from product docs and PRDs.
Rules: [spec-authoring §8](../engineering/spec-authoring.md#8-domain-dictionary--glossary).

**Product feature entries:**

- Grouped lists: title + **What it does** (1–3 sentences). Optional **Variations** for intentional
  plan/deployment differences.
- **Product language only** — user/admin-visible behavior. Link glossary for code IDs; decisions for
  routing rationale.
- **Requirements, not implementation** — no feature flags, rollouts, or deploy toggles as product
  behavior unless product explicitly scoped that variation.
- **No deployment×feature matrices** in prose. No marketing copy in feature entries.
- **Split** to `[product]-features.md` when brief exceeds ~3 pages. Set **Last verified** when features
  change.

## Product brief structure (`_TEMPLATE.md`)

1. **PM brief** — vision, customer, value, capabilities, gaps, roadmap (Now/Next/Later in git), metric
   *definitions*, risks, doc ownership.
2. **Implementation map** — repos/deployables; link `/specs/engineering/` for depth.

**Roadmap:** canonical in git; your issue tracker is execution only.
