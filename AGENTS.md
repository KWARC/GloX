# GloX — agent constitution

**GloX** (The FAUstairs Glossary Extractors and Curator) is a web application for FAUstairs
researchers and GloXers to extract glossary definitions from course materials (PDFs, FAU module
descriptions) into FloDown/FTML, annotate symbols and term references, curate definitions toward
MathHub export, and generate sTeX. Stack: TanStack Start (React 19, Vite 7), Prisma/PostgreSQL,
FTML/FloDown, MathHub backend, optional OpenAI assistance.

## Critical areas

Mistakes in these areas cause security incidents, data loss, semantic corruption of the domain
model, or broken core workflows:

| Area | Why critical |
| --- | --- |
| **Auth & sessions** | JWT cookies; password fingerprint invalidation; email verification gate |
| **Authorization & document ownership** | Users must only read/mutate their own documents unless Admin |
| **FloDown block lifecycle** | Cascade deletes rewrite symrefs across blocks; version history is authoritative |
| **Symbol propagation & deduplication** | Bulk URI replacement affects multiple blocks and export identity |
| **FTML/sTeX export** | Wrong URI rewriting breaks MathHub integration |
| **Role gates** | EXTRACTOR vs CURATOR vs ADMIN capabilities on curation and symbol management |

## Hard guardrails

- **MUST** enforce authentication on every server function that reads or mutates user data.
- **MUST** verify document ownership (or Admin role) before FloDown block, mark-reference, or
  LaTeX mutations tied to a document.
- **MUST NOT** allow login before email verification completes.
- **MUST NOT** accept requests when `JWT_SECRET` is missing (server misconfiguration).
- **MUST** invalidate all sessions when a user changes their password (password fingerprint).
- **MUST NOT** invent product MUST rules in `/specs/product/` — binding rules live in PRDs/SDDs.

## Pointers

| Document | Purpose |
| --- | --- |
| [`specs/DEVELOPER_GUIDE.md`](specs/DEVELOPER_GUIDE.md) | Lightweight vs full SDD workflow |
| [`specs/ai-native-development-architecture.md`](specs/ai-native-development-architecture.md) | Layered spec model, operating modes |
| [`specs/engineering/spec-authoring.md`](specs/engineering/spec-authoring.md) | EARS rules, templates, dictionary |
| [`specs/review/REVIEW_GUIDE.md`](specs/review/REVIEW_GUIDE.md) | Upstream review + Testing Trophy |
| [`specs/meta/domain-dictionary.yaml`](specs/meta/domain-dictionary.yaml) | Ubiquitous language |

## Conflict rule

Binding PRDs and SDDs in `/specs` outrank ad-hoc comments in code. Compliance PRDs (if added later)
outrank all other specs. When unsure, HALT and ask — see
[`specs/organization/organization.md`](specs/organization/organization.md).

## Code anchors

| Concern | Path |
| --- | --- |
| Server functions (API layer) | `src/serverFns/` |
| Auth | `src/server/auth/` |
| Prisma schema | `prisma/schema.prisma` |
| FTML export | `src/server/ftml/` |
| Routes (UI) | `src/routes/` |
