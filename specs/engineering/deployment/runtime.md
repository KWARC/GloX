# Deployment: GloX runtime

**Kind:** Deployment fact — environment and release process.

## Runtime

| Component | Detail |
| --- | --- |
| App server | TanStack Start + Nitro; dev port 3000, production preview port 3100 (`deploy.sh`) |
| Database | PostgreSQL 14+ via `DATABASE_URL` |
| File storage | `uploads/` for PDFs and page images (local filesystem) |
| Modules catalog | `MODULES_DIR` (default `./modules`); production update via `prisma/modules-tar-update.md` |

## Required secrets

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `JWT_SECRET` | Yes | Auth — server refuses requests if missing |
| `NODEMAILER_EMAIL_ID` / `NODEMAILER_EMAIL_PASSWORD` | Yes (for email flows) | Gmail app password |
| `APP_ORIGIN` | Yes | Email link base URL |
| `OPENAI_API_KEY` | For LLM features | Optional if LLM disabled |
| `VITE_FTML_SERVER_URL` | No | Defaults to `https://mathhub.info` |

## CI

`.github/workflows/build.yml` runs `prisma validate`, `prisma generate`, and `pnpm build` — no test
job yet.

## Related docs

- [`../../../README.md`](../../../README.md)
- [`../../../prisma/modules-tar-update.md`](../../../prisma/modules-tar-update.md)
