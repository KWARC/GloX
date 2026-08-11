---
name: llm-model-lifecycle
description: >-
  Weekly LLM model review — discover new models from OpenAI, Anthropic, Google,
  and xAI Grok; recommend additions, deprecations, and price updates; implement
  approved changes in next-js-app; update this skill when the workflow diverges.
  Use when adding LLMs, deprecating engines, updating provider list prices,
  upgrading model versions, checking provider releases, running the weekly model
  audit, or when the user says "update the skill".
---

# LLM Model Lifecycle

Manage Wald's completion engines: research provider releases, propose changes, implement only after human approval.

**Full implementation playbook (archive — read-only):** [libs/docs/llm_model_upgrade.plan.md](../../../libs/docs/llm_model_upgrade.plan.md)

Do not modify that plan or other `libs/docs/*.plan.md` files when running this skill. Living policy lives here.

**Provider doc URLs:** [provider-sources.md](provider-sources.md)

---

## Human-in-the-loop (required)

Never add or deprecate models without explicit user approval for that session.

1. **Research** — fetch current provider model lists and compare to our active engines
2. **Propose** — present a decision table; user picks what to add, upgrade, or deprecate
3. **Implement** — discover touchpoints via codebase search (not a static checklist)
4. **Verify** — run tests and smoke-checklist from the playbook
5. **Update skill** — refresh the file checklist and patterns from this session (required every cycle)

**Anthropic (Vertex) adds:** Wald serves Claude via **Vertex AI partner models** (`lib/models/anthropic.ts`), not the direct Anthropic API. After implementing any new Claude engine, **always include in the session summary** a reminder to **enable the model in GCP** (`wald-ml-demos` + `wald-production` only — all tenants use Vertex through these Wald deploy projects) before smoke-testing chat.

---

## Weekly review workflow

Copy this checklist and track progress:

```
Weekly LLM review:
- [ ] Step 1: Inventory current active engines
- [ ] Step 2: Fetch provider updates (web search each provider) — **including pricing page changes**
- [ ] Step 3: Diff — new / upgrade / deprecate candidates
- [ ] Step 4: Present proposal table to user
- [ ] Step 5: User approves subset
- [ ] Step 6: Implement approved changes
- [ ] Step 7: Post-deploy smoke test
- [ ] Step 8: Refresh skill checklist from search results (required every cycle)
```

### Step 1 — Inventory current engines

Read these files and list engines where `isDeprecated: false` in metadata:

| File                                             | What to extract                                  |
| ------------------------------------------------ | ------------------------------------------------ |
| `apps/next-js-app/utils/engine-metadata.ts`      | Active engines, categories, families, flags      |
| `apps/next-js-app/lib/server/utils.ts`           | `LLMEngineToModelName` — current API model IDs   |
| `apps/next-js-app/lib/metering/pricing.ts`       | Priced active engines                            |
| `libs/shared/src/lib/premium-metered-engines.ts` | Premium pool members                             |
| `libs/prisma/schema.prisma`                      | `CompletionLLMEngine`, `ExternalLLMEngine` enums |

Group by family: **GPT**, **GROK**, **GEMINI**, **CLAUDE**.

### Step 2 — Fetch provider updates

Use **WebSearch** against each provider (see [provider-sources.md](provider-sources.md)):

- OpenAI — new GPT / o-series / mini variants, deprecations, pricing
- Anthropic — Claude Sonnet / Opus / Haiku releases
- Google — Gemini Pro / Flash / Flash-Lite versions
- xAI — Grok version bumps

Also check provider pricing pages when proposing additions **or price drops on existing models**.

### Step 3b — Price updates (same enum, new $/MTok)

When a provider cuts or raises list price **without changing the API model ID**, do **not** add a new enum. Use **date-effective pricing** so historical usage still meters at the rate in effect when the message was written.

**When to classify as Price update (not Add/Deprecate):**

- Provider announcement changes $/MTok for an engine we already map 1:1 to an active enum
- API model ID unchanged (e.g. still `gpt-5.6-luna`)
- No new product tier or rename

**Implementation pattern** (follow `claudeSonnet5UsdPerMillion` in `pricing.ts`):

1. Export `fooUsdPerMillion(asOf: Date)` with explicit UTC cutoff from the provider announcement
2. Add a private `fooPricing(asOf)` that calls `usdPerMillionWithOpenAiCache` / `usdPerMillionWithAnthropicCache` / `usdPerMillionWithExplicitCacheRates` with the resolved rates
3. Branch in `getEngineTokenPricing(llmEngine, asOf)` — **remove** the engine from static `ENGINE_TOKEN_PRICING` if it becomes date-aware (like `CLAUDE_SONNET_5`)
4. Update `hasEngineTokenPricing` to include date-aware engines
5. Add tests with `pricedAt` before and after the cutoff; include cache-tier cases when OpenAI/Anthropic/Gemini cache rates scale with input
6. Mirror in `apps/oncall-agent/src/lib/token-pricing.ts` — add optional `pricedAt` to `computeInputOutputCostMicros`; pass `message.createdAt` in oncall cost-mismatch UI
7. **Do not** change `LLMEngineToModelName` or `ENGINE_METADATA.isDeprecated` for price-only changes

**`pricedAt` contract:** `save-message.ts` already passes `message.createdAt` as `pricedAt`. New date-aware engines automatically price historical rows correctly.

**Proposal table row for price updates:**

```markdown
| OpenAI | gpt-5.6-luna | **Price update** | GPT5_6_LUNA | — | 0.20 / 1.20 (was 1 / 6) | Effective 2026-07-30 UTC; date-effective pricing |
```

### Step 3 — Diff and classify

**Policy: always new enum for version bumps.** Wald does not do in-place upgrades (no reusing an enum for a new provider model ID). Every provider version change — major or minor — gets a new `CompletionLLMEngine` + `ExternalLLMEngine` value and a Prisma migration. The predecessor is deprecated in the same PR unless the user explicitly asks to keep both active.

| Classification      | When                                                | Schema change?                                                                       |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Add**             | Provider released a new model version               | Yes: new enum + migration + metadata + pricing                                       |
| **Deprecate**       | Predecessor superseded by the new enum              | `isDeprecated: true`; keep enum + original `LLMEngineToModelName` mapping (no remap)   |
| **Price update**    | Same API model ID; provider changed $/MTok          | No enum change — date-effective pricing in `pricing.ts` (+ oncall mirror)            |
| **Already live**    | Active enum already maps to the current provider ID | No change                                                                            |
| **Skip**            | Flagship / preview / unsupported integration        | Propose only; do not implement without explicit approval                             |

**Rule of thumb:** If the API model ID changes, add a new enum — even when the product slot is the same ("Claude Sonnet", "GPT-5 Mini"). Never update an active enum's provider constant in place.

### Step 4 — Proposal table (present to user)

Use this format. Mark expensive flagship models as **skip by default** — user decides.

```markdown
## Weekly LLM proposal — [date]

| Provider  | Provider model | Suggested action    | Wald enum (proposed) | Deprecate | Est. $/MTok (in/out) | Notes                                      |
| --------- | -------------- | ------------------- | -------------------- | --------- | -------------------- | ------------------------------------------ |
| OpenAI    | gpt-5.6-sol    | **Add**             | GPT5_6_SOL           | GPT5_5    | 5 / 30               | New enum; deprecate predecessor in same PR |
| Anthropic | claude-fable-5 | **Skip (flagship)** | CLAUDE_FABLE_5?      | —         | 10 / 50              | Awaiting your call                         |

### Recommended deprecations (same PR as each Add)

- GPT5_5 — superseded by GPT5_6_SOL
- GPTo3 — already `isDeprecated: true` ✓

### Awaiting your decision

- [ ] Add … (new enum + migration)
- [ ] Deprecate … (`isDeprecated: true` only — do not remap API IDs)
```

**Default exclusions (propose but do not implement without explicit approval):**

- Ultra-premium / flagship tiers with very high list pricing (e.g. full GPT-5 class at $30+ output, Opus-class at $25+ output) unless user explicitly requests them
- Preview / experimental models unless product wants early access
- Models Wald's Vertex/API integration cannot call yet

### Step 5–6 — Implement approved changes

**Do not implement from the file checklist alone.** It is a hint list that could become stale. Every cycle, **discover touchpoints by searching the codebase** first, then implement, then **rewrite the checklist in Step 8** from what you actually touched.

Reference playbook (archive, read-only): [libs/docs/llm_model_upgrade.plan.md](../../../libs/docs/llm_model_upgrade.plan.md)

#### Vertex AI — Anthropic (Claude) partner models

Wald calls Claude through **Vertex AI** (`createVertexAnthropic` in `lib/models/anthropic.ts`). A new `claude-*` model ID in code will fail at runtime until GCP enables it in the Wald Vertex projects.

**GCP projects (only these two):** `wald-ml-demos` (non-prod) and `wald-production`. Partner tenants (Bluehost, NetSol, etc.) do **not** have separate Vertex projects — they all call Vertex from these Wald deployment projects.

**After every Claude Add, include this in your implementation summary** (do not skip):

> **GCP prerequisite:** Enable **`claude-<version>`** in [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/model-garden) and/or [Gemini Enterprise Agent Platform](https://cloud.google.com/gemini-enterprise-agent-platform/docs/models/partner-models/claude) in **`wald-ml-demos`** and **`wald-production`** before smoke-testing chat. Model Garden docs: [Use Claude on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude).

#### Implementation principle: search-driven, not checklist-driven

```
For each approved change:
  1. Identify engine enum(s) + family (GPT / GROK / GEMINI / CLAUDE)
  2. Run discovery searches (below)
  3. Build a per-engine touchpoint table from search results
  4. Implement every hit that needs updating
  5. Re-search the old enum name to confirm zero unintended references remain
```

#### Deprecating an engine

Search the **deprecated enum name** across the whole repo before and after edits:

```bash
# Example: deprecating GROK_4_3
rg 'GROK_4_3' --glob '!**/migrations/**' --glob '!**/*.plan.md'
```

Also search the **provider API model ID** if it appears as a raw string (tests, `RAW_MODEL_TO_ENGINE`, provider files):

```bash
rg 'grok-4-3' apps/ libs/
```

For every hit, decide: update to successor enum, leave for history (migrations, deprecated metadata), or remove.

Typical actions per hit:

| Location kind                           | Action                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `ENGINE_METADATA`                       | `isDeprecated: true`                                                          |
| `LLMEngineToModelName`                  | **Do not remap** — leave mapped to the original provider constant             |
| `ENGINE_TOKEN_PRICING`                  | Keep entry (historical usage must still price)                                |
| `PREMIUM_METERED_ENGINES` / LD docs     | Add successor if premium; **keep** deprecated entries for historical metering |
| Auto-router defaults / LD flag examples | Replace with successor if policy says so                                      |
| Tests / e2e                             | Update selection or assertions                                                |
| `ExternalLLMEngine` enum                | **Do not remove** — keep for DB/admin history                                 |

Present the search hit table to the user if any hit is ambiguous (migrations, docs-only, partner configs).

#### Adding a new engine (version bump or net-new)

Find the **previous latest active engine in the same family** (same `family` in `ENGINE_METADATA`, not deprecated). Use it as a template.

```bash
# Example: adding GPT5_6_SOL — clone patterns from GPT5_5
rg 'GPT5_5' --glob '!**/migrations/**'
rg 'GPT5' apps/next-js-app/utils/engine-metadata.ts  # confirm family + category
```

Search hits on the predecessor tell you **every file that likely needs a parallel entry** for the new enum. Copy the pattern; do not assume the checklist is complete.

Also search the **predecessor's provider constant** (e.g. `GPT5_5_MODEL` in `lib/models/openai.ts`) for raw model ID usage.

**Default:** deprecate the predecessor in the same PR (`isDeprecated: true`). **Do not** change `LLMEngineToModelName` for the deprecated enum — it stays on its original API model ID. **Do not** remove deprecated enums from `PREMIUM_METERED_ENGINES` or LD `premiumEngines` — only add the successor. Only keep both active in the picker if the user explicitly approves coexistence (default is deprecate predecessor in metadata).

**Do not** change an active enum's API constant or `displayName` to point at a newer provider model — that was the old in-place pattern and is no longer allowed.

**Do not** remap a deprecated enum onto a newer model ID (e.g. `GPT5_5` → `gpt-5.6-sol`). That silently upgrades old stored preferences/chats.

#### Discovery searches (run every implementation)

| Search                                                                         | Purpose                         |
| ------------------------------------------------------------------------------ | ------------------------------- |
| `rg '<ENGINE_ENUM>'` repo-wide (exclude `migrations/` unless auditing history) | All enum references             |
| `rg '<provider-model-id>'` in `apps/` `libs/`                                  | Raw ID strings                  |
| `rg 'CompletionLLMEngine\.<ENGINE>'`                                           | Typed enum usage                |
| `rg '<ENGINE_ENUM>' apps/oncall-agent/`                                        | Oncall pricing/dashboard parity |
| `rg 'premiumEngines\|PREMIUM_METERED'` + family engines                        | Premium pool                    |
| `rg 'autoRouterCategoryLlmMap\|DEFAULT_AUTO_ROUTER'`                           | Auto-router                     |
| `rg '<family>' apps/next-js-app/lib/models/`                                   | Provider file                   |

#### Starting hint list (verify via search — not authoritative)

These files are **common** touchpoints. Confirm each cycle with `rg`; add newly discovered paths to the checklist in Step 8.

| File                                                                      | Add (new enum)                                          | Deprecate (predecessor)                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| `libs/prisma/schema.prisma` + `migrations/`                               | Add enums + migration                                   | Usually skip (enum stays)                     |
| `apps/next-js-app/lib/models/{provider}.ts`                               | New API constant                                        | Leave old constant if useful                  |
| `apps/next-js-app/lib/server/utils.ts`                                    | Map new enum → new constant                             | Leave old mapping unchanged (no remap)        |
| `apps/next-js-app/utils/engine-metadata.ts`                               | New entry + `RAW_MODEL_TO_ENGINE`                       | `isDeprecated: true` on predecessor           |
| `apps/next-js-app/lib/metering/pricing.ts` (+ `.test.ts`)                 | Add pricing row **or date-effective `*UsdPerMillion(asOf)`** | Keep predecessor pricing for historical usage |
| `libs/shared/src/lib/premium-metered-engines.ts`                          | Add if premium                                          | **Keep** predecessor (do not remove)          |
| `apps/oncall-agent/src/lib/token-pricing.ts`                              | Mirror if priced (+ `pricedAt` for date-aware engines)  | Keep predecessor pricing for historical usage |
| `apps/next-js-app/pages/api/process-prompt.ts`                            | Update classifier model + thinking-disabled enum checks | —                                             |
| `apps/next-js-app/pages/api/update-user-preference.ts`                    | Update hardcoded flash model constant                   | —                                             |
| `apps/next-js-app/custom-providers/article-writer/chat-language-model.ts` | Update hardcoded flash model constant                   | —                                             |
| `apps/next-js-app/app/api/chat/agents/direct-image-generation.ts`         | Update flash-lite model constant checks                 | —                                             |
| `apps/next-js-app/utils/sentry-llm-tracking.ts`                           | Add model IDs to `GEMINI_EXTENDED_TIMEOUT_MODELS`       | —                                             |
| `apps/next-js-app/lib/process-prompt/constants.ts`                        | Only if product asks                                    | Do not auto-flip with flagship adds           |
| Tests / e2e                                                               | Add/update                                              | Update                                        |

**Do not edit** `libs/docs/*.plan.md` — those are historical archives. Put living guidance in this skill (and `provider-sources.md`) only.

### Learned patterns (Jul 31 2026 OpenAI price drop + GPT5_MINI → Luna)

- **GPT-5.6 Luna/Terra price drop (2026-07-30 UTC):** Luna $1/$6 → $0.20/$1.20; Terra $2.50/$15 → $2/$12; Sol unchanged. Use `gpt56LunaUsdPerMillion(asOf)` / `gpt56TerraUsdPerMillion(asOf)` in `getEngineTokenPricing` — not static `ENGINE_TOKEN_PRICING` rows
- **Deprecate GPT5_MINI:** superseded by `GPT5_6_LUNA` (same quick-response slot); `isDeprecated: true` only; replace `GPT5_MINI` in auto-router defaults + LD example JSON with `GPT5_6_LUNA`
- **Price-only vs version bump:** price drop on same API ID = date-effective pricing; API ID change = new enum + deprecate predecessor

### Learned patterns (Jul 2026 GPT-5.6 cycle)

- **Always new enum** — no in-place API ID swaps on active enums
- **GPT-5.6 cache**: writes at 1.25× input — `usdPerMillionWithOpenAiCache(in, out, 1.25)` (default multiplier is 1 for pre-5.6)
- **No remaps on deprecate**: `LLMEngineToModelName[OLD]` stays on the original provider constant; never point it at the successor
- **Verify command**: `pnpm exec vitest run --config apps/next-js-app/vitest.config.ts apps/next-js-app/lib/metering/pricing.test.ts` (project uses vitest, not jest/`--testPathPattern`)
- **LD ops**: add new premium engines to `monthlyEngineTokenLimits.premiumEngines` in each env; do not remove deprecated entries

### Learned patterns (Jul 27 2026 Gemini 3.6 / Opus 5 cycle)

- **Gemini 3.6 Flash**: `gemini-3.6-flash` — `usdPerMillionWithExplicitCacheRates(1.5, 7.5, 0.15)`; add to `GEMINI_GLOBAL_REGION_MODELS` + `getGoogleProviderOptions` minimal thinking block
- **Gemini 3.5 Flash-Lite**: `gemini-3.5-flash-lite` — `usdPerMillionWithExplicitCacheRates(0.3, 2.5, 0.03)`; same global region + thinking config as 3.1 Flash-Lite
- **Claude Opus 5**: `claude-opus-5` on Vertex; `getAnthropicProviderOptions` needs `claude-opus-5` in adaptive-thinking + `effort: "low"` branch; add `CLAUDE_OPUS_5` to premium pool (keep `CLAUDE_OPUS_4_7`); **summary must ask user to enable `claude-opus-5` in `wald-ml-demos` + `wald-production` before smoke test**
- **Hardcoded flash constants**: auto-router classifier (`process-prompt.ts`), article writer, user-preference API, and `direct-image-generation.ts` import model constants directly — search predecessor API ID string, not just enum
- **Premium pool on deprecate**: only **add** successors to `PREMIUM_METERED_ENGINES` and LD `premiumEngines`; never remove deprecated enums (historical usage still meters against the shared dollar pool)

**Prisma rule:** New user-facing engines go in both `CompletionLLMEngine` and `ExternalLLMEngine`. Do not add Wald agents to `ExternalLLMEngine`.

**Deprecation pattern:**

```ts
// engine-metadata.ts
isDeprecated: true,

// utils.ts — leave original mapping; do NOT remap to successor
[CompletionLLMEngine.OLD_ENUM]: OLD_MODEL_CONSTANT,
```

Deprecated engines: **keep** `ENGINE_TOKEN_PRICING` / oncall pricing rows so historical usage still prices correctly. They drop out of `getExternalLLMFamilyModels()` automatically via `isDeprecated`.

**Enum naming:** Match existing conventions — `GROK_4_5`, `GPT5_6_SOL`, `GEMINI_3_6_FLASH`, `GEMINI_3_5_FLASH_LITE`, `CLAUDE_OPUS_5`. Encode provider version in the enum; use provider tier suffixes when the API does (`_SOL`, `_TERRA`, `_LUNA`).

**Pre-merge gate:** `rg '<OLD_ENGINE_ENUM>'` returns only expected historical references (migrations, deprecated metadata, pricing).

### Step 7 — Verify

```bash
npx nx test next-js-app --testPathPattern=pricing
```

Smoke test (from playbook):

- [ ] **Anthropic adds only:** model enabled in `wald-ml-demos` and `wald-production` (Vertex / Agent Platform)
- [ ] Chat: select model, send message
- [ ] Admin: model in family picker; enable/disable works
- [ ] Premium pool: metered engine increments usage; cap returns `MONTHLY_ENGINE_LIMIT_EXCEEDED`
- [ ] Auto-route respects disallowed engines
- [ ] Audit/dashboard display names resolve

---

## Quick reference — key files

```
libs/prisma/schema.prisma          # CompletionLLMEngine, ExternalLLMEngine
apps/next-js-app/lib/models/       # Provider API model ID constants
  openai.ts | anthropic.ts | gemini.ts | grok.ts
apps/next-js-app/lib/server/utils.ts   # LLMEngineToModelName
apps/next-js-app/utils/engine-metadata.ts  # UI metadata, picker, admin
apps/next-js-app/lib/metering/pricing.ts   # $/MTok billing
libs/shared/src/lib/premium-metered-engines.ts
```

Admin panel (`DisableLLM.tsx`) needs no code changes when schema + metadata are correct.

---

## Self-update (required every cycle)

Skills are static markdown until the agent edits them. **Step 8 is mandatory after every implementation session** — not only when something went wrong. Rebuild the hint list and learned patterns from search results + `git diff`.

### When to run Step 8

Always run at end of implementation. Also run when the user says **"update the skill"**.

Additionally run if:

- A file was changed that was **not** found by searching the predecessor / deprecated enum
- A discovery search pattern was missing (add it to "Discovery searches")
- Provider doc URLs moved (update `provider-sources.md`)
- User corrected the agent mid-session

Do **not** update the skill for one-off typos or unrelated conversation topics.

### How to update

1. **Diff the session** — `git diff` for all LLM-related files touched
2. **Reconcile with searches** — compare touched files vs `rg` hits on predecessor/deprecated enum; note any file type that appeared in search but was skipped (and why)
3. **Rewrite the starting hint list** — replace the Step 5–6 table with files actually touched this cycle; drop files that were searched but not needed
4. **Propose patches** — short summary for user before editing
5. **Edit the right file(s)**:
   - `SKILL.md` — hint table, discovery searches, patterns, examples
   - `provider-sources.md` — URLs, cost tiers
6. **Keep it concise** — facts not narrative; remove stale rows that search proved unnecessary
7. **Never edit** `libs/docs/*.plan.md` — archive only; do not “refresh” old plans when policy changes

### What to capture (templates)

**New hint row** — add only after `rg` confirmed it this cycle:

```markdown
| `path/to/file.ts` | New engine | Upgrade | Deprecate | Notes |
```

**New discovery search** — if a gap was found:

```markdown
| `rg 'foo' apps/bluegpt-subscription-server/` | Partner entitlement parity |
```

**Learned patterns** — provider-specific tricks confirmed this cycle:

```markdown
### Learned patterns

- **Anthropic Sonnet 5**: `getAnthropicProviderOptions` needs `effort: "low"` — see `lib/models/anthropic.ts`
- **Oncall agent**: mirror pricing in `apps/oncall-agent/src/lib/token-pricing.ts`
```

**Stale content** — delete or strike through steps that misled you; do not append corrections without removing the wrong line.

**Worked example** — replace generic examples with a real one from the session:

```markdown
**User:** "OpenAI cut Luna/Terra prices"

→ Add `gpt56LunaUsdPerMillion` / `gpt56TerraUsdPerMillion` with 2026-07-30 UTC cutoff; branch in `getEngineTokenPricing`; tests with `pricedAt`; mirror oncall with optional `pricedAt`.

**User:** "Deprecate GPT5_MINI, use Luna everywhere"

→ `rg GPT5_MINI` repo-wide → `isDeprecated: true` on `GPT5_MINI` in metadata; replace auto-router / LD defaults with `GPT5_6_LUNA`; keep `LLMEngineToModelName` + pricing for historical usage.

**User:** "Add GPT-5.6 Sol"
→ Add `GPT5_6_SOL` enum + migration; constant `gpt-5.6-sol` in `openai.ts`; deprecate `GPT5_5` with `isDeprecated: true` only (keep original mapping); add new enum to premium pool (keep `GPT5_5` in pool).
```

### Session deviation log (use during conversation)

While working, mentally track (or paste in chat) deviations as they happen:

```markdown
## Skill gaps this session

- [ ] Touched `foo.ts` — not in checklist
- [ ] Step 7 command failed; used `nx run next-js-app:test` instead
- [ ] LD flag name differed from doc
```

Fold resolved items into `SKILL.md` at Step 8; discard session-only noise.

### Limits

- Do not auto-commit skill updates — leave them in the working tree for the developer to review with the LLM code changes (same PR is ideal)
- Do not edit or “update” archived plan docs under `libs/docs/*.plan.md`; the skill is the living source of truth for the weekly workflow
- Do not store provider model lists in the skill (they go stale weekly); store **where to look** and **patterns**

---

## Examples

**User:** "Run the weekly LLM review"

→ Inventory active engines → web search all four providers → present proposal table → wait for approval → implement.

**User:** "Add Grok 4.6"

→ Find family predecessor (`GROK_4_5`) → `rg GROK_4_5` for touchpoints → new enum + migration → deprecate predecessor unless user wants coexistence → re-search → Step 8 refresh hint list.

**User:** "Add Gemini 3.6 Flash + Claude Opus 5"

→ Add `GEMINI_3_6_FLASH`, `GEMINI_3_5_FLASH_LITE`, `CLAUDE_OPUS_5` enums + migration; deprecate `GEMINI_3_5_FLASH`, `GEMINI_3_1_FLASH_LITE`, `CLAUDE_OPUS_4_7` (`isDeprecated: true` only); add `CLAUDE_OPUS_5` to premium pool (keep `CLAUDE_OPUS_4_7`); update hardcoded flash constants in `process-prompt.ts`, article writer, user preference, direct-image-generation.

**User:** "Deprecate GPTo3"

→ `rg GPTo3` repo-wide → metadata `isDeprecated` → keep original `LLMEngineToModelName` + pricing → fix auto-router/test hits → `rg GPTo3` pre-merge gate.

**User:** "Update the skill from what we just did"

→ `git diff` + reconcile with `rg` hits → rewrite hint table → propose `SKILL.md` edits → apply after user OK.
