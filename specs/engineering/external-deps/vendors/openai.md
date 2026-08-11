# External fact: OpenAI

**Kind:** Vendor (`E-OPENAI-*`) — LLM API for extraction assistance.

## What it is

OpenAI API powers document-wide definition span suggestions and per-block definienda suggestions.
Output is presented for human review — not auto-persisted as authoritative statements.

## Configuration

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | API authentication (not listed in README `.env` example — add locally) |

## GloX usage

| Concern | Code path |
| --- | --- |
| LLM client | `src/lib/openai.ts` |
| Definition spans | `src/serverFns/llmSuggestion.server.ts` |
| Definienda suggestions | `src/serverFns/getLlmDefiniendaSuggestions.server.ts` |
| Prompts | `src/server/llm.ts` |

## Agent constraints

**E-OPENAI-01:** LLM suggestions MUST require authentication and MUST be scoped to Documents owned
by the caller.

**E-OPENAI-02:** Suggestions are cached per document with content-hash validation — do not bypass
cache without invalidating on document content change.

**E-OPENAI-03:** LLM output MUST NOT be written directly to FloDown block `statement` without user
confirmation — prevents unreviewed extractions entering the domain model.

## Related docs

- [`../../prds/domains/documents-extraction.md`](../../prds/domains/documents-extraction.md)
