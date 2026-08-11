# `/specs/changes/archive` — completed OPSX changes

Dated folders for **finished** full-SDD change sets after Verify and Archive.

```
/specs/changes/archive/
  └── YYYY-MM-DD-<feature-slug>/
        ├── clarify.md
        ├── proposal.md
        ├── design.md
        └── tasks.md
```

- **When:** After post-review Verify sign-off, when folding deltas into canonical PRDs/SDDs.
- **Slug:** Short kebab-case name for the feature (e.g. `2026-08-06-partner-activation-gate`).
- **Active work** stays flat under `/specs/changes/` (one set per branch) — never under `archive/`.
- **Lightweight** work does not use this folder; it updates canonical specs directly (Plan Mode Archive /
  spec sync). See [DEVELOPER_GUIDE §3](../../DEVELOPER_GUIDE.md#3-lightweight-path-default).

Policy: [changes/README.md](../README.md), [DEVELOPER_GUIDE §4](../../DEVELOPER_GUIDE.md#4-full-sdd-path-critical-areas).
