---
id: password-storage
status: Accepted
deciders: Engineering lead
related_sdd:
  - specs/engineering/features/auth/auth-sessions.md
related_prd:
  - specs/prds/domains/auth.md
code:
  - src/server/auth/password.ts
  - src/serverFns/signUp.server.ts
  - src/serverFns/resetPassword.server.ts
---

# Decisions: Password storage

## Context

GloX stores local user credentials. The PRD requires one-way password storage (R-AUTH-08) and a minimum
password complexity policy (R-AUTH-09). The hashing algorithm and work factor are engineering choices.

## Decision atoms

**D-AUTH-04:** Passwords MUST be hashed with bcrypt (10 salt rounds) before persistence; plaintext
passwords MUST NOT be written to the database or logs.

## Why (rationale)

| Alternative | Rejected because |
| --- | --- |
| Plaintext or reversible encryption | Violates R-AUTH-08; unacceptable on database breach |
| Argon2id | Stronger but adds dependency and ops tuning; bcrypt matches current stack and threat model |
| Lower bcrypt rounds | Faster brute-force on leaked hashes |

## Consequences

- Password verification uses `bcrypt.compare` against stored hashes.
- Raising rounds or switching algorithms requires a migration plan and superseding `D-*` atom.
- MUST NOT store or log plaintext passwords outside transient request handling.
