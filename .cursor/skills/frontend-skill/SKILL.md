---
name: frontend-skill
description: >-
  Use when working on React components, TanStack Router pages, Mantine UI,
  client state, or any frontend code under src/routes/ or src/components/.
see_also:
  - AGENTS.md
  - .cursor/skills/backend-skill/SKILL.md
---

# Frontend skill — GloX

Load [`AGENTS.md`](../../../AGENTS.md) for critical-area guardrails. Conventions here do not
override PRDs, SDDs, or ADRs.

# General guidelines

## Write small functions

Keep functions focused on one responsibility. Extract helpers when logic grows or repeats.

## Prefer stateless functions

Prioritize functions **outside** components over handlers inside components that only wrap state.
Lift data fetching into TanStack Query hooks or server-function callers where possible.

## Use constants

Use descriptive names for constants instead of magic numbers.

## Document regex expressions

Whenever a regular expression is used, add a one-line comment explaining what it matches.

## Function parameters

Use a single object parameter instead of many positional args when there are three or more parameters.

# Repository layout

```
src/
├── routes/           # TanStack Router file-based routes
├── components/       # React components (feature folders)
├── hooks/            # Custom hooks
├── serverFns/        # TanStack Start server functions (callable from UI)
├── server/           # Server-only modules (not imported from client bundles)
├── lib/              # Shared utilities (flodownClient, prisma client wrapper)
├── types/            # Shared TypeScript types (ftml.types.ts, floDown.types.ts)
└── queries/          # TanStack Query option factories
```

# Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server (port 3000) |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (unit/integration) |

# Core tech stack

- **TanStack Start + Router**: File routes in `src/routes/`; SSR via Nitro
- **React 19 + TypeScript**: Component-driven UI
- **TanStack Query**: Server state; `src/queryClient.ts`
- **Mantine 8**: UI components (`@mantine/core`, `@mantine/hooks`)
- **Tailwind CSS v4**: Utility classes alongside Mantine
- **FloDown / FTML**: Browser preview via `src/lib/flodownClient.ts`, `src/components/FtmlPreview.tsx`
- **Flexiformal FTML libs**: `@flexiformal/ftml`, `@flexiformal/ftml-react`

# Key directories

| Path | Purpose |
| --- | --- |
| `src/routes/` | Page routes (`files/$documentId.tsx`, `module-descriptions/`, etc.) |
| `src/components/` | UI components (stex-curation, semantic-panel, module-descriptions, …) |
| `src/hooks/` | Feature hooks (extraction flows, semantics, upload) |
| `src/types/ftml.types.ts` | GloX FTML AST subset |
| `src/types/floDown.types.ts` | FloDown block / statement types |
| `public/flodown/` | FloDown WASM bundle (`flodown.js`, `flodown_bg.wasm`) |

# Data fetching

Call server functions from components or hooks — not raw `fetch` to invented API paths:

```typescript
import { myDocuments } from "@/serverFns/myDocuments.server";

// In a loader or useQuery:
const docs = await myDocuments();
```

Server function conventions: [backend-skill](../backend-skill/SKILL.md).

# FloDown preview

- Initialize once per session: `initFloDown()` from `src/lib/flodownClient.ts` (sets MathHub backend URL).
- Render curated FTML: `FtmlPreview` component — dual hidden/visible block pattern for symbol deps.
- Do not call `floDown.setBackendUrl` again after `initFloDown()` unless you have a documented reason.

See [`public/flodown/README.md`](../../../public/flodown/README.md) for FloDown API details.

# Styling

- Prefer **Mantine** components and props for layout and typography.
- Use **Tailwind** utilities for fine-grained spacing/layout where Mantine is heavy.
- Keep styles colocated with components; avoid global CSS except theme entry.

# Role-aware UI

Respect EXTRACTOR vs CURATOR vs ADMIN capabilities in curation and symbol management UI. When adding
controls, check existing patterns in `src/components/stex-curation/` and auth helpers on the server.

# Tests

- `pnpm test` — Vitest; no E2E suite yet.
- Prefer testing hooks and pure helpers; integration tests for critical flows per TESTING_GUIDE.
