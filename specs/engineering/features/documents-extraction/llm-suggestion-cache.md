---
id: llm-suggestion-cache
featured: true
upstream:
  - documents-extraction
compliance: []
code:
  - src/serverFns/llmSuggestion.server.ts
  - src/server/llm.ts
  - src/hooks/files/useLlmFloDownBlockSuggestions.ts
---

# SDD: LLM definition suggestion cache

## Domain context

Owns content-hash caching of document-wide LLM definition suggestions so unchanged documents reuse
prior OpenAI results.

Out of scope:

- Document upload/ownership — [`upload-and-ownership.md`](./upload-and-ownership.md)
- Accepting suggestions into FloDown blocks — `flodown-blocks/lifecycle.md`
- Per-block definienda LLM calls nested during cache write — not separately hash-cached

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/llmSuggestion.server.ts` | Reads cached suggestions by document and writes new suggestion batches after OpenAI calls. |
| `src/server/llm.ts` | Computes SHA-256 of document full text and stores/retrieves the hash inside `LlmSuggestion.customPrompt`. |
| `useLlmFloDownBlockSuggestions` | Client orchestration for cache hit vs regenerate. |

## Data contracts

| Artifact | Notes |
| --- | --- |
| `LlmSuggestion` | One batch per document; `customPrompt` embeds full-text hash |
| `LlmSuggestedDefinition` | Per-page suggestion spans; unique on `(llmSuggestionId, documentPageId)` |
| Hash | `getFullTextHash` = SHA-256 hex of concatenated page text |

## Business rules

**S-DOC-06 (Event-Driven):** WHEN `getLlmSuggestionsByDocument` runs for an owned Document, IF the
stored full-text hash matches the current document text hash, the system MUST return the cached
suggestion set; OTHERWISE the system MUST treat the cache as a miss.

**Upstream:** R-DOC-06

Ownership: cache read verifies Document ownership; regenerate path must remain authenticated.

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-DOC-06 | R-DOC-06 | Gap |

## Related docs

- [`documents-extraction.md`](../../../prds/domains/documents-extraction.md)
- [`upload-and-ownership.md`](./upload-and-ownership.md)
- [`../../external-deps/vendors/openai.md`](../../external-deps/vendors/openai.md)
