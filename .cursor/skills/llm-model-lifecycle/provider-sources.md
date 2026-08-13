# OpenAI — provider sources

Use **WebSearch** and **WebFetch** each review cycle. Do not rely on training data for model IDs or deprecations.

| Resource | URL |
| --- | --- |
| Models overview | https://platform.openai.com/docs/models |
| Pricing | https://openai.com/api/pricing/ |
| Deprecations | https://platform.openai.com/docs/deprecations |

**Watch for:** Model deprecations, recommended replacements for chat/completion, pricing changes on the same model ID.

**GloX mapping:**

| Concern | Path |
| --- | --- |
| API client | `src/lib/openai.ts` |
| Model ID + prompts | `src/server/llm.ts` |
| Definition spans | `src/serverFns/llmSuggestion.server.ts` |
| Definienda suggestions | `src/serverFns/getLlmDefiniendaSuggestions.server.ts` |
| Binding rules | `specs/engineering/external-deps/vendors/openai.md` |

After fetching provider docs, compare the API model ID in `src/server/llm.ts` to OpenAI's current recommendations. Flag if GloX uses a deprecated or superseded model.
