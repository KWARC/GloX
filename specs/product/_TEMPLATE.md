# [Product name] — [one-line tagline]

> **Layer:** Intent / **context** — orientation only, not a binding build spec. **Do not write tests
> from this file.** Testable MUST rules belong in `/specs/engineering/features/` or `/specs/prds/`.
> See [`ai-native-development-architecture.md`](../ai-native-development-architecture.md) §4.B.
>
> **Doc ownership:** See [Product doc ownership](#product-doc-ownership) below.
>
> **Commercial / billing:** link to [`pricing_and_entitlements.md`](../prds/commercial/pricing_and_entitlements.md).
>
> **Implementation:** repos and sibling services — [Implementation map](#implementation-map) at bottom.

---

## Inputs

<!-- Lightweight upstream links — product ≠ f(engagement) alone. See traced-knowledge-graph §4.7. -->
<!-- Link: feedback.md, commercial PRD, organization.md, prior briefs. No metric dashboards in git. -->

- **Engagement / feedback:** [`feedback.md`](./feedback.md)
- **GTM / commercial:** [`pricing_and_entitlements.md`](../prds/commercial/pricing_and_entitlements.md)
- **Org / accountability:** [`organization.md`](../organization/organization.md)

---

## Vision & positioning



## Target customer & use cases



## Core value proposition



## Plans & packaging

<!-- Partner SKUs and billing mechanics → pricing_and_entitlements.md. No prices in this brief. -->

## Tenants & packaging

<!-- Commercial model: e.g. Wald-direct = single Secure-tier offering; partners = Standard + Secure plans.
     Per-tenant branding (product name, engine display name, plan labels) → pricing_and_entitlements.md § Tenant branding.
     No prices here. -->

## Features

**Last verified:** YYYY-MM-DD

<!-- If this file grows past ~3 pages, move the feature body to [product]-features.md and leave a summary + link here.
     Conventions:
     - Grouped lists, not tenant×feature matrices.
     - Each feature: title, **What it does** (1–3 sentences), optional **Variations** (Plan / Tenant) — only for product-intentional differences.
     - Product language only — what users/admins see and can do. No undefined engineering terms.
     - Requirements, not implementation: no feature flags, rollouts, or deploy toggles as product behavior (see product/README.md).
     - Code/DB identifiers (enums, table fields, component names) → add to domain-dictionary.yaml; link from here, don't inline.
     - Term flow: org → product → engineering (see product/README.md).
     - No Sources, no marketing copy in feature entries.
     - Wald-direct: always Secure-tier; plan subsections apply to partner tenants only.
     - Default tenant wording: Wald-direct vs partner tenants; name individual partners only when behavior diverges.
     - Branding strings → pricing_and_entitlements.md § Tenant branding. -->

### All tiers

- **Feature title** — One-line summary.
  - **What it does:** …
  - **Variations:** *(omit if universal; Plan = partner only; Tenant = Wald-direct vs partner tenants)*

### Secure tier only

<!-- Wald-direct always; partner Secure / Privacy+ plan -->

### Partner Standard only

### Wald-direct only

## Known gaps & non-goals



## Prioritization principles



## Roadmap



### Now

### Next

### Later

## Customer feedback



## Success metrics




| Metric | Definition | Accountable | Notes |
| ------ | ---------- | ----------- | ----- |
|        |            |             |       |


**Reporting:** Per `tenant` where applicable; rollups may be added later.
**Last snapshot:** *(optional — `YYYY-MM-DD`, or link to dashboard)*

## Customer lifecycle



## GTM & distribution

## Risks & dependencies

## Product doc ownership


| Concern                               | Accountable  | Typical responsible (today)      |
| ------------------------------------- | ------------ | -------------------------------- |
| Product direction & external promises | CEO          | CEO                              |
| Roadmap narrative (this doc)          | CEO          | Product Lead                     |
| Metric definitions & feature linkage  | Product Lead | Product Lead                     |
| UX discovery & design input           | CEO          | UX Designer                      |
| Capability inventory accuracy         | Product Lead | Product Lead + Product Engineers |


**Rule:** One accountable person per row. Wearing multiple hats is fine; **arbitrary split is not** —
if you own a metric, you own (or explicitly delegate) the features that move it. Detailed control
leaves live in [`organization.md`](../organization/organization.md).

---

## Implementation map



## Related docs

