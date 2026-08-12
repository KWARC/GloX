---
id: auth-sessions
featured: true
upstream:
  - auth
compliance: []
code:
  - src/serverFns/login.server.ts
  - src/serverFns/signUp.server.ts
  - src/serverFns/verify.server.ts
  - src/serverFns/requestPasswordReset.server.ts
  - src/serverFns/resetPassword.server.ts
  - src/serverFns/adminUsers.server.ts
  - src/server/auth/requireUser.ts
  - src/server/auth/password.ts
---

# SDD: Authentication & sessions

## Domain context

Implements the auth PRD: signup with email verification, JWT session cookies with password
fingerprint invalidation, password reset, and Admin role management.

Out of scope (sibling specs):

- Document ownership on FloDown mutations — `flodown-blocks/lifecycle.md`
- UI route guards — enforced in `src/routes/` loaders; serverFns are the authoritative boundary

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/login.server.ts` | Validates credentials, checks email verification, issues JWT in HttpOnly `access_token` cookie (7-day Max-Age) plus `is_logged_in` marker cookie. |
| `src/serverFns/signUp.server.ts` | Creates user with bcrypt hash, sends 24-hour verification JWT via Nodemailer. |
| `src/serverFns/verify.server.ts` | Marks `emailVerified` from verification JWT. |
| `src/serverFns/requestPasswordReset.server.ts` | Sends 15-minute reset JWT; always returns generic success. |
| `src/serverFns/resetPassword.server.ts` | Updates password hash with optimistic concurrency; invalidates sessions via fingerprint mismatch. |
| `src/server/auth/requireUser.ts` | Verifies JWT, checks password fingerprint against current hash; throws on missing secret or invalid session. |
| `src/serverFns/adminUsers.server.ts` | Admin-only user listing and role updates; blocks self-role change. |

## Data contracts

| Field / enum | Values | Notes |
| --- | --- | --- |
| `UserRole` | `ADMIN`, `CURATOR`, `EXTRACTOR` | Default `EXTRACTOR` |
| `User.emailVerified` | boolean | Must be true before login |
| JWT payload | `userId`, `email`, `passwordFingerprint` | 7-day expiry |
| Cookies | `access_token` (HttpOnly), `is_logged_in` | SameSite=Lax; Secure in production |

## Business rules

### Signup & verification

**S-AUTH-01 (Event-Driven):** WHEN signup succeeds, the system MUST create a user with
`emailVerified=false` and MUST send a verification email containing a signed JWT link.

**Upstream:** R-AUTH-01

**S-AUTH-06 (Ubiquitous):** New users MUST receive role `EXTRACTOR` unless an Admin assigns a
different role later.

**Upstream:** R-AUTH-06

### Login & sessions

**S-AUTH-02 (Event-Driven):** WHEN login succeeds for a verified user, the system MUST set JWT
cookies with `passwordFingerprint` derived from HMAC-SHA256 of the password hash.

**Upstream:** R-AUTH-02

**S-AUTH-08 (Ubiquitous):** WHEN `JWT_SECRET` is unset, auth handlers MUST throw server
misconfiguration rather than issuing or accepting tokens.

**Upstream:** D-AUTH-03 (`jwt-session-fingerprint.md`)

### Password reset

**S-AUTH-03 (Event-Driven):** WHEN password reset is requested, the handler MUST return the same
success shape whether or not the email exists.

**Upstream:** R-AUTH-03

**S-AUTH-04 (Event-Driven):** WHEN password reset completes, the new hash MUST cause all existing JWT
fingerprints to fail verification in `requireUserId`.

**Upstream:** R-AUTH-04

### Password policy

**S-AUTH-09 (Ubiquitous):** Password validation MUST enforce ≥8 chars, uppercase, lowercase, and digit
via `validatePassword`.

**Upstream:** R-AUTH-09

**S-AUTH-10 (Ubiquitous):** Passwords MUST be hashed with bcrypt (10 salt rounds) before storage.

**Upstream:** R-AUTH-08, D-AUTH-04

### Admin & roles

**S-AUTH-05 (State-Driven):** WHILE the caller is Admin, `listAdminProfileUsers` and
`updateAdminUserRole` MUST succeed; non-Admins MUST receive forbidden.

**Upstream:** R-AUTH-05

**S-AUTH-07 (Event-Driven):** WHEN Admin targets their own user ID for role change, the system MUST
reject with an error.

**Upstream:** R-AUTH-07

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-AUTH-01 | R-AUTH-01 | Gap |
| S-AUTH-02 | R-AUTH-02 | Gap |
| S-AUTH-03 | R-AUTH-03 | Gap |
| S-AUTH-04 | R-AUTH-04 | Gap |
| S-AUTH-05 | R-AUTH-05 | Gap |
| S-AUTH-06 | R-AUTH-06 | Gap |
| S-AUTH-07 | R-AUTH-07 | Gap |
| S-AUTH-08 | D-AUTH-03 | Gap |
| S-AUTH-09 | R-AUTH-09 | Gap |
| S-AUTH-10 | R-AUTH-08, D-AUTH-04 | Gap |

## Implementation bugs

| ID | File(s) | Description |
| --- | --- | --- |
| BUG-001 | `src/serverFns/updateFloDownBlock.server.ts`, `createFloDownBlock*.server.ts`, others | Several FloDown serverFns check `loggedIn` but not Document ownership — see `flodown-blocks/lifecycle.md` S-FDB-08. |

## Related docs

- [`auth.md`](../../../prds/domains/auth.md)
- [`../../decisions/jwt-session-fingerprint.md`](../../decisions/jwt-session-fingerprint.md)
- [`../../decisions/password-storage.md`](../../decisions/password-storage.md)
