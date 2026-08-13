---
id: <sdd-id>
featured: false
upstream:
  - <upstream-prd-id>
compliance:
  - <compliance-prd-id>
code:
  - apps/<app>/<path>
---

# SDD: <name>

## Domain context

<Goal and what this file owns. One to two sentences on user-visible outcome.
This SDD implements PRD Product and Binding outcomes — do not invent a new product promise here.>

Out of scope (sibling SDDs or PRDs):

- <Behavior> — `<other-sdd>.md`

## Architecture boundaries

Map where behavior runs. Use a table with columns **Layer** and **Responsibility**:

| Layer | Responsibility |
| --- | --- |
| `<module-or-route>` | <One complete sentence: what this layer does for this feature. Use dictionary preferred terms; avoid comma-separated shorthand like "GMP inactive" or "no-team redirect".> |

Bulleted lists are acceptable for small SDDs with few touchpoints (see `workos-and-isolation.md`).

## Data contracts

<N/A with one-line justification, or tables for enums / DB shapes / API payloads.>

## Business rules

### <Theme group>

**S-<AREA>-01 (Event-Driven):** WHEN <trigger>, the system MUST <response>.

**Upstream:** R-<PRD-AREA>-<NN> (omit when obvious).

**S-<AREA>-02 (Ubiquitous):** The system MUST <response>.

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-<AREA>-01 | R-<PRD-AREA>-01 | Gap |
| S-<AREA>-02 | R-<PRD-AREA>-02 | Gap |

## Open documentation gaps (optional)

Engineering backlog only — not policy questions for CEO. See [spec-authoring §2.5](../../spec-authoring.md#open-questions-gaps-and-ownership).

- <Item verifiable from code but not yet written as EARS — cite file path>

## Implementation bugs (optional)

Confirmed code defects only — spec is right, code is wrong.

| ID | File(s) | Description |
| --- | --- | --- |
| BUG-… | `<path>` | <defect> |

## Related docs

- [`<upstream-prd>.md`](../../../prds/domains/<upstream-prd>.md)
- [`<sibling-sdd>.md`](./<sibling-sdd>.md)

## Implementation inputs (optional)

<!-- Links only — skills, precedent modules, LD keys. See traced-knowledge-graph §4.6. -->

- [frontend-skill](../../../../.cursor/skills/frontend-skill/SKILL.md) / [backend-skill](../../../../.cursor/skills/backend-skill/SKILL.md)
- Precedent: `<apps/.../neighbor-module.ts>`
