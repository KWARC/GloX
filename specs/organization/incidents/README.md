# Incidents and postmortems

Durable record of production incidents, near-misses, and postmortems that inform Binding PRDs,
`D-*` decisions, and SDDs.

**Not binding contracts** — compliance PRDs and SDDs remain authoritative. This folder captures
**what already hurt us** so agents and humans do not repeat the same gap ([traced knowledge graph §1.2](../../traced-knowledge-graph.md#12-problem-side-contracts--why-prd--fproduct)).

## When to add a file

- After a customer- or compliance-impacting incident with a written postmortem
- When a Binding PRD rule's **Rationale** names an incident class — link the postmortem here
- When a new `D-*` decision exists primarily because of production pain

## File convention

One markdown file per incident: `YYYY-MM-DD-<short-slug>.md`

Suggested sections:

1. **Summary** — what happened, blast radius, duration
2. **Root cause** — technical and process
3. **Follow-ups** — links to PRD rules (`R-*`), SDDs (`S-*`), decisions (`D-*`), tickets
4. **Lessons** — what must not happen again (feeds Binding rules if not already covered)

## Related

- [organization.md](../organization.md) — people, critical areas, escalation
- [traced-knowledge-graph.md](../../traced-knowledge-graph.md) — incidents as upstream nodes
