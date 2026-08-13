---
name: backend-skill
description: >-
  Use when working on TanStack Start server functions, Prisma queries,
  authentication, FTML/FloDown server logic, or any code under src/serverFns/
  or src/server/.
see_also:
  - AGENTS.md
  - .cursor/skills/frontend-skill/SKILL.md
---

# Backend skill — GloX

Load [`AGENTS.md`](../../../AGENTS.md) for critical-area guardrails (auth, document ownership,
FloDown lifecycle, symbol propagation, FTML export). Conventions here do not override PRDs, SDDs,
or ADRs.

# 1. General guidelines

## 1.1. Write small functions

Keep functions focused on one responsibility. Extract helpers when logic grows or repeats.

## 1.2. Prefer stateless functions

On the server, prefer pure helpers in `src/server/` and thin `createServerFn` handlers that delegate
to service modules (e.g. `src/server/document/document.service.ts`).

## 1.3. Use constants

Use descriptive names for constants instead of magic numbers.

## 1.4. Document regex expressions

Whenever a regular expression is used, add a one-line comment explaining what it matches.

## 1.5. Types

Don't overspecify types when they're obvious from context (literals, inference, or narrow guards).

# 2. Server functions (API layer)

GloX uses **TanStack Start** `createServerFn` for server endpoints.

| Pattern | Location |
| --- | --- |
| Callable from UI | `src/serverFns/*.server.ts` |
| Shared server logic | `src/server/**/*.ts` |
| Auth helpers | `src/server/auth/` |
| Prisma client | `src/lib/prisma.ts` |

## 2.1. Server function shape

```typescript
import { createServerFn } from "@tanstack/react-start";
import { requireUserId } from "@/server/auth/requireUser";

export const myAction = createServerFn({ method: "POST" })
  .inputValidator((data: MyInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    // delegate to src/server/...
  });
```

Use **GET** only for read-only handlers with no side effects. Prefer **POST** for mutations.

## 2.2. Authentication and authorization

### 2.2.1. Authentication

- Derive `userId` from the JWT cookie via `requireUserId()` or `requireUser()` — never trust IDs from
  the request body or query params.
- **MUST** reject when `JWT_SECRET` is missing (server misconfiguration).
- **MUST** validate password fingerprint on every authenticated request
  (`src/server/auth/requireUser.ts`).
- **MUST NOT** allow login before email verification completes.

Re-validate auth inside every server function that reads or mutates user data.

### 2.2.2. Authorization

- **MUST** verify document ownership (or Admin role) before FloDown block, mark-reference, or LaTeX
  mutations tied to a document.
- Use `src/server/auth/isAdmin.server.ts` for admin-only operations.
- Role gates: EXTRACTOR vs CURATOR vs ADMIN — see auth PRD/SDD under `specs/prds/domains/auth.md`.

A valid session alone is not sufficient for document-scoped mutations.

## 2.3. Returning errors

Throw `Error` with clear messages from handlers; TanStack Start surfaces them to the client. Validate
inputs early.

| Failure | Typical handling |
| --- | --- |
| Not authenticated | `throw new Error("Not authenticated")` |
| Invalid session / fingerprint | `throw new Error("Invalid or expired session")` |
| Missing ownership | `throw new Error("Forbidden")` or domain-specific message |
| Invalid input | `throw new Error("…")` naming the field when safe |
| Server misconfiguration | `throw new Error("Server misconfiguration")` |

## 2.4. Database interactions

Prisma schema: `prisma/schema.prisma`.

### 2.4.1. Never use `SELECT *`

Specify required fields in Prisma `select` / `include`. Avoid exposing sensitive columns.

### 2.4.2. Minimize database requests

Use `include` or batched queries instead of N+1 loops. Prefer `findUnique` when the key is unique.

### 2.4.3. Use transactions when appropriate

Use `prisma.$transaction` for related writes that must succeed or fail together (e.g. FloDown block
cascade updates, symbol propagation).

# 3. Critical server domains

| Domain | Key paths |
| --- | --- |
| Auth & sessions | `src/server/auth/`, `src/serverFns/login.server.ts`, `verify.server.ts` |
| Documents & upload | `src/server/document/`, `src/serverFns/upload.server.ts` |
| FloDown blocks | `src/server/floDownBlockDeletion.ts`, `src/serverFns/updateFloDownBlock.server.ts` |
| FTML / sTeX export | `src/server/ftml/`, `src/serverFns/latex.server.ts` |
| Symbol propagation | `src/serverFns/SymbolPropagation.server.ts` |
| Module descriptions | `src/server/modules/`, `src/serverFns/moduleDescription.server.ts` |
| LLM suggestions (optional) | `src/server/llm.ts`, `src/serverFns/llmSuggestion.server.ts` |

Vendor constraints for OpenAI: [`specs/engineering/external-deps/vendors/openai.md`](../../../specs/engineering/external-deps/vendors/openai.md).

# 4. Tests

- Runner: `pnpm test` (Vitest).
- No Playwright E2E configured yet — prefer integration tests on server functions and `src/server/`
  modules per [`specs/review/TESTING_GUIDE.md`](../../../specs/review/TESTING_GUIDE.md).
- Priority seams: login, document ownership, FloDown cascade delete.

See [frontend-skill](../frontend-skill/SKILL.md) for UI conventions.
