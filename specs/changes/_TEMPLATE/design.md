# Design: <feature-name>

> **Layer:** *how* — **SDD / tech-spec delta** for the current stack. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical tech specs until Archive.
>
> **Depends on:** Signed `clarify.md`; `proposal.md` reviewed. SDD = policy and boundaries on the current stack — not pseudo-code.
> See [spec-authoring §7](../../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).

---

## SDD delta

<!-- Critical areas: EARS rules per spec-authoring §2–3. Platform-specific wiring, data contracts, error states. -->

## Boundaries

<!-- Files, modules, API routes, DB tables, tenants, blast radius. -->

| Area | Paths / identifiers |
| --- | --- |
| Code | |
| Data | |
| Tenants / tiers | |

## ADR alignment

<!-- Cite existing ADRs, or: **Supersede:** draft ADR-NNNN in this change. -->

## Operations

<!-- Vendor ZDR, deployment, flags, secrets — link to /specs/engineering/deployment/ or /specs/engineering/external-deps/ or write N/A. -->

| Concern | Link or N/A |
| --- | --- |
| Vendors | |
| Deployment / flags | |

## Test mapping

<!-- Every EARS rule in proposal.md + design.md → test. Every MUST NOT → negative test. -->

| Rule ID / summary | Test (file or describe block) | Layer (integration / unit / E2E) |
| --- | --- | --- |
| | | |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4) — add after review:

Upstream review: <name> — <date>
Scope: design
Teach-back: confirmed
-->
