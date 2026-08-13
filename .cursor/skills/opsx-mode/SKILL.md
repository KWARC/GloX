---
name: opsx-mode
description: >-
  Choose lightweight vs full SDD for the current task and route to the correct
  OPSX skill. Use at the start of non-trivial work or when mode is unclear.
---

# OPSX — Choose mode

**Policy:** [DEVELOPER_GUIDE §1](../../../specs/DEVELOPER_GUIDE.md#1-choose-your-mode), [architecture §2](../../../specs/ai-native-development-architecture.md#2-operating-modes).

## Prerequisites

- Feature request or change description from the human.

## Steps (agent)

1. Read the change against the mode signals in DEVELOPER_GUIDE §1.
2. Recommend **lightweight** or **full SDD** with one sentence why.
3. If signals conflict or stakes are unclear, ask the human to confirm.
4. Route:
   - **lightweight** → use skill `lightweight-plan-archive`
   - **full SDD** → use skill `opsx-clarify` (critical areas per [AGENTS.md](../../../AGENTS.md))

## Human gate

Confirm mode if ambiguous. Unsure on low-stakes work → default lightweight; escalate to full SDD after rework.

## Done when

Mode is stated and the next skill is named.

## Do not

- Invent new mode rules — cite DEVELOPER_GUIDE only.
- Start Clarify or implementation before mode is clear.
