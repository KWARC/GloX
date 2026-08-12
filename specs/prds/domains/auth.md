---
id: auth
featured: true
upstream:
  - glox
compliance: []
code:
  - specs/engineering/features/auth/auth-sessions.md
---

# PRD: Authentication & authorization

GloX accounts protect uploaded course materials and curated glossary content. This PRD covers signup,
email verification, login sessions, password reset, and role-based access for Extractor, Curator, and
Admin users.

## Business rules

### Product outcomes

**R-AUTH-01 (Event-Driven):** WHEN a new user completes signup, the system MUST send a verification
email and MUST NOT allow login until email verification succeeds.

**R-AUTH-02 (Event-Driven):** WHEN a user submits valid credentials and their email is verified, the
system MUST establish an authenticated session lasting up to seven days.

**R-AUTH-03 (Event-Driven):** WHEN a user requests password reset for a registered email, the system
MUST send a time-limited reset link and MUST respond with a generic success message regardless of
whether the email exists.

**R-AUTH-04 (Event-Driven):** WHEN a user sets a new password via a valid reset link, the system MUST
invalidate all existing sessions for that user.

**R-AUTH-05 (State-Driven):** WHILE a user holds the Admin role, the system MUST allow viewing all
Documents and MUST allow assigning Extractor, Curator, or Admin roles to other users.

**R-AUTH-06 (Ubiquitous):** The system MUST assign the Extractor role to new signups by default.

**R-AUTH-07 (Event-Driven):** WHEN an Admin attempts to change their own role, the system MUST reject
the change.

### Binding operator / compliance promises

**R-AUTH-08 (Ubiquitous):** The system MUST NOT store user passwords in plaintext or reversibly
encrypted form.

**Rationale:** Database breach exposes credentials if passwords are not stored using one-way hashing.

**R-AUTH-09 (Ubiquitous):** Passwords MUST require at least eight characters including uppercase,
lowercase, and a digit.

**Rationale:** Weak passwords increase account takeover risk for documents containing unpublished
course materials.

## Out of scope

- Document and FloDown block ownership enforcement — see `documents-extraction.md` and
  `flodown-blocks.md`
- Curator-only UI route gates — see `curation-export.md`
- OAuth / SSO — not implemented

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-AUTH-01 | `auth-sessions.md` S-AUTH-01 |
| R-AUTH-02 | `auth-sessions.md` S-AUTH-02 |
| R-AUTH-03 | `auth-sessions.md` S-AUTH-03 |
| R-AUTH-04 | `auth-sessions.md` S-AUTH-04 |
| R-AUTH-05 | `auth-sessions.md` S-AUTH-05 |
| R-AUTH-06 | `auth-sessions.md` S-AUTH-06 |
| R-AUTH-07 | `auth-sessions.md` S-AUTH-07 |
| R-AUTH-08 | `auth-sessions.md` S-AUTH-10 |
| R-AUTH-09 | `auth-sessions.md` S-AUTH-09 |

## Related docs

- [`auth-sessions.md`](../../engineering/features/auth/auth-sessions.md)
- [`jwt-session-fingerprint.md`](../../engineering/decisions/jwt-session-fingerprint.md)
- [`password-storage.md`](../../engineering/decisions/password-storage.md)
- [`glox.md`](../../product/glox.md)
