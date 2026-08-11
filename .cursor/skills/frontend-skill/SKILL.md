---
name: frontend-skill
description: Use when working on React components, pages, UI styling, state management, or any frontend code in next-js-app.
see_also:
  - apps/next-js-app/AGENTS.md
  - .cursor/skills/backend-skill/SKILL.md
---

# Frontend skill — `next-js-app`

Load [`apps/next-js-app/AGENTS.md`](../../../apps/next-js-app/AGENTS.md) for tenant rules and critical-area paths.
Conventions here do not override PRDs, SDDs, or ADRs.

# General guidelines

## Write small functions

Keep functions focused on one responsibility. Extract helpers when logic grows or repeats.

## Prefer stateless functions

Prioritize functions **outside** components over handlers inside components that only wrap state.
Lift data fetching into TanStack Query hooks or `interfaces/spec` helpers where possible.

## Use constants

Use descriptive names for constants instead of magic numbers:

```typescript
const SEC_PER_HOUR = 3600;
const WAIT_DURATION_HRS = 14;
const endTimestampSec = startTimestampSec + WAIT_DURATION_HRS * SEC_PER_HOUR;
```

## Document regex expressions

Whenever a regular expression is used, add a one-line comment explaining what it matches.

## Function parameters

Use a single object parameter instead of many positional args (see § Function Parameters below).

# Monorepo Structure

```
apps/
├── next-js-app/        # Main Next.js application (Pages Router + App Router)
│   └── e2e/            # Playwright E2E tests

libs/
├── prisma/             # Database schema + migrations
├── shared/             # Shared utilities (Firebase, email)
├── shared-server/      # Server-only utilities (Slack)
└── utils/              # Common utilities (Prisma client, helpers, GCS, Stripe)

one-off-scripts/        # Standalone scripts for migrations, data fixes, etc.
```

# Nx Commands

- `nx dev next-js-app` – Start dev server
- `nx build next-js-app` – Production build
- `nx lint next-js-app` – Lint the app

# Core Tech Stack

- **Next.js (Pages Router)**: Primary routing in `apps/next-js-app/pages/`, API routes in `pages/api/`
- **Next.js (App Router)**: AI/streaming endpoints in `apps/next-js-app/app/api/`
- **React + TypeScript**: Component-driven UI with typed props/state
- **TanStack Query (React Query)**: Server state management, provider in `apps/next-js-app/utils/query-client-provider.tsx`
- **Material UI (MUI)**: Layout/components + theme in `apps/next-js-app/config/theme/`
- **Prisma**: DB schema in `libs/prisma/schema.prisma`, client in `libs/utils/src/lib/prisma.ts`
- **Redis**: Caching layer in `apps/next-js-app/redis/`
- **LaunchDarkly**: Feature flags in `apps/next-js-app/launchdarkly/`
- **Firebase**: Auth utilities in `libs/shared/`
- **Stripe**: Payment utilities in `libs/utils/`

# Key Directories in `next-js-app`

| Path               | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `pages/`           | Page routes (Pages Router)                     |
| `pages/api/`       | API endpoints (Pages Router)                   |
| `app/api/`         | Streaming/AI endpoints (App Router)            |
| `components/`      | React components                               |
| `interfaces/spec/` | API types + axios wrapper functions            |
| `contexts/`        | React contexts (app state, chat, theme)        |
| `config/`          | App configuration (theme, etc.)                |
| `utils/`           | App utilities (includes query-client-provider) |
| `middleware.ts`    | Next.js middleware                             |

# Shared Libraries

| Library                       | Import Path           | Purpose                             |
| ----------------------------- | --------------------- | ----------------------------------- |
| `@wald-nx-next/utils`         | `libs/utils/`         | Prisma client, helpers, GCS, Stripe |
| `@wald-nx-next/shared`        | `libs/shared/`        | Firebase, email utilities           |
| `@wald-nx-next/shared-server` | `libs/shared-server/` | Slack utilities (server-only)       |

# API client usage

Server route conventions (auth, status codes, Prisma): [backend-skill](../backend-skill/SKILL.md).

## Types and wrapper functions

1. Define request/response types in `interfaces/spec/*`
2. Export typed wrapper functions from the same module
3. Use those wrappers from components and TanStack Query hooks — not inline `axios.get('/api/...')`

## Error handling (UI)

- **Components/pages**: Handle user-facing errors (snackbar/toast, inline error state)
- Map API failures to clear copy; do not expose raw stack traces or internal field names

# TanStack Query (Data Fetching)

Use TanStack Query for all client-side data fetching. The provider is configured in `utils/query-client-provider.tsx`.

# CSS Guidelines

Use **MUI's `sx` prop system**. Keep styles local to component.

## Prefer MUI numbers over 'rem' and 'px'

```diff
- <Box sx={{ px: "4px" }}></Box>
+ <Box sx={{ px: 0.5 }}></Box>
```

## Style Object Structure

Define styles at **bottom of file**:

```tsx
const componentSx: Record<"root" | "header" | "content", SxProps<Theme>> = {
  root: {
    /* styles */
  },
  header: {
    /* styles */
  },
  content: {
    /* styles */
  },
};
```

## Function Parameters

Use object with fields instead of multiple params:

```typescript
export async function sendEmail({
  to,
  subject,
  html,
  cc = [],
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  attachments?: { filename: string; path: string }[];
}) {
  // ...
}
```
