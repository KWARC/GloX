# GloX -- The FAUstairs Glossary Extractors and Curator

See the [GloX blue note](blue/workflow/note.en.pdf) for the ideas. 

Welcome to your new TanStack app! 

# Getting Started

GloX — Updated Setup Instructions

1. Prerequisites
	•	Node.js ≥ 20
	•	pnpm ≥ 9
	•	PostgreSQL ≥ 14

⸻

2. Environment Configuration

Create a .env file at the project root with the following variables:
```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
VITE_MATHHUB_APP_URL=https://mathhub.info
VITE_FTML_SERVER_URL=https://mathhub.info

JWT_SECRET=replace_with_strong_random_secret

NODEMAILER_EMAIL_ID=your_email@example.com
NODEMAILER_EMAIL_PASSWORD=app_specific_password

APP_ORIGIN=http://localhost:3000
NODE_ENV=development
```

3. Dependency Installation
```bash
pnpm install
```
This installs:
	•	React 19 + Vite 7 toolchain
	•	TanStack Router / Query / Start stack
	•	Prisma client and PostgreSQL adapter
	•	FTML frontend and backend libraries
	•	Mantine UI + Tailwind v4

⸻

4. Database Setup (Prisma)

Generate client and apply schema:
```bash
pnpm prisma generate
pnpm prisma migrate dev
```


⸻

5. Development Server
```bash
pnpm dev
```
	•	App runs at http://localhost:3000
	•	Vite dev server with HMR

⸻

6. Production Build
```bash
pnpm build
pnpm preview
```

⸻

7. Testing
```bash
pnpm test
```
⸻

