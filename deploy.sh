#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Pulling latest changes..."
git pull

echo "==> Installing dependencies..."
pnpm install

echo "==> Generating Prisma client..."
pnpm prisma generate

echo "==> Running database migrations..."
pnpm prisma migrate deploy

echo "==> Building app..."
pnpm run build

echo "==> Stopping existing process on port 3100 (if any)..."
lsof -ti:3100 | xargs kill -9 2>/dev/null || true

echo "==> Starting app on port 3100..."
PORT=3100 node -r dotenv/config .output/server/index.mjs
