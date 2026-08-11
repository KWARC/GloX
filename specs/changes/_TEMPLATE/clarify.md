# Clarify: <title>

> **Phase:** Clarify — decision record before delta files. Copy from `_TEMPLATE/` at the start of
> Clarify; update iteratively until the human signs off. Do **not** draft `proposal.md`, `design.md`,
> or `tasks.md` until **Human decisions** below are complete and signed.
>
> **Canonical guide:** [CLARIFY_AND_PROPOSE.md](../CLARIFY_AND_PROPOSE.md).

---

## Feature request (input)

<!-- Paste or link the FR (Linear issue, brief, Slack thread). -->

## Restatement

<!-- Agent: one paragraph — the outcome we intend to bind. Human must approve before lock. -->

**Human approval:** <!-- approved / revised on <date> by <name> -->

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | | paths |
| ADR alignment | pass / conflict / needs ADR | |
| Compliance | pass / HALT → owner | |
| Blast radius (`code` in frontmatter) | | |
| Blocking questions | none / list | |

## Open questions

<!-- Gaps that block binding specs. Each row needs resolution, deferral with owner + date, or PM escalation. -->

| Question | Status | Resolution / owner | Date |
| --- | --- | --- | --- |
| | open / deferred / resolved | | |

## Options

<!-- When a genuine fork exists: list approaches with product impact, engineering cost, and risk. -->
<!-- When the path is obvious: write "N/A — single recommended path" and state the recommendation. -->

| Option | Product impact | Engineering cost | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| | | | | |

**Chosen approach:** <!-- human fills after engineer + PM agree when tradeoffs matter -->

## v1 scope

<!-- Smallest shippable slice for this branch. -->

## Non-goals and v2

### Non-goals (not in this change)

<!-- Explicit scope stops. -->

### v2 (separate FR later)

<!-- Deferred items — must not appear in v1 deltas. Write "N/A" if scope was not split. -->

## PRD change decision

<!-- Agent recommends; human confirms. -->

- [ ] **PRD delta required** — new or changed binding outcomes for v1
- [ ] **No PRD change** — governed by: <!-- links -->

**Human confirmation:** <!-- name, date -->

## Accepted tradeoffs

<!-- When the FR was adjusted (P2): options considered, compromise, engineer + PM agreement. -->
<!-- Write "N/A" if the FR ships as originally asked. -->

| Original ask | What v1 ships instead | Why acceptable | Agreed by | Date |
| --- | --- | --- | --- | --- |
| | | | | |

---

## Human decisions (required before Propose)

Complete every applicable item. **Propose must not start** until all are checked and signed.

- [ ] **Restatement** — outcome matches what PM / requester actually asked for (or documented adjustment).
- [ ] **Upstream audit** — compliance pass, or HALT escalated with owner; ADR conflicts resolved or superseding ADR planned.
- [ ] **Open questions** — no unresolved blocking questions; deferrals have owner and date.
- [ ] **Approach** — option chosen (with PM when product impact or compromise is on the table), or N/A with recommendation accepted.
- [ ] **v1 scope** — shippable slice approved.
- [ ] **Non-goals / v2** — deferred work explicit; nothing smuggled into v1.
- [ ] **PRD change** — PRD delta vs **No PRD change** confirmed.
- [ ] **Tradeoffs** — engineer + PM sign-off when the product promise changed (P2).

**Lock it — sign-off**

```
Clarify approved: <name> — <date>
Propose may begin.
```
