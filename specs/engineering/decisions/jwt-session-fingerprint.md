---
id: jwt-session-fingerprint
status: Accepted
deciders: Engineering lead
related_sdd:
  - specs/engineering/features/auth/auth-sessions.md
related_prd:
  - specs/prds/domains/auth.md
code:
  - src/server/auth/password.ts
  - src/serverFns/login.server.ts
---

# Decisions: JWT session fingerprint

## Context

GloX uses stateless JWT cookies for sessions. On password change or reset, all prior sessions must
invalidate without maintaining a server-side session table.

## Decision atoms

**D-AUTH-01:** JWT payloads include a `passwordFingerprint` — HMAC-SHA256 of the bcrypt password
hash keyed by `JWT_SECRET` — verified on every `requireUserId` call.

**D-AUTH-02:** Session cookies use HttpOnly `access_token` plus a non-HttpOnly `is_logged_in` marker
for client-side UI state only; authorization MUST NOT rely on `is_logged_in` alone.

## Why (rationale)

| Alternative | Rejected because |
| --- | --- |
| Server-side session store | Added operational complexity for a single-app deployment |
| Short JWT expiry only | Does not invalidate sessions immediately on password compromise reset |
| Refresh token rotation | Overkill for current threat model |

## Consequences

- Changing `JWT_SECRET` invalidates all sessions (acceptable for rare rotation).
- Fingerprint check requires a DB read on authenticated requests — acceptable for current scale.
- MUST NOT remove fingerprint verification without a superseding decision and security review.
