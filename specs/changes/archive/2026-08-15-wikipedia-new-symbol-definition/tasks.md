# Tasks: Wikipedia definition for new symbols

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md`. Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

**Waived.** Human instruction 2026-08-14: skip tests. Do not add files from
[`design.md` Test mapping](./design.md). Owner: Keerthan K.

- [x] Red phase skipped (waiver) — mapped tests in design.md are not in this Apply

## Implementation

- [x] Add Wikimedia search helper in `src/server/` — [design.md](./design.md) S-SYM-09, S-SYM-12, E-WIKI-01, E-WIKI-03. Call `GET /w/rest.php/v1/search/page?q=` on `https://{en|de|fr}.wikipedia.org` only. Send identifying User-Agent. Map hits to `{ title, url }`. Do not fetch article HTML. Unsupported language or request failure → empty results or a failure the serverFn can surface without calling another wiki.
- [x] Add authenticated Wikipedia search `createServerFn` in `src/serverFns/` — S-SYM-09, S-SYM-15, E-WIKI-02. Require session (`currentUser` / `requireUserId`) before any Wikimedia call. Input `{ symbolName, language }`. Return `{ results }`. Empty symbol name or unauthenticated → reject; do not call Wikimedia.
- [x] In [`ExtractTextDialog.tsx`](../../src/components/ExtractTextDialog.tsx) when `createSymbolFlow` is true: explicit search control using the current symbol name and block language (`location.language` or the language already shown in that dialog) — S-SYM-09, S-SYM-16. Do not search on symbol-name `onChange`.
- [x] Show ranked result list; selecting a row sets iframe `src` to that `url` and shows title + URL — S-SYM-10. Selecting another row replaces iframe `src` and the visible title/URL — S-SYM-11.
- [x] Empty hits, unsupported language, or search failure: message, no iframe `src` — S-SYM-12.
- [x] Iframe `onError` (or equivalent load failure): keep the list; show control that opens the selected `url` in a new browsing context — S-SYM-14.
- [x] Do not write search or iframe output into the definition textarea — S-SYM-13. Existing typing/paste handlers stay the only writers.
- [x] Confirm no app CSP blocks `https://*.wikipedia.org` iframes — design.md Operations. If none exists, no change.

## Verify

- [x] `pnpm typecheck` passes
- [x] Mapped automated tests: **not run** (Red phase waiver). Human smoke: create-new-symbol dialog → explicit search → list → iframe switch → copy into definition → Open on Wikipedia if iframe blank. Unauthenticated search is not callable from a logged-out session.

---

## Verify report (REVIEW_GUIDE §1.5)

| Checklist item | Result |
| --- | --- |
| Every `tasks.md` implementation item done | **pass** — all Implementation and Apply Verify boxes checked |
| Mapped tests green; every MUST NOT has negative test | **waiver** — Red phase skipped 2026-08-14 (Keerthan K). Mapped tests not written. MUST NOT coverage relies on human smoke + code review of S-SYM-13 / S-SYM-15 / E-WIKI-02 |
| `design.md` decisions reflected in shipped code | **pass** (after Verify fix) — see teach-back |
| `proposal.md` PRD delta matches what shipped | **pass** — R-SYM-09–15 outcomes present in UI + serverFn |
| Teach-back without relying only on git diff | **pass** — below |

### Verify fix during this run

- Client no longer imports from `src/server/wikipedia/` (helpers moved to `src/lib/wikipediaLanguage.ts`).
- **Open on Wikipedia** is always available when an article is selected (iframe `onError` alone is unreliable for framing blocks).

### Teach-back (shipped)

| Rule | What shipped |
| --- | --- |
| R/S-SYM-09 | Explicit Search Wikipedia → authenticated serverFn → MediaWiki REST search on en/de/fr |
| R/S-SYM-10 | Select result → iframe + title + URL |
| R/S-SYM-11 | Another result replaces iframe src and title/URL |
| R/S-SYM-12 | Empty / unsupported language / failure → message; no iframe |
| R/S-SYM-13 | Definition textarea never written by Wikipedia UI |
| R/S-SYM-14 | Result list kept; Open on Wikipedia opens selected URL |
| R/S-SYM-15 | Unauthenticated → Unauthorized before Wikimedia call |
| S-SYM-16 | Search only on button click, not symbol-name onChange |
| E-WIKI-01–03 | Identifying User-Agent; auth gate; no HTML proxy |

```
Verify: 2026-08-15
Human sign-off (cursory): Keerthan K — 2026-08-15
Outcome: pass | waivers: Red-phase / mapped automated tests (Keerthan K, 2026-08-14)
```

<!-- After Archive: fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-wikipedia-new-symbol-definition/. -->
