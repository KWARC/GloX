# `/specs/engineering/features` — Tech specs (SDDs)

Canonical technical specs for critical-area behavior. EARS rules, data contracts, vendor wiring.

PRDs live in [`/specs/prds/`](../../prds/).

## Start from template

Copy [`_TEMPLATE/sdd.md`](./_TEMPLATE/sdd.md) into a topic folder (e.g. `auth/`) when authoring a new
SDD. [`_TEMPLATE/`](./_TEMPLATE/) stays pristine on `main`.

## Topic indexes (optional)

Multi-SDD domains MAY include a non-binding `index.md` (SDD map, backfill notes). Not a PRD or SDD.
Copy [`_TEMPLATE/index.md`](./_TEMPLATE/index.md). Rules: [spec-authoring §5.1](../spec-authoring.md#topic-indexes).

## SDD map

| Area | Location |
| --- | --- |
| Auth | `engineering/features/auth/` |
| Documents & extraction | `engineering/features/documents-extraction/` |
| FloDown blocks | `engineering/features/flodown-blocks/` |
| Symbols | `engineering/features/symbols-semantics/` |
| Module descriptions | `engineering/features/module-descriptions/` |
