#!/bin/sh
set -e

echo "📥 Pulling latest code..."
git pull

echo "🛑 Stopping containers..."
docker-compose down

echo "🔨 Rebuilding (no cache)..."
docker-compose build --no-cache

echo "🚀 Starting containers..."
docker-compose up -d

echo "✅ Upgrade complete. Migrations run automatically on startup."
echo "   View logs: docker-compose logs -f api"
