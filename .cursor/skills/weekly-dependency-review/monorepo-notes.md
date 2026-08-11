# Wald monorepo — dependency review notes

Living reference for `weekly-dependency-review`. Update when the repo layout or watchlist changes.

---

## Layout

| Path | Role |
| --- | --- |
| `package.json` | **All** direct `dependencies` / `devDependencies` / `optionalDependencies` |
| `pnpm-lock.yaml` | Single lockfile for entire workspace |
| `pnpm-workspace.yaml` | pnpm 11 config: `allowBuilds`, `minimumReleaseAgeExclude`, `overrides` — **not** a package list |
| `.npmrc` | `node-linker=hoisted`, `auto-install-peers=true`, `strict-peer-dependencies=false` |
| `libs/*/package.json` | Nx lib metadata only; `dependencies: {}` |
| `apps/oncall-agent/package.json` | Name/version only; deps hoisted to root |

Package manager is pinned via the root `packageManager` field — read it rather than assuming a version.

**`auto-install-peers=true` matters for this review:** peers resolve silently, so a package can be load-bearing without appearing in any import. Never infer "unused" from grep alone.

### Source roots to grep (all of them)

```
apps/next-js-app  apps/oncall-agent  apps/bluegpt-subscription-server
apps/bluehost-dummy  apps/chrome-plugin
libs/shared  libs/shared-server  libs/utils  libs/prisma
one-off-scripts  scripts
```

`libs/docs` and `libs/public` hold docs/assets — no dependency usage.

---

## Unusual / watchlist (check every cycle)

Read current versions from `package.json` each cycle — the *reason* each package is on this list is what persists.

| Package | Why it is on the list |
| --- | --- |
| `xlsx` | CDN tarball (`cdn.sheetjs.com`), not the npm registry. Needs a manual `sha512` integrity entry in the lockfile — procedure documented in root `package.json` `// xlsx` script comments. `npm view xlsx` reports an unrelated, older registry version; ignore it |
| `nitro` | Pre-release/beta line is the published `latest`; powers `apps/oncall-agent` via TanStack Start |
| `typescript`, `vite`, `esbuild`, `zod` | Deliberately on bleeding-edge majors — do not "fix" these by downgrading, and do not chase their next major either |
| `openai` | Dual stack alongside Vercel AI SDK (`ai`, `@ai-sdk/*`); intentional during migration. Flag drift, do not propose a rushed consolidation |
| `recharts` | Pinned to a branch npm marks deprecated; upgrade blocked on a chart migration |
| `libsodium-wrappers` + `libsodium-wrappers-sumo` | Both installed at the same version; app code uses `-sumo`, plain wrapper survives in one script. Encryption-critical — consolidation needs sign-off |
| Exact-pinned (no `^`) | Intentional drift guards. Bump deliberately, never in a bulk `pnpm update` |
| `@rspack/binding-*`, `@nx/nx-*`, `@rollup/rollup-*` | Platform-specific `optionalDependencies` pinned to the toolchain; bump only with their parent |

---

## Critical-area dependencies

Extra caution on **any major** bump; call out in report every cycle:

- **Auth / tenancy:** `@workos-inc/node`, `jose`, `firebase-admin`
- **Billing:** `stripe`, `@stripe/*`
- **LLM routing:** `ai`, `@ai-sdk/*`, `openai`
- **App shell:** `next`, `@sentry/nextjs`
- **Data:** `prisma`, `@prisma/client`

---

## Likely-unused candidates (grep before recommending removal)

Re-verify each cycle — peers and config wiring change:

| Package | Grep note |
| --- | --- |
| `tsx` | Often only transitive via Vite |
| `@swc/cli` | May only appear in `package.json` |
| `ts-node` | Nx jest pulls transitively |
| `dotenv` | If only `tests/integration/setup.ts`, move to devDeps |
| `libsodium-wrappers` (non-sumo) | One-off script only; consolidate to `-sumo` |
| `@parcel/watcher` | Nx file-watching accelerant |

---

## Keep despite zero TS imports

| Package | Reason |
| --- | --- |
| `@emotion/cache`, `@emotion/react`, `@emotion/styled`, `@emotion/server` | MUI / `@mui/material-nextjs` peer deps |
| `intl-messageformat` | Peer of `i18next-icu` |
| `sass` | Next + `.scss` in `apps/next-js-app/components/markdown/` |
| `@next/mdx`, `@mdx-js/loader` | `apps/next-js-app/next.config.js` |
| `sharp` | Next image optimization + `pages/api/gcs-file-to-base64.ts` |

---

## `pnpm-workspace.yaml` — do not simplify blindly

- **`allowBuilds`:** every entry gates a native/postinstall build (`prisma`, `sharp`, `nx`, `@sentry/cli`, `esbuild`, …). Removing one silently skips its build step; installs still "succeed" and the failure surfaces later at runtime or build time
- **`minimumReleaseAgeExclude: ["@sentry/*"]`:** intentional — Sentry ships patches as a scoped set
- **No `packages:` key:** correct for this single-root Nx monorepo; do not add one

---

## Apps and their distinct runtime deps

| App / area | Notable deps |
| --- | --- |
| `apps/next-js-app` | MUI, AI SDK, Stripe client, WorkOS, Firebase, Dexie, Prisma |
| `apps/oncall-agent` | TanStack Start/Router, Nitro, Vite, recharts, `firebase-admin` |
| `apps/bluegpt-subscription-server` | `express`, `cors`, BigQuery, `jsonwebtoken` |
| `apps/bluehost-dummy` | WorkOS auth, Google Cloud Storage |
| `apps/chrome-plugin` | Check separately — may not consume root deps |
| `one-off-scripts` | Brevo, Stripe, Google Cloud clients, `libsodium-wrappers` |
| `scripts/` | Plain `.mjs` spec/i18n checkers — include in greps |

A dep used **only** by `one-off-scripts` or `scripts/` has a small blast radius. Say so in the report; it changes the risk calculus for its upgrade.
