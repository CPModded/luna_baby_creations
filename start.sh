#!/bin/sh
set -eu
cd /home/container
export PORT="${SERVER_PORT:-${PORT:-3000}}"
export NEXT_TELEMETRY_DISABLED=1

if [ ! -x ./node_modules/.bin/next ] || ! node -e "require.resolve('pg')" >/dev/null 2>&1; then
  echo ">>> Installing runtime dependencies"
  npm install --omit=dev --no-audit --no-fund --ignore-scripts --prefer-offline --cache /tmp/luna-npm-cache
  rm -rf /tmp/luna-npm-cache
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is missing. Configure the PostgreSQL connection string in Eternodes environment variables."
  exit 1
fi

if [ "${AUTH_SECRET:-}" = "" ] || [ "${AUTH_SECRET:-}" = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET" ]; then
  echo "ERROR: AUTH_SECRET must be changed before production."
  exit 1
fi

if [ "${ADMIN_PASSWORD:-}" = "" ] || [ "${ADMIN_PASSWORD:-}" = "CHANGE_ME_TO_A_STRONG_ADMIN_PASSWORD" ]; then
  echo "ERROR: ADMIN_PASSWORD must be changed before production."
  exit 1
fi

# Vérifie que le build existe avant de lancer `next start` ; sinon, lance un build.
if [ ! -d .next ]; then
  echo ">>> Building Next.js application"
  ./node_modules/.bin/next build
fi

echo ">>> Starting Luna Baby on 0.0.0.0:${PORT}"
exec ./node_modules/.bin/next start -H 0.0.0.0 -p "$PORT"
