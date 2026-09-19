---
id: uri-retarget
featured: true
upstream:
  - symbols-semantics
compliance: []
code:
  - src/serverFns/uriRetarget.server.ts
  - src/server/ftml/retargetUriInAst.ts
  - src/server/ftml/replaceLocalSymbolWithMathHub.ts
  - src/server/auth/requireAdminOrCurator.ts
  - src/components/MathHubDuplicateDialog.tsx
  - src/components/RewriteMathHubUriDialog.tsx
---

# SDD: URI retarget

## Domain context

Owns opaque replacement of one symbol URI with another in current FTML. Product uses:

- **MathHub duplicate** — local declaration URI → chosen MathHub URI; drop the local declaration.
- **Rewrite other occurrences** — MathHub URI → local URI in selected FloDown blocks.

Includes ModuleDescription Title/Inhalt/Lernziele JSON (MathHub duplicate) and FloDown version
history per changed current statement.

Out of scope:

- Symbol create/delete/confirm — [`registry.md`](./registry.md)
- sTeX export URI expansion — `curation-export/stex-export.md`
- Page mark references — not rewritten on MathHub duplicate

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/server/ftml/replaceLocalSymbolWithMathHub.ts` | In-memory scan and retarget (definienda and symrefs; drop declaration). |
| `src/serverFns/uriRetarget.server.ts` | `listLocalSymbolUriHits`, `replaceLocalSymbolWithMathHub`; sibling `retargetMathHubUriInSelectedBlocks`. |
| `src/server/ftml/retargetUriInAst.ts` | Opaque URI replace in FTML ASTs (`retargetUriInAst`). |
| `src/server/auth/requireAdminOrCurator.ts` | Curator/Admin gate for list, replace, confirm, undo. |
| `src/components/MathHubDuplicateDialog.tsx` | MathHub-duplicate hit list (Discarded chip; module field labels). |
| `src/components/RewriteMathHubUriDialog.tsx` | Optional rewrite of other FloDown blocks that still use a MathHub URI. |

## Business rules

**S-SYM-03 (Event-Driven):** WHEN `replaceLocalSymbolWithMathHub` succeeds, the system MUST, in one
transaction: iterate every `FloDownBlock` and every `ModuleDescription`; replace matching
definiendum and symref `uri` values from the given local URI to the given MathHub URI by opaque
string equality; remove that local URI from the declaring block’s `declaredSymbolsInfo`; append a
`FloDownBlockVersion` row and increment `currentVersion` for each FloDown block whose **current**
statement changed (excluding a defining block deleted in the same transaction). The handler MUST
accept `definingBlockAction` of `keep` or `delete` and MUST reject missing or invalid values. WHEN
`definingBlockAction` is `delete`, the handler MUST delete the FloDown block that declared the local
URI after retarget, and MUST NOT run the R-FDB-03 symref-unwrap path for that URI (retarget already
updated other statements). WHEN `definingBlockAction` is `delete` and that block’s
`declaredSymbolsInfo` lists any URI other than the local URI being merged, the handler MUST reject
the request. The handler MUST NOT accept a client list of block IDs. The handler MUST NOT rewrite
historic version JSON. Module Title/Inhalt/Lernziele JSON has no version table; those columns MUST
be overwritten in place when they change.

**Upstream:** R-SYM-03, R-SYM-20, R-SYM-23

**S-SYM-03a (Event-Driven):** WHEN `retargetMathHubUriInSelectedBlocks` succeeds, the system MUST
replace matching MathHub URIs in the selected statements and MUST record version history for each
changed block.

**Upstream:** R-SYM-03 (same product outcome for external URI replacement)

**S-SYM-14 (Event-Driven):** WHEN `listLocalSymbolUriHits` succeeds, the system MUST return every
FloDown block whose current statement contains the local URI (including discarded; including the
declaring block) and every ModuleDescription Title, Inhalt, or Lernziele statement that contains it,
with enough fields for the UI to show a Discarded indicator and a module-id plus Title/Inhalt/Lernziele
label.

**Upstream:** R-SYM-21

**S-SYM-15 (Ubiquitous):** `listLocalSymbolUriHits` and `replaceLocalSymbolWithMathHub` MUST reject
Extractor-role callers and MUST reject unauthenticated callers (`requireAdminOrCurator` or
equivalent). `confirmSymbolNotDuplicate` and `undoSymbolConfirmation` MUST use the same role gate.

**Upstream:** R-SYM-06, R-SYM-07

**S-SYM-16 (Ubiquitous):** MathHub duplicate from Deduplication and from Semantic Panel when the
selected definiendum URI is a **local declaration** MUST call `replaceLocalSymbolWithMathHub` with
that declaration URI and the chosen MathHub URI. The write MUST NOT use a primary-only
`replaceSemantic` for this flow.

**Upstream:** R-SYM-03, R-SYM-20

Opaque URI replace stays `retargetUriInAst` (R-SYM-18).

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-SYM-03 | R-SYM-03, R-SYM-20, R-SYM-23 | `replaceLocalSymbolWithMathHub.test.ts` (in-memory; live-DB Gap) |
| S-SYM-03a | R-SYM-03 | Gap (sibling MathHub→local path) |
| S-SYM-14 | R-SYM-21 | `collectLocalSymbolUriHits` in `replaceLocalSymbolWithMathHub.test.ts` |
| S-SYM-15 | R-SYM-06, R-SYM-07 | `roleMayReplaceLocalSymbolWithMathHub` unit; live-DB handler Gap |
| S-SYM-16 | R-SYM-03, R-SYM-20 | Wired in `MathHubDuplicateDialog.tsx` (E2E Gap) |

## Related docs

- [`symbols-semantics.md`](../../../prds/domains/symbols-semantics.md)
- [`registry.md`](./registry.md)
- [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
