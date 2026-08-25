# Engineering decisions (`/specs/engineering/decisions`)

Locked engineering choices and rejected alternatives — **not** external promises (PRD `R-*`), **not**
wiring detail (SDD `S-*`), **not** vendor/world facts (`E-*`).

## Naming (aligned with PRDs / SDDs)

| Node | Path pattern | Stable ID | Example |
| --- | --- | --- | --- |
| PRD | `prds/<domain>/<topic>.md` | `R-<AREA>-<NN>` | `R-AUTH-01` |
| SDD | `features/<topic>/<sdd>.md` | `S-<AREA>-<NN>` | `S-AUTH-04` |
| **Decision** | `decisions/<slug>.md` | `D-<AREA>-<NN>` | `D-AUTH-02` |
| External fact | `external-deps/vendors/<vendor>.md` or `external-deps/libraries/<lib>.md` | `E-<AREA>-<NN>` | `E-STRIPE-01` |

- **Slug** matches the sibling SDD filename where possible.
- **Cite `D-AUTH-02`** from SDDs and PRDs — same as `R-AUTH-01` / `S-AUTH-04`.

## Format

| Section | Role |
| --- | --- |
| Frontmatter (`related_sdd`, `related_prd`, `code`) | Traceability edges |
| Context | Forces + constraints |
| Decision atoms | Immutable statements (`D-*`) |
| Why | Rejected alternatives |
| Consequences | Safeguards + follow-ons |

**Not in decisions:** EARS test mapping (SDD), vendor tables (`E-*`), customer promises (`R-*`).

## Index

| File | Decision atoms | Status |
| --- | --- | --- |
| [`jwt-session-fingerprint.md`](./jwt-session-fingerprint.md) | D-AUTH-01…03 | Accepted |
| [`password-storage.md`](./password-storage.md) | D-AUTH-04 | Accepted |
| [`flodown-persist-and-boundary.md`](./flodown-persist-and-boundary.md) | D-FTML-01…06 | Accepted |

## When to write

Write a decision file when you lock a non-obvious, hard-to-reverse choice. Skip routine,
easily-reversible choices — those belong in SDDs only.

## How to write

1. Copy [`_TEMPLATE.md`](./_TEMPLATE.md) to `decisions/<slug>.md`.
2. Assign `D-<AREA>-<NN>` atoms. Prefer contiguous numbering **per area**.
3. Set `status: Proposed` in frontmatter; flip to `Accepted` after review.
