---
name: backend-skill
description: Use when working on API routes, database queries, authentication, or any server-side code in pages/api or app/api.
see_also:
  - apps/next-js-app/AGENTS.md
  - .cursor/skills/frontend-skill/SKILL.md
---

# Backend skill — `next-js-app`

Load [`apps/next-js-app/AGENTS.md`](../../../apps/next-js-app/AGENTS.md) for tenant rules and critical-area paths.
Conventions here do not override PRDs, SDDs, or ADRs.

# 1. General guidelines

## 1.1. Write small functions

Keep functions focused on one responsibility. Extract helpers when logic grows or repeats.

## 1.2. Prefer stateless functions

Prioritize functions **outside** components over those inside components that use component state.
On the server, prefer pure helpers and thin route handlers that delegate to `lib/` modules.

## 1.3. Use constants

Use descriptive names for constants instead of magic numbers:

```typescript
const SEC_PER_HOUR = 3600;
const WAIT_DURATION_HRS = 14;
const endTimestampSec = startTimestampSec + WAIT_DURATION_HRS * SEC_PER_HOUR;
```

## 1.4. Document regex expressions

Whenever a regular expression is used, add a one-line comment explaining what it matches — regex
patterns are hard to read and maintain.

```typescript
// Matches a UUID v4 in lowercase hex
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
```

## 1.5. Types

Don't overspecify types when they're obvious from context (literals, inference, or narrow guards).

# 2. Writing APIs

Applies to `pages/api/**` and `app/api/**` unless a streaming/App Router pattern requires otherwise.

## 2.1. Use only HTTP GET and POST methods

Avoid DELETE, PATCH, PUT, etc. — they are limiting and easy to misuse. Use descriptive route names
instead of relying on HTTP verbs.

Use **GET** only when **both** are true:

1. The API does not require a body
2. The API is purely for reading and does not update any resources

## 2.2. Prefer query parameters or HTTP body over dynamic segments

Next.js supports dynamic routes, but query parameters or POST bodies keep a flatter, more readable
directory structure.

## 2.3. Organize your APIs

Group APIs related to a resource or feature in a single directory (e.g. `pages/api/memory/`,
`pages/api/admin/`).

## 2.4. Authentication and authorization

### 2.4.1. Authentication

Derive user IDs and emails from authentication tokens (or load the user from the DB using a
token-derived ID). **Never** trust IDs or emails from the request body or query params.

Re-validate auth inside each API route and server action — do not rely on middleware alone.

### 2.4.2. Authorization

Implement explicit authorization for each API (team membership, admin role, tenant gate, plan tier).
A valid session alone is not sufficient.

## 2.5. Returning errors

Return appropriate status codes with simple, helpful messages for debugging.

### 2.5.1. Error codes

| Error type | Code |
| --- | --- |
| Invalid params (query, body, or path segment) | 422 |
| Couldn't find or decode user token | 401 |
| Unauthorized access | 403 |
| Already exists | 409 |
| Unknown | 500 |

Validate inputs early in the handler; return clear status + message.

### 2.5.2. Avoid sending JSON responses with errors

Prefer plain-text error bodies via `res.status(code).send("message")` for errors. Reserve
`res.status(200).json(...)` (or structured JSON) for successful responses.

Legacy routes may still use `.json({ message })` on errors — match the surrounding file when editing,
but use `.send()` for new error paths.

### 2.5.3. Provide informative error messages

Avoid messages that only restate the status code (e.g. `"Unauthorized"` with no context when the
failure mode is ambiguous). Name the missing or invalid field when safe to do so.

## 2.6. Database interactions

Prisma schema and migration discipline: [`specs/engineering/database-standards.md`](../../../specs/engineering/database-standards.md).

### 2.6.1. Never use `SELECT *`

Specify required fields in Prisma `select` / `include` (or explicit SQL column lists). This optimizes
queries and avoids accidentally exposing sensitive columns.

### 2.6.2. Minimize database requests

Use joins, `include`, or batched queries instead of N+1 loops. Prefer `findUnique` over `findFirst`
when the lookup key is unique.

### 2.6.3. Use transactions when appropriate

Use `prisma.$transaction` (or equivalent) for related writes that must succeed or fail together
(e.g. accept-invitation flows that create membership and update invitation state).

# 3. API specifications

Document API contracts so the frontend can call routes safely. Shared home: `interfaces/spec/*`.

## 3.1. Define types for request body and response

Add request/response types in `apps/next-js-app/interfaces/spec/*` and use them in the route handler.

## 3.2. Create wrapper functions for API calls

Export typed client helpers from `interfaces/spec/*` that hide URL, method, and axios details. Call
those helpers from components and hooks — not inline `axios.get('/api/...')`.

See [frontend-skill](../frontend-skill/SKILL.md) § API client usage.
