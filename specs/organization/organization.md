# GloX organization

**Meta layer** — people, escalation, and accountability for critical areas. Not binding product
requirements (those live in PRDs).

## Project


| Field       | Value                                            |
| ----------- | ------------------------------------------------ |
| Product     | GloX — FAUstairs Glossary Extractors and Curator |
| Institution | FAU Erlangen-Nürnberg (FAUstairs project)        |
| Repository  | Single TanStack Start app at repo root           |


## People roster


| Name             | Role                         | Notes                                                                       |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------- |
| Michael Kohlhase | Project lead                 | Professor at FAU; FAUstairs / product direction; author of the blue note    |
| Marc Berges      | Advisor                      | Professor at FAU                                                            |
| Abhishek Chugh   | Product and Engineering Lead | Accountable for product specs and engineering decisions                     |
| Keerthan K       | Primary implementer          | Day-to-day implementation of GloX                                           |
| Dennis Müller    | FloDown library              | Manages FloDown; heavily influences GloX ontology and FTML/sTeX foundations |




## Critical area ownership

Maps to `[AGENTS.md](../../AGENTS.md)` § Critical areas. Agents HALT on ambiguous policy in these
areas and escalate to the accountable owner.


| Critical area                        | Accountable    | Responsible (today) | Escalation                       |
| ------------------------------------ | -------------- | ------------------- | -------------------------------- |
| Auth & sessions                      | Abhishek Chugh | Keerthan K          | Michael Kohlhase                 |
| Authorization & document ownership   | Abhishek Chugh | Keerthan K          | Michael Kohlhase                 |
| FloDown block lifecycle              | Abhishek Chugh | Keerthan K          | Dennis Müller → Michael Kohlhase |
| Symbol propagation & deduplication   | Abhishek Chugh | Keerthan K          | Dennis Müller → Michael Kohlhase |
| FTML/sTeX export                     | Abhishek Chugh | Keerthan K          | Dennis Müller → Michael Kohlhase |
| Role gates (EXTRACTOR/CURATOR/ADMIN) | Abhishek Chugh | Keerthan K          | Michael Kohlhase                 |


Ontology and FloDown semantics questions (symrefs, export identity, statement shape) escalate to
**Dennis Müller** before product-direction escalation to **Michael Kohlhase**. Advisory input from
**Marc Berges** on research/process questions when useful.

## Accountability process

1. **Binding spec changes** in critical areas require upstream review per
  `[REVIEW_GUIDE.md](../review/REVIEW_GUIDE.md)` §1 before merge.
2. **Incidents** (data loss, unauthorized access, broken export) → record under
  `[incidents/](./incidents/)` and notify Abhishek Chugh within one business day; escalate to
   Michael Kohlhase for product-impacting incidents.
3. **Product direction** questions → Michael Kohlhase (advisor: Marc Berges).
4. **Engineering trade-offs** not covered by specs → Abhishek Chugh; propose a `D-`* decision atom
  or lightweight PR/SDD delta before implementing. FloDown/ontology trade-offs involve Dennis Müller.



## Related docs

- `[../product/glox.md](../product/glox.md)` — product brief
- `[../AGENTS.md](../../AGENTS.md)` — agent constitution
- `[../prds/domains/](../prds/domains/)` — binding domain PRDs

