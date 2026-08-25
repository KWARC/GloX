---
id: symbol-propagation
featured: true
upstream:
  - symbols-semantics
compliance: []
code:
  - src/serverFns/SymbolPropagation.server.ts
  - src/server/ftml/convertLocalSymbolToMathHub.ts
---

# SDD: Symbol propagation

## Domain context

Owns bulk replacement of local symbol references (and MathHub URI replacement) across FloDown block
statements with version history per changed block.

Out of scope:

- Symbol create/delete/confirm — [`registry.md`](./registry.md)
- sTeX export URI expansion — `curation-export/stex-export.md`

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/SymbolPropagation.server.ts` | Finds referencing blocks and applies local or MathHub URI replacements. |
| `src/server/ftml/convertLocalSymbolToMathHub.ts` | Rewrites definiendum and symref `uri` values inside FTML ASTs. |

## Business rules

**S-SYM-03 (Event-Driven):** WHEN `applySymbolPropagation` succeeds, the system MUST replace matching
local symbol URI strings in affected FloDown block statements and MUST append a version history row
for each changed block. Match keys are opaque URIs after cutover, not short names.

**Upstream:** R-SYM-03

**S-SYM-03a (Event-Driven):** WHEN `applyMathHubReplacement` succeeds, the system MUST replace matching
MathHub URIs in affected statements and MUST record version history for each changed block.

**Upstream:** R-SYM-03 (same product outcome for external URI replacement)

**S-SYM-06a (Ubiquitous):** Propagation handlers SHOULD reject Extractor-role callers; today they only
check login — see BUG-003 in [`registry.md`](./registry.md).

**Upstream:** R-SYM-06

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-SYM-03 | R-SYM-03 | Gap |
| S-SYM-03a | R-SYM-03 | Gap |
| S-SYM-06a | R-SYM-06 | Gap |

## Related docs

- [`symbols-semantics.md`](../../../prds/domains/symbols-semantics.md)
- [`registry.md`](./registry.md)
- [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
