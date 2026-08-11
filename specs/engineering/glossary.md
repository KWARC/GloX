# Glossary — Ubiquitous language

**The dictionary is one file:** [`domain-dictionary.yaml`](../meta/domain-dictionary.yaml).

Do not maintain term definitions here or in a separate “business glossary.” PRDs, SDDs, product docs,
and agents all read and write the same YAML.

**How to add or change terms:** [spec-authoring.md §8](./spec-authoring.md#8-domain-dictionary--glossary).

## How specs use terms

| Layer | Vocabulary | Defines terms? |
| --- | --- | --- |
| **PRD** (`/specs/prds/`) | `preferred` labels in EARS rules | No — link term IDs from the dictionary |
| **SDD** (`/specs/engineering/features/`) | Same labels + data contracts matching `technical_anchors` | No |
| **Product** (`/specs/product/`) | Customer-visible language | No — use `allowed_aliases` from the dictionary |

Storefront names (e.g. Privacy+) live under `allowed_aliases` on the relevant term in the dictionary,
not as inline PRD definitions. See [pricing_and_entitlements.md](../prds/commercial/pricing_and_entitlements.md)
§ Tenant branding.
