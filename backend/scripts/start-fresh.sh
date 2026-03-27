#!/bin/bash
# One-command dev startup: DB up → wait for healthy → wipe users → start backend.
# Usage: npm run start:dev:fresh   (from backend/)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.db.yml"
CONTAINER="relationship-app-postgres"

# ── 1. Start Postgres if not already running ──
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Starting Postgres container..."
  docker compose -f "$COMPOSE_FILE" up -d
else
  echo "Postgres already running"
fi

# ── 2. Wait for Postgres to be ready ──
echo "Waiting for Postgres to accept connections..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    echo "Postgres is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Postgres did not become ready in 30s"
    exit 1
  fi
  sleep 1
done

# ── 3. Run migrations (idempotent) ──
echo "Running Prisma migrations..."
cd "$SCRIPT_DIR/.." && npx prisma migrate deploy 2>&1 | tail -1

# ── 4. Wipe all dev users ──
bash "$SCRIPT_DIR/reset-test-user.sh"

# ── 5. Start the backend in watch mode ──
echo "Starting NestJS dev server..."
exec nest start --watch
