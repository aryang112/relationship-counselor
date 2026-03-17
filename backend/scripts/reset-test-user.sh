#!/bin/bash
# Deletes the test user (aryangupta074@gmail.com) from the database
# so the onboarding flow can be re-tested from scratch.
# Called automatically by `npm run start:dev:fresh`.

EMAIL="aryangupta074@gmail.com"
CONTAINER="relation_counselor_db"
DB="relationship_app"
USER="postgres"

echo "🔄 Resetting test user: $EMAIL"

docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
DELETE FROM interviews WHERE session_id IN (
  SELECT id FROM sessions WHERE couple_id IN (
    SELECT id FROM couples WHERE user_a_id IN (SELECT id FROM users WHERE email='$EMAIL')
       OR user_b_id IN (SELECT id FROM users WHERE email='$EMAIL')
  )
);
DELETE FROM unpackings WHERE session_id IN (
  SELECT id FROM sessions WHERE couple_id IN (
    SELECT id FROM couples WHERE user_a_id IN (SELECT id FROM users WHERE email='$EMAIL')
       OR user_b_id IN (SELECT id FROM users WHERE email='$EMAIL')
  )
);
DELETE FROM sessions WHERE couple_id IN (
  SELECT id FROM couples WHERE user_a_id IN (SELECT id FROM users WHERE email='$EMAIL')
     OR user_b_id IN (SELECT id FROM users WHERE email='$EMAIL')
);
DELETE FROM couples WHERE user_a_id IN (SELECT id FROM users WHERE email='$EMAIL')
   OR user_b_id IN (SELECT id FROM users WHERE email='$EMAIL');
DELETE FROM users WHERE email='$EMAIL';
" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Test user reset complete"
else
  echo "⚠️  DB not reachable (container may not be running yet) — skipping reset"
fi
