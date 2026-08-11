---
name: llm-model-lifecycle
description: >-
  Review and update GloX OpenAI model usage — provider deprecations, model ID
  changes, and prompt compatibility. Use when changing the OpenAI model, checking
  provider releases, or auditing LLM extraction assistance. Say "update the skill"
  when the workflow diverges.
---

# OpenAI model maintenance (GloX)

GloX uses **one optional OpenAI integration** for extraction assistance (definition spans and
definienda suggestions). Output is human-reviewed — never auto-persisted as authoritative FloDown
statements.

**Vendor spec:** [`specs/engineering/external-deps/vendors/openai.md`](../../../specs/engineering/external-deps/vendors/openai.md)

**Provider doc URLs:** [provider-sources.md](provider-sources.md)

---

## Human-in-the-loop (required)

Never change the production model ID or prompts without explicit user approval for that session.

1. **Research** — check OpenAI deprecations and current recommended models
2. **Propose** — state current vs proposed model ID and blast radius
3. **Implement** — update code + verify extraction flows
4. **Update skill** — refresh touchpoint list if files changed

---

## GloX touchpoints (search every cycle)

| File | What to check |
| --- | --- |
| `src/lib/openai.ts` | Client initialization (`OPENAI_API_KEY`) |
| `src/server/llm.ts` | Model string(s) in completion calls, prompts |
| `src/serverFns/llmSuggestion.server.ts` | Document-wide definition span suggestions |
| `src/serverFns/getLlmDefiniendaSuggestions.server.ts` | Per-block definienda suggestions |
| `specs/engineering/external-deps/vendors/openai.md` | Binding constraints `E-OPENAI-*` |

Discovery search:

```bash
rg "openai|gpt-|OPENAI" src/ --glob '*.{ts,tsx}'
rg "model:" src/server/ src/serverFns/
```

---

## Workflow

```
OpenAI review:
- [ ] Step 1: Read current model ID(s) in src/server/llm.ts (and any other callers)
- [ ] Step 2: Fetch OpenAI deprecations + models docs (provider-sources.md)
- [ ] Step 3: Propose change table (current → recommended, breaking?, cost?)
- [ ] Step 4: User approves
- [ ] Step 5: Update model constant(s); run pnpm typecheck
- [ ] Step 6: Smoke-test extraction UI (authenticated, owned document)
- [ ] Step 7: Update vendor spec if behavior/constraints changed
```

---

## Guardrails (from vendor spec)

- **E-OPENAI-01:** Suggestions MUST require auth and MUST be scoped to caller-owned documents.
- **E-OPENAI-02:** Respect content-hash cache — do not bypass without invalidation on content change.
- **E-OPENAI-03:** Never write LLM output directly to FloDown `statement` without user confirmation.

---

## Verify

```bash
pnpm typecheck
pnpm test   # when LLM-related tests exist
```

Manual smoke:

- [ ] Log in as a user with an owned document
- [ ] Trigger definition-span suggestion (document extraction flow)
- [ ] Trigger definienda suggestion (curation flow)
- [ ] Confirm suggestions appear and are not auto-saved

---

## What GloX does **not** have

No multi-engine picker, metering enums, or premium pools. GloX uses a single optional OpenAI client —
do not port multi-engine lifecycle patterns from other products.

---

## Examples

**User:** "Check if our OpenAI model is deprecated"

→ Read `src/server/llm.ts` → fetch OpenAI deprecations → report current ID vs recommended → wait for approval.

**User:** "Upgrade to gpt-4.1-mini"

→ Propose blast radius → update model string in `llm.ts` → typecheck → smoke extraction flows → update vendor doc if needed.

**User:** "Update the skill"

→ `git diff` on LLM files → refresh touchpoint table above.
