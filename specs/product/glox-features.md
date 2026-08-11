# GloX — shipped features

> **Layer:** Product inventory — orientation only. **Last verified:** 2026-08-11.
>
> Parent brief: [`glox.md`](./glox.md)

---

## Authentication & profiles

- **Email signup with verification** — New users register with email/password; must verify before login.
  - **What it does:** Sends verification link; blocks unverified login.
- **Password reset** — Time-limited email link to set a new password.
  - **What it does:** Invalidates existing sessions on password change.
- **Profile editing** — Users update first/last name.
- **Admin user management** — Admins list users and assign EXTRACTOR, CURATOR, or ADMIN roles.
  - **Variations:** Admin cannot change own role.

## Document upload & extraction

- **PDF upload** — Authenticated users upload PDFs with export identity metadata.
  - **What it does:** Deduplicates by file hash per user; extracts page text and JPEG previews.
- **Text selection → FloDown block** — Select text on a page to create a definition or paragraph block.
- **LLM definition suggestions** — Document-wide span suggestions via OpenAI (cached per document).
- **LLM definienda suggestions** — Per-block definiendum candidates.

## Semantic editing

- **Definiendum marking** — Declare the concept being defined inline in a statement.
- **Symref insertion** — Link terms to local Symbols or MathHub URIs from text selection.
- **Symbolic catalog search** — Stemmed search over static catalog (EN/DE/FR).
- **Automatic reference suggestions** — Sniffy-like suggestions while editing definitions.
- **FloDown preview** — Browser WASM rendering of FTML statements.

## Module descriptions

- **FAU module catalog search** — Search hierarchy from `MODULES_DIR`.
- **Module description workspace** — Seed title/inhalt/lernziele statements; extract definitions.
- **Module definition blocks** — Create FloDown blocks in module context (German default).

## Curation & export

- **Curation queue** — Curators review blocks by FloDown block status.
  - **Variations:** CURATOR and ADMIN only (route-gated).
- **Status lifecycle** — EXTRACTED → FINALIZED_IN_FILE → SUBMITTED_TO_MATHHUB (or DISCARDED).
- **LaTeX draft/final** — Save and version LaTeX output per document.
- **sTeX export** — Generate sTeX from combined FloDown statements with provenance injection.
- **Document location move** — Relocate export identity; updates symbols and blocks atomically.

## Symbols & deduplication

- **Symbol registry** — Local symbols keyed by name + export identity.
- **Symbol propagation** — Replace symbol URIs across referencing blocks.
- **MathHub URI replacement** — Bulk replace external URIs in block statements.
- **Duplicate confirmation** — Curators confirm symbols are not duplicates (`hasConfirmed`).

## Mark references

- **Page-level symbol mentions** — Lightweight verbalizations for LaTeX index export.

## Role summary

| Capability | EXTRACTOR | CURATOR | ADMIN |
| --- | --- | --- | --- |
| Upload & extract PDFs | ✓ | ✓ | ✓ |
| Module descriptions | ✓ | ✓ | ✓ |
| Curation queue | | ✓ | ✓ |
| Symbol delete (unassociated) | | ✓ | ✓ |
| View all users' documents | | | ✓ |
| User role management | | | ✓ |
