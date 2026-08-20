---
id: wikipedia-lookup
featured: true
upstream:
  - symbols-semantics
compliance: []
code:
  - src/serverFns/wikipediaSearch.server.ts
  - src/server/wikipedia/wikimediaSearch.ts
  - src/lib/wikipediaLanguage.ts
  - src/components/WikipediaDefinitionLookup.tsx
  - src/components/ExtractTextDialog.tsx
---

# SDD: Wikipedia lookup for new symbols

## Domain context

Owns Wikipedia search and in-dialog article display while creating a new local Symbol in the extract
/ add-content dialog. The definition input remains user-owned; Wikipedia is a reading aid.

Out of scope:

- Persisting Symbols — [`registry.md`](./registry.md)
- Symbolic catalog search — [`search.md`](./search.md)
- FloDown statement persist — [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
- GloX-hosted Wikipedia HTML proxy

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/wikipediaSearch.server.ts` | Authenticates the caller and returns ranked Wikipedia search hits for a search query and block language. It MUST NOT fetch or return full article HTML. |
| `src/server/wikipedia/wikimediaSearch.ts` | Calls the Wikimedia search API on the language wiki, sends the identifying User-Agent, and maps hits to the search-result contract. |
| `src/lib/wikipediaLanguage.ts` | Parses supported Wikipedia languages (`en`, `de`, `fr`) for client and server without importing server-only modules into the browser bundle. |
| `src/components/WikipediaDefinitionLookup.tsx` | Owns Wikipedia UI in create-symbol flow: a shared top row with the symbol name field (`symbolNameField`) and free-text Wikipedia search (Search / Enter + Clear), then a two-column body — left `children` (content name, block type, definition editor), right results / selected article iframe / Open on Wikipedia. On dialog open with a selected symbol name, runs one Wikipedia search for that name. |
| `src/components/ExtractTextDialog.tsx` | When `createSymbolFlow` is true, mounts Wikipedia lookup with the shared top row and two-column body, passes the symbol name field into `symbolNameField`, and keeps Cancel / Extract in a pinned modal footer while the middle content scrolls. Documents, module descriptions, and sTeX curation already pass `createSymbolFlow` into this dialog. |

## Data contracts

**Language wiki:** The block `language` value `en`, `de`, or `fr` selects
`https://{language}.wikipedia.org`. Other language values MUST NOT be mapped to another wiki.

**Search input:** `{ symbolName: string, language: string }` — `symbolName` is the free-text
Wikipedia query (often seeded from the new symbol name).

**Search result item:** `{ title: string, url: string }` where `url` is the canonical article URL on
that language wiki.

**Search output:** `{ results: SearchResultItem[] }` — empty `results` is a successful no-hit
response, not an authentication failure.

**Article iframe:** The iframe `src` is the selected result’s `url`. The server MUST NOT proxy that
document.

## Business rules

**S-SYM-09 (Event-Driven):** WHEN the Wikipedia search server function runs with a non-empty search
query and a block language of `en`, `de`, or `fr`, the system MUST query that language wiki’s
MediaWiki REST search (`GET /w/rest.php/v1/search/page` with query parameter `q` set to the search
query) and MUST return the ranked hit list as `title` and `url` pairs.

**Upstream:** R-SYM-09

**S-SYM-10 (Event-Driven):** WHEN Wikipedia search returns one or more results in `ExtractTextDialog`
under `createSymbolFlow`, the system MUST select the first result, MUST set the article iframe `src`
to that result’s `url`, and MUST show that result’s title and URL outside the iframe. WHEN the user
selects a search result, the system MUST apply the same display behavior for that result.

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

**S-SYM-16 (Ubiquitous):** The extract dialog MUST invoke Wikipedia search from an explicit Search
control or Enter submit in the Wikipedia panel, or once when create-symbol opens with a non-empty
selected symbol name. Changing the symbol name field or the Wikipedia query field MUST NOT by itself
call Wikimedia after that open-time search.

**Upstream:** R-SYM-09

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-SYM-09 | R-SYM-09 | Gap — waived 2026-08-15 (skip tests) |
| S-SYM-10 | R-SYM-10 | Gap — waived 2026-08-15 (skip tests) |
| S-SYM-11 | R-SYM-11 | Gap — waived 2026-08-15 (skip tests) |
| S-SYM-12 | R-SYM-12 | Gap — waived 2026-08-15 (skip tests) |
| S-SYM-13 | R-SYM-13 | Gap — waived 2026-08-15 (skip tests) |
| S-SYM-14 | R-SYM-14 | Gap — waived 2026-08-15 (skip tests) |
| S-SYM-15 | R-SYM-15 | Gap — waived 2026-08-15 (skip tests) |
| S-SYM-16 | R-SYM-09 | Gap — waived 2026-08-15 (skip tests) |

## Related docs

- [`symbols-semantics.md`](../../../prds/domains/symbols-semantics.md)
- [`registry.md`](./registry.md)
- [`search.md`](./search.md)
- [`../../external-deps/vendors/wikipedia.md`](../../external-deps/vendors/wikipedia.md)
