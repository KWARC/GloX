# External dependencies (`/specs/engineering/external-deps`)

Project-specific facts about **external** vendors and libraries that agents cannot infer from code or
live SDK schemas. Not product promises (`R-*`), not wiring (`S-*`), not choices (`D-*`).

**Do NOT document API shapes or SDK method signatures here.** Fetch those at runtime (provider docs).
This tree is only for:

- **Your** commercial/compliance posture (e.g. data residency, ZDR, subprocessors)
- **Missable technical quirks** that nearly caused incidents

## Classifier

| Subfolder | Put here | ID prefix | Do not put here |
| --- | --- | --- | --- |
| [`vendors/`](./vendors/) | Paid cloud / SaaS with compliance or data implications | `E-<VENDOR>-<NN>` | Product promises, wiring, live API schemas |
| [`libraries/`](./libraries/) | Package constraints that force design choices | `E-<LIB>-<NN>` | Style guides, reversible taste |

Decisions (`D-*`) live in [`../decisions/`](../decisions/). Runtime deploy/feature flags live in
[`../deployment/`](../deployment/).

## Index

| Path | Atoms |
| --- | --- |
| [`vendors/openai.md`](./vendors/openai.md) | `E-OPENAI-*` |
| [`vendors/wikipedia.md`](./vendors/wikipedia.md) | `E-WIKI-*` |
| [`vendors/mathhub.md`](./vendors/mathhub.md) | `E-MATHHUB-*` |
| [`vendors/flodown.md`](./vendors/flodown.md) | FloDown WASM facts |
| [`libraries/ftml.md`](./libraries/ftml.md) | `E-FTML-*` |

Cite **`E-VENDOR-01`** from SDDs and PRDs — not file paths.
