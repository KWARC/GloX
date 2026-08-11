---
id: <prd-id>
featured: false
upstream:
  - <upstream-prd-or-brief-id>
compliance:
  - <compliance-prd-id>
code:
  - specs/engineering/features/<domain>/<sdd-file>.md
---

# PRD: <name>

<One to three sentences: domain scope for product outcomes and any binding incident-risk promises.
Link dictionary terms by preferred label. Classifier: spec-authoring §7 / architecture §4.6.>

## Business rules

### Product outcomes

Observable or storefront promises (power user, team admin, or sold capability):

**R-<AREA>-01 (Event-Driven):** WHEN … and R-<AREA>-02 through R-<AREA>-04 do not apply, the system MUST …

**R-<AREA>-02 (Event-Driven):** WHEN a user has pending email invitations, the system MUST offer
acceptance before R-<AREA>-01 applies, except when R-<AREA>-14 applies.

**R-<AREA>-04 (State-Driven):** WHILE <block precondition>, the system MUST block product access,
MUST NOT assign a team, and MUST show <user-visible screen> that <what it explains> and provides
<control the user can take>.

### Binding operator / compliance promises

Silent incident-risk obligations (or write `N/A — none` for pure domain PRDs). One thin outcome per
rule; **Rationale MUST name the incident class**.

**R-<AREA>-05 (Ubiquitous):** The system MUST NOT …

**Rationale:** <Incident class — e.g. operator can read data at rest; forged billing webhook.>

Use dictionary preferred labels. Default-outcome rules MUST list preventing rules by ID. Evaluation
order belongs in the SDD — see [spec-authoring §4.3](../../engineering/spec-authoring.md#43-multi-tenant-and-multi-channel-domains).
Run `pnpm run specs:check-prd-prose` before review. Self-check PRD layering
([spec-authoring §3.1.1](../../engineering/spec-authoring.md#prd-layering)).

## Out of scope

Behaviors owned by other PRDs or SDDs (not process phases):

- <Behavior> — see `<other-prd-or-sdd>.md`
- <Behavior> — see `<other-prd-or-sdd>.md`

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-<AREA>-01 | `<sdd-file>.md` S-<SDD-AREA>-01 |
| R-<AREA>-02 | `<sdd-file>.md` S-<SDD-AREA>-02 |

## Related docs

- [`<sdd-file>.md`](../../engineering/features/<domain>/<sdd-file>.md)
- [`<upstream>.md`](<path>)
