# Design: Wikipedia definition for new symbols

> **Layer:** *how* — **SDD / tech-spec delta** for the current stack. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical tech specs until Archive.
>
> **Depends on:** Signed `clarify.md`; `proposal.md` reviewed. SDD = policy and boundaries on the current stack — not pseudo-code.
> See [spec-authoring §7](../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).

---

## SDD delta

Fold at Archive into a new SDD
[`specs/engineering/features/symbols-semantics/wikipedia-lookup.md`](../engineering/features/symbols-semantics/wikipedia-lookup.md)
and a vendor file
[`specs/engineering/external-deps/vendors/wikipedia.md`](../engineering/external-deps/vendors/wikipedia.md).
Do not edit those canonical paths until Archive. Update
[`symbols-semantics/index.md`](../engineering/features/symbols-semantics/index.md) and the
spec-authoring area registry (`WIKI` vendor) at Archive.

This SDD implements proposal PRD rules R-SYM-09 through R-SYM-15. It does not change symbol
registry uniqueness, propagation, or FloDown persist beyond the existing extract/create submit.

### Domain context

Owns Wikipedia search and in-dialog article display while creating a new local Symbol in the extract
/ add-content dialog. The definition input remains user-owned; Wikipedia is a reading aid.

Out of scope:

- Persisting Symbols — [`registry.md`](../engineering/features/symbols-semantics/registry.md)
- Symbolic catalog search — [`search.md`](../engineering/features/symbols-semantics/search.md)
- FloDown statement persist — [`flodown-blocks/lifecycle.md`](../engineering/features/flodown-blocks/lifecycle.md)
- GloX-hosted Wikipedia HTML proxy (Clarify option E / proposal v2)

### Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/` Wikipedia search server function | Authenticates the caller and returns ranked Wikipedia search hits for a symbol name and block language. It MUST NOT fetch or return full article HTML. |
| `src/server/` Wikimedia client helper | Calls the Wikimedia search API on the language wiki, sends the identifying User-Agent, and maps hits to the search-result contract. |
| `src/components/ExtractTextDialog.tsx` | When `createSymbolFlow` is true, this dialog owns the explicit search control, result list, live article iframe, title and URL display, Open on Wikipedia fallback, and the definition textarea. Documents, module descriptions, and sTeX curation already pass `createSymbolFlow` into this dialog. |

### Data contracts

**Language wiki:** The block `language` value `en`, `de`, or `fr` selects
`https://{language}.wikipedia.org`. Other language values MUST NOT be mapped to another wiki.

**Search input:** `{ symbolName: string, language: string }`

**Search result item:** `{ title: string, url: string }` where `url` is the canonical article URL on
that language wiki.

**Search output:** `{ results: SearchResultItem[] }` — empty `results` is a successful no-hit
response, not an authentication failure.

**Article iframe:** The iframe `src` is the selected result’s `url`. The server MUST NOT proxy that
document.

### Business rules

**S-SYM-09 (Event-Driven):** WHEN the Wikipedia search server function runs with a non-empty symbol
name and a block language of `en`, `de`, or `fr`, the system MUST query that language wiki’s
MediaWiki REST search (`GET /w/rest.php/v1/search/page` with query parameter `q` set to the symbol
name) and MUST return the ranked hit list as `title` and `url` pairs.

**Upstream:** R-SYM-09

**S-SYM-10 (Event-Driven):** WHEN the user selects a search result in `ExtractTextDialog` under
`createSymbolFlow`, the system MUST set the article iframe `src` to that result’s `url` and MUST
show that result’s title and URL outside the iframe.

**Upstream:** R-SYM-10

**S-SYM-11 (Event-Driven):** WHEN the user selects a different search result, the system MUST replace
the iframe `src` with the newly selected result’s `url` and MUST update the visible title and URL to
that result.

**Upstream:** R-SYM-11

**S-SYM-12 (Event-Driven):** WHEN search returns an empty hit list, or WHEN the block language is not
`en`, `de`, or `fr`, or WHEN the Wikimedia search request fails, the system MUST show a no-article
message and MUST NOT set an article iframe `src`.

**Upstream:** R-SYM-12

**S-SYM-13 (Ubiquitous):** Wikipedia search and article display MUST NOT write into the definition
textarea. The textarea changes only through the user’s existing typing and paste handlers.

**Upstream:** R-SYM-13

**S-SYM-14 (Event-Driven):** WHEN the article iframe fails to load the selected `url`, the system
MUST keep the search result list and MUST show a control that opens that `url` on Wikipedia in a new
browsing context.

**Upstream:** R-SYM-14

**S-SYM-15 (Ubiquitous):** The Wikipedia search server function MUST reject unauthenticated callers
and MUST NOT call Wikimedia when authentication fails.

**Upstream:** R-SYM-15

**S-SYM-16 (Ubiquitous):** The extract dialog MUST invoke Wikipedia search only from an explicit user
control. Changing the symbol name field MUST NOT by itself call Wikimedia.

**Upstream:** R-SYM-09 (explicit request)

### Vendor facts (Archive → `wikipedia.md`)

**E-WIKI-01:** Every GloX request to Wikimedia MUST send an identifying `User-Agent` (or
`Api-User-Agent`) that names GloX and a contact. Anonymous or generic library agents MUST NOT be
used.

**E-WIKI-02:** GloX MUST NOT expose an unauthenticated Wikimedia search proxy.

**E-WIKI-03:** v1 MUST NOT fetch Wikipedia article HTML for rendering inside GloX. Article display is
the live article URL in an iframe, or Open on Wikipedia if framing fails.

## Boundaries

| Area | Paths / identifiers |
| --- | --- |
| Code | `src/components/ExtractTextDialog.tsx`; new `src/serverFns/*wikipedia*.server.ts`; new `src/server/` Wikimedia helper |
| Data | No Prisma change. No `Symbol.description`. Search results are request-scoped only. |
| Tenants / tiers | Authenticated Extractor, Curator, or Admin. Same `createSymbolFlow` dialogs as today. |

## ADR alignment

Pass. No new `D-*`. Vendor facts are `E-WIKI-*`, not an ADR.

## Operations

| Concern | Link or N/A |
| --- | --- |
| Vendors | New `E-WIKI-*` (this file). Wikimedia REST search; no API key. Identifying User-Agent required. |
| Deployment / flags | N/A — no feature flag. App Content-Security-Policy MUST allow framing `https://*.wikipedia.org` if a CSP is present. No new secrets. |

## Test mapping

Every MUST NOT has a negative test.

| Rule ID / summary | Test (file or describe block) | Layer (integration / unit / E2E) |
| --- | --- | --- |
| S-SYM-09 / R-SYM-09 — authenticated search returns ranked title+url for en/de/fr | `wikipediaSearch.integration.test.ts` — mock Wikimedia REST; assert language host and `q` | integration |
| S-SYM-12 — empty hits, unsupported language, or Wikimedia failure → message, no iframe src | same file + ExtractTextDialog unit | integration / unit |
| S-SYM-13 — search success MUST NOT change definition textarea | ExtractTextDialog unit: after search, textarea value unchanged | unit |
| S-SYM-15 — unauthenticated search rejected; Wikimedia not called | `wikipediaSearch.integration.test.ts` negative | integration |
| S-SYM-10 / S-SYM-11 — select result sets iframe src; other result replaces src; title and URL visible | ExtractTextDialog unit | unit |
| S-SYM-14 — iframe error keeps list and shows Open on Wikipedia | ExtractTextDialog unit | unit |
| S-SYM-16 — symbol name `onChange` does not call search | ExtractTextDialog unit | unit |
| E-WIKI-01 — User-Agent present on outbound search | unit or integration on Wikimedia helper | unit / integration |

---

Upstream review: Keerthan K — 2026-08-14
Scope: design
Teach-back: confirmed
Test mapping: waived for this change (human: skip tests)
