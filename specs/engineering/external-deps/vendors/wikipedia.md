# External fact: Wikipedia / Wikimedia

**Kind:** Vendor (`E-WIKI-*`) — MediaWiki REST search and live article URLs for new-symbol definition
authoring.

## What it is

GloX queries language Wikipedia (`en`, `de`, `fr`) for ranked search hits while a GloXer creates a
new Symbol. Article HTML is not fetched or proxied; the UI embeds the live article URL in an iframe
or opens it on Wikipedia.

## Configuration

| Concern | Notes |
| --- | --- |
| API key | None |
| User-Agent | Required identifying agent on every outbound Wikimedia request |

## GloX usage

| Concern | Code path |
| --- | --- |
| Search server function | `src/serverFns/wikipediaSearch.server.ts` |
| Wikimedia HTTP client | `src/server/wikipedia/wikimediaSearch.ts` |
| Language helpers | `src/lib/wikipediaLanguage.ts` |
| Create-symbol UI | `src/components/WikipediaDefinitionLookup.tsx` |

## Agent constraints

**E-WIKI-01:** Every GloX request to Wikimedia MUST send an identifying `User-Agent` (or
`Api-User-Agent`) that names GloX and a contact. Anonymous or generic library agents MUST NOT be
used.

**E-WIKI-02:** GloX MUST NOT expose an unauthenticated Wikimedia search proxy.

**E-WIKI-03:** v1 MUST NOT fetch Wikipedia article HTML for rendering inside GloX. Article display is
the live article URL in an iframe, or Open on Wikipedia if framing fails.

## Related docs

- [`../../prds/domains/symbols-semantics.md`](../../prds/domains/symbols-semantics.md)
- [`../../features/symbols-semantics/wikipedia-lookup.md`](../../features/symbols-semantics/wikipedia-lookup.md)
