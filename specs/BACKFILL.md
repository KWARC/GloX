# Backfill guide — adopting this scheme in a new repo

Step-by-step instructions after you copy this archive into your project. Read once top-to-bottom, then
use as a checklist.

**Goal:** A working `/specs` tree where agents and humans share the same contracts — product
orientation, binding PRDs, engineering SDDs where risk warrants them, and a clear workflow for changes.

---

## 0. Prerequisites

- [ ] Repo has a single obvious **root** (monorepo or single app).
- [ ] You can add a top-level or repo-root **`/specs`** directory (recommended) or an agreed path
      (e.g. `docs/specs/` — if so, update path references in `AGENTS.md` and skills).
- [ ] Team agrees on **who owns** compliance/product/engineering spec updates (even if one person
      initially).

---

## 1. Install the harness (copy files)

1. Copy the entire contents of this archive into your repo:

   ```bash
   # From the archive directory:
   cp -R . /path/to/your-repo/specs/
   ```

2. Confirm the layout matches [README.md](./README.md#layout). Empty folders you will create in later
   steps:

   ```
   specs/prds/compliance/     # skip if N/A
   specs/prds/commercial/      # skip if N/A
   specs/prds/domains/
   specs/engineering/features/
   specs/engineering/decisions/
   specs/engineering/external-deps/vendors/
   specs/engineering/external-deps/libraries/
   specs/engineering/deployment/
   specs/product/
   specs/organization/
   specs/changes/archive/
   ```

3. Commit the harness only (no backfill content yet) so the scheme is versioned:

   ```bash
   git add specs/
   git commit -m "Add docs-as-contracts spec harness"
   ```

---

## 2. Wire agents and humans to `/specs`

### 2.1 Root `AGENTS.md` (or equivalent)

Add a short constitution that points agents at `/specs`. Minimum content:

- **What** the product is (one paragraph).
- **Critical areas** for your project — where mistakes cause security, billing, data loss, or broken
  core flows (see [architecture §2](./ai-native-development-architecture.md#2-operating-modes)).
- **Hard guardrails** (MUST / MUST NOT) — even 3–5 bullets help.
- **Pointers:** `specs/DEVELOPER_GUIDE.md`, `specs/ai-native-development-architecture.md`,
  `specs/engineering/spec-authoring.md`, `specs/review/REVIEW_GUIDE.md`.
- **Conflict rule:** compliance PRDs (if any) outrank other specs; specs outrank ad-hoc comments in
  code.

### 2.2 Developer onboarding

- Add a line in your main `README.md` or `CONTRIBUTING.md`: *Start at `specs/DEVELOPER_GUIDE.md`.*
- Optional: per-app `AGENTS.md` under `apps/<name>/` for stack-specific conventions only — not
  duplicate of the global workflow.

### 2.3 Replace Wald paths in copied docs (grep pass)

Search your installed `/specs` for paths that do not exist in your repo and fix or delete:

| Pattern | Action |
| --- | --- |
| `apps/next-js-app/`, `libs/` | Replace with your app/lib paths in templates and new specs |
| `pnpm run specs:check-*` | Remove from checklists until you add scripts (§6) or replace with your linter |
| `.cursor/skills/opsx-*` | Point to your skills or remove skill links (§7) |
| `wald`, `bluehost`, partner tenants | Replace with your product/tenant model in **your** new docs only |

Do **not** strip Wald examples from `spec-authoring.md` unless they confuse your team — they illustrate
the scheme.

---

## 3. Define ubiquitous language (domain dictionary)

1. Copy the template:

   ```bash
   cp specs/meta/domain-dictionary.TEMPLATE.yaml specs/meta/domain-dictionary.yaml
   ```

2. Add terms for **your** product: plans, roles, core entities, deployment names. Rules:
   [spec-authoring §8](./engineering/spec-authoring.md#8-domain-dictionary--glossary).

3. Delete or rewrite the commented Wald placeholder entries in the template.

4. Reference dictionary terms in all new PRDs/SDDs by **preferred label**; never redefine terms inline.

**Backfill tip:** Start with 10–20 terms you already argue about in code review; expand as specs land.

---

## 4. Backfill content (recommended order)

Work **outside-in**: orientation → binding requirements → engineering specs → tests. One domain at a
time beats thin coverage everywhere.

### Phase A — Organization & product (non-binding)

| Step | Action | Output |
| --- | --- | --- |
| A1 | Copy `organization/README.md` structure; add `organization.md` with roster and who owns critical areas | Escalation targets for OPSX HALT |
| A2 | ~~Optional accountability tree~~ — **skipped for GloX**; [`organization.md`](./organization/organization.md) is enough | — |
| A3 | Copy `product/_TEMPLATE.md` → `product/<your-product>.md` | Vision, roadmap, metric definitions |
| A4 | Optional: `<product>-features.md` with **Last verified** date | Shipped capability inventory |

**Gate:** Product docs must not contain testable MUST rules — those belong in PRDs.

### Phase B — Compliance & commercial (if applicable)

| Step | Action | Output |
| --- | --- | --- |
| B1 | If you have regulatory or customer contractual obligations, write `prds/compliance/*.md` first | Supreme authority PRDs |
| B2 | If you sell plans/SKUs/entitlements, write `prds/commercial/*.md` | Plan gates, packaging |
| B3 | Use `prds/_TEMPLATE/prd.md` for each new PRD | `R-<AREA>-<NN>` rules with EARS in critical areas |

**Gate:** Compliance PRDs are cited in SDD frontmatter `compliance:` arrays.

### Phase C — Domain PRDs

For each major domain (auth, billing, onboarding, core feature area):

1. Copy `prds/_TEMPLATE/prd.md` → `prds/domains/<domain>.md`.
2. Fill **Product outcomes** and **Binding** sections per [two-filter classifier](./ai-native-development-architecture.md#46-classifying-a-rule-two-filter--wording-constraint).
3. Add **Traceability** table (PRD rule → SDD rule); SDD cells can say `Gap` until Phase D.
4. Set frontmatter `upstream`, `compliance`, `code` (SDD paths as you create them).

**Gate:** Upstream review per [REVIEW_GUIDE §1](./review/REVIEW_GUIDE.md#part-1--upstream-review-strict).

### Phase D — Engineering specs (critical areas only)

For each domain that qualifies as a **critical area** in your `AGENTS.md`:

1. Create folder `engineering/features/<domain>/`.
2. Optional: `index.md` from `engineering/features/_TEMPLATE/index.md` — flow matrix and backfill
   checklist (non-binding).
3. Per slice: copy `engineering/features/_TEMPLATE/sdd.md` → `<slice>.md`.
4. Write EARS **Business rules** (`S-<AREA>-<NN>`), architecture boundaries table, test mapping.
5. Locked “why not the other option?” choices → `engineering/decisions/<slug>.md` from
   `decisions/_TEMPLATE.md` (`D-<AREA>-<NN>`).

**Gate:** Every Binding PRD rule traces to an SDD rule or an explicit `Gap` with owner.

### Phase E — External facts & deployment

| Step | Action | Output |
| --- | --- | --- |
| E1 | Vendor compliance/quirks agents cannot infer | `external-deps/vendors/<vendor>.md` (`E-*`) |
| E2 | Library constraints that forced design | `external-deps/libraries/<lib>.md` |
| E3 | Feature flags, secrets, release process | `engineering/deployment/*.md` |

Classifier: [external-deps/README.md](./engineering/external-deps/README.md).

### Phase F — Tests (Testing Trophy)

1. Read [TESTING_GUIDE.md](./review/TESTING_GUIDE.md) and adapt examples to your stack.
2. For each SDD **Test mapping** row, add or link a test; mark `Gap` only with a tracked owner.
3. Prefer integration tests at API/DB seams; unit tests for pure logic; thin E2E smoke on PR.

**Gate:** [REVIEW_GUIDE §2](./review/REVIEW_GUIDE.md) Testing Trophy alignment.

### Phase G — Featured examples

When a PRD/SDD pair is reviewed and worth mirroring:

1. Set `featured: true` in frontmatter.
2. Add rows to [engineering/feature.md](./engineering/feature.md).

---

## 5. Ongoing workflow (after backfill)

### Lightweight (default)

1. Plan in Cursor Plan Mode or a short issue.
2. Implement.
3. **Archive:** update canonical specs touched or record **No spec change** in the PR description.
4. Bump `Last verified` on product inventory if user-visible behavior changed.

See [DEVELOPER_GUIDE §3](./DEVELOPER_GUIDE.md#3-lightweight-path-default).

### Full SDD (critical areas)

1. Branch per feature.
2. **Clarify:** copy `changes/_TEMPLATE/clarify.md` → `changes/clarify.md`; sign off.
3. **Propose:** copy remaining templates → `proposal.md`, `design.md`, `tasks.md`.
4. **Upstream review** before Apply ([REVIEW_GUIDE §1](./review/REVIEW_GUIDE.md)).
5. **Red → Apply → Verify → Archive** ([changes/README.md](./changes/README.md)).
6. Move completed set to `changes/archive/YYYY-MM-DD-<slug>/`.

---

## 6. Optional — spec CI linters

Wald runs `pnpm run specs:check-*` (link check, rule IDs, vague PRD phrases, SDD table prose). To
adopt:

1. Copy or reimplement scripts from Wald's `package.json` / `tools/specs-*` (not in this archive).
2. Add a CI job that runs on PRs touching `specs/**`.
3. Update checklist lines in `REVIEW_GUIDE.md` that reference `pnpm run specs:check-prd-prose`.

Until then, rely on human upstream review.

---

## 7. Optional — Cursor OPSX skills

Wald agents use `.cursor/skills/opsx-*` and `lightweight-plan-archive` to execute procedure. Options:

| Approach | Effort | Benefit |
| --- | --- | --- |
| **Docs only** | Low | Humans follow `DEVELOPER_GUIDE.md`; agents read `/specs` |
| **Copy skills** | Medium | Port `opsx-mode`, `opsx-clarify`, `opsx-propose`, `opsx-red`, `opsx-apply`, `opsx-verify`, `opsx-archive`, `lightweight-plan-archive` and retarget paths |
| **Minimal skill** | Low | One skill: "read `specs/DEVELOPER_GUIDE.md` and choose lightweight vs full SDD" |

Skills enforce nothing CI cannot — they reduce procedural drift.

---

## 8. Backfill checklist (printable)

```
[ ] Harness copied to /specs and committed
[ ] AGENTS.md points to /specs and lists critical areas
[ ] domain-dictionary.yaml started from template
[ ] organization.md + product brief exist
[ ] At least one domain PRD upstream-reviewed
[ ] At least one SDD for highest-risk area with test mapping
[ ] TESTING_GUIDE adapted; one integration test per first SDD rule
[ ] Team knows lightweight vs full SDD trigger
[ ] (Optional) spec linters in CI
[ ] (Optional) OPSX skills installed
```

---

## 9. Common mistakes

| Mistake | Fix |
| --- | --- |
| Writing MUST rules in product briefs | Move to PRD; keep brief as orientation |
| One giant SDD for the whole app | Split by domain/slice; use topic `index.md` |
| Skipping Traceability tables | Add PRD ↔ SDD ↔ test rows early; `Gap` is allowed temporarily |
| Editing canonical specs during full SDD | Use `/specs/changes/` deltas until Archive |
| Duplicate glossary in markdown | Only `meta/domain-dictionary.yaml` |
| Full SDD for every typo | Default lightweight; escalate only for critical areas |

---

## Related

- [MANIFEST.md](./MANIFEST.md) — what this archive contains
- [traced-knowledge-graph.md](./traced-knowledge-graph.md) — how nodes connect
- [CLARIFY_AND_PROPOSE.md](./changes/CLARIFY_AND_PROPOSE.md) — before you write deltas
