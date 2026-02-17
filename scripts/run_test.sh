#!/bin/bash
# V-Face Integration Test Runner
#
# Cleans volumes, generates a shared key, rebuilds, and runs tests.
# Usage: ./scripts/run_test.sh

set -e
cd "$(dirname "$0")/.."

echo "🧹 Cleaning previous data..."
docker compose down -v 2>/dev/null || true

# Generate encryption key if not in .env
if ! grep -q "VFACE_ENCRYPTION_KEY=" .env 2>/dev/null; then
    KEY=$(openssl rand -hex 32)
    echo "VFACE_ENCRYPTION_KEY=$KEY" > .env
    echo "MATCHING_SECRET=dev-secret-change-me" >> .env
    echo "🔑 Generated new .env with encryption key"
fi

echo "🔨 Building and starting stack..."
docker compose build
docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 5

echo "🧪 Running integration test..."
node scripts/integration_test.js
