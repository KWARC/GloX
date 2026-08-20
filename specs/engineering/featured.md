# Featured specs (gold-standard examples)

Agents authoring binding PRDs or SDDs MUST read the matching `_TEMPLATE` ([`prds/_TEMPLATE/`](../prds/_TEMPLATE/),
[`features/_TEMPLATE/`](./features/_TEMPLATE/)) and mirror the structure of a **featured** example for
that doc type. For SDDs, copy **Layer | Responsibility** prose style from featured examples
([spec-authoring §3.2.1](./spec-authoring.md#321-sdd-prose)) — not code-audit shorthand.

Set `featured: true` in frontmatter only after upstream review — not on work-in-progress drafts.

## Featured PRDs

| File | Domain |
| --- | --- |
| [`prds/domains/auth.md`](../prds/domains/auth.md) | Authentication & authorization |
| [`prds/domains/documents-extraction.md`](../prds/domains/documents-extraction.md) | Documents & extraction |
| [`prds/domains/flodown-blocks.md`](../prds/domains/flodown-blocks.md) | FloDown blocks |
| [`prds/domains/symbols-semantics.md`](../prds/domains/symbols-semantics.md) | Symbols & semantics |
| [`prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) | Module descriptions |
| [`prds/domains/curation-export.md`](../prds/domains/curation-export.md) | Curation & export |

## Featured SDDs

| File | Domain |
| --- | --- |
| [`features/auth/auth-sessions.md`](./features/auth/auth-sessions.md) | Auth sessions |
| [`features/documents-extraction/upload-and-ownership.md`](./features/documents-extraction/upload-and-ownership.md) | Document upload & ownership |
| [`features/documents-extraction/llm-suggestion-cache.md`](./features/documents-extraction/llm-suggestion-cache.md) | LLM suggestion cache |
| [`features/flodown-blocks/lifecycle.md`](./features/flodown-blocks/lifecycle.md) | FloDown block lifecycle |
| [`features/symbols-semantics/registry.md`](./features/symbols-semantics/registry.md) | Symbol registry |
| [`features/symbols-semantics/propagation.md`](./features/symbols-semantics/propagation.md) | Symbol propagation |
| [`features/symbols-semantics/search.md`](./features/symbols-semantics/search.md) | Symbolic catalog search |
| [`features/symbols-semantics/wikipedia-lookup.md`](./features/symbols-semantics/wikipedia-lookup.md) | Wikipedia lookup for new symbols |
| [`features/module-descriptions/workspace.md`](./features/module-descriptions/workspace.md) | Module description workspace |
| [`features/module-descriptions/export.md`](./features/module-descriptions/export.md) | Module description TeX export |
| [`features/curation-export/queue.md`](./features/curation-export/queue.md) | Curation queue & status |
| [`features/curation-export/latex-versioning.md`](./features/curation-export/latex-versioning.md) | LaTeX draft/final |
| [`features/curation-export/stex-export.md`](./features/curation-export/stex-export.md) | sTeX generation & provenance |

When adding a new featured spec, update this index and set `featured: true` in that file's frontmatter.

**Accepted gaps across featured set:** all Test mapping rows Gap until Phase F tests; BUG-001
(document ownership on FloDown mutations); BUG-002 (module definition shared FloDown auth);
BUG-003 (symbol server auth/role gaps); BUG-004 (curation/LaTeX server auth gaps).
