# Provider sources for weekly LLM review

Use **WebSearch** and **WebFetch** against these pages each review cycle. Provider docs change often — always fetch live, never rely on training data alone.

## OpenAI

| Resource        | URL                                           |
| --------------- | --------------------------------------------- |
| Models overview | https://platform.openai.com/docs/models       |
| Pricing         | https://openai.com/api/pricing/               |
| Deprecations    | https://platform.openai.com/docs/deprecations |

**Watch for:** GPT-5.x / mini variants, o-series reasoning models, GPT-4.1 family, image models (`gpt-image-*`), **$/MTok price drops on existing model IDs** (date-effective metering — no new enum).

**Wald mapping:** `apps/next-js-app/lib/models/openai.ts` → `LLMEngineToModelName` in `lib/server/utils.ts`. **Pricing:** `apps/next-js-app/lib/metering/pricing.ts` (`getEngineTokenPricing`, `*UsdPerMillion(asOf)` helpers).

## Anthropic

| Resource                           | URL                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Models overview                    | https://docs.anthropic.com/en/docs/about-claude/models                                      |
| Pricing                            | https://docs.anthropic.com/en/docs/about-claude/pricing                                     |
| **Vertex AI — Use Claude**         | https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude             |
| **Vertex Model Garden**            | https://console.cloud.google.com/vertex-ai/model-garden                                     |
| **Agent Platform — Claude models** | https://cloud.google.com/gemini-enterprise-agent-platform/docs/models/partner-models/claude |

**Watch for:** Sonnet / Opus / Haiku version bumps, adaptive thinking defaults, cache pricing tiers.

**Wald mapping:** `apps/next-js-app/lib/models/anthropic.ts` — **Vertex AI partner model IDs**, not direct Anthropic API.

**GCP enablement (required before smoke test):** Each new `claude-*` ID must be enabled in **`wald-ml-demos`** and **`wald-production`** via Model Garden and/or Gemini Enterprise Agent Platform. All tenants (including partners) use Vertex through these two Wald deploy projects — no per-tenant GCP enablement. Agents must remind the user in the implementation summary.

## Google (Gemini)

| Resource         | URL                                                                |
| ---------------- | ------------------------------------------------------------------ |
| Models           | https://ai.google.dev/gemini-api/docs/models                       |
| Pricing          | https://ai.google.dev/gemini-api/docs/pricing                      |
| Vertex AI models | https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models |

**Watch for:** Gemini 3.x Pro / Flash / Flash-Lite, thinking models, Imagen image models.

**Wald mapping:** `apps/next-js-app/lib/models/gemini.ts`, `imagen.ts`.

## xAI (Grok)

| Resource | URL                                   |
| -------- | ------------------------------------- |
| Models   | https://docs.x.ai/docs/models         |
| Pricing  | https://docs.x.ai/docs/models#pricing |

**Watch for:** Grok 3 / 4.x version increments, context window tiers, cache rates.

**Wald mapping:** `apps/next-js-app/lib/models/grok.ts`.

---

## Diffing against Wald

After fetching provider lists, compare API model IDs to:

1. Values in `apps/next-js-app/lib/models/{provider}.ts` constants
2. Values in `LLMEngineToModelName` (`lib/server/utils.ts`)
3. Active entries in `ENGINE_METADATA` where `isDeprecated: false`

A provider model is **missing from Wald** if the API ID is newer than any constant we map to an active engine.

A Wald engine is **stale** if our constant points at a model the provider has deprecated or superseded.

## Cost filter (proposal only)

When building the proposal table, flag models above these rough thresholds as **skip by default** (human decides):

| Tier     | Input $/MTok | Output $/MTok | Example                |
| -------- | ------------ | ------------- | ---------------------- |
| Standard | ≤ $3         | ≤ $15         | Flash, mini, Haiku     |
| Premium  | $3–$5        | $15–$25       | Sonnet, Grok 4.x       |
| Flagship | > $5         | > $25         | Full GPT-5, Opus-class |

Do not auto-implement flagship-tier models. Include them in the proposal with cost notes.
