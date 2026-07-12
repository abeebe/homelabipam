#!/bin/sh
# docker-entrypoint.sh: container ENTRYPOINT, runs pending Prisma migrations then execs the Node server (dist/server/index.js).
set -e

echo "🗄  Running database migrations..."
npx prisma migrate deploy

echo "🚀 Starting server..."
exec node dist/server/index.js
