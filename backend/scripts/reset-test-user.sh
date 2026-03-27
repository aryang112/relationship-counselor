#!/bin/bash
# Wipes ALL user data from the dev database so onboarding can be
# re-tested from scratch.  Called automatically by `npm run start:dev`.
#
# Pass --email <addr> to delete a single user instead of all.

CONTAINER="relationship-app-postgres"
DB="relationship_app"
USER="postgres"

SINGLE_EMAIL=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email) SINGLE_EMAIL="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -n "$SINGLE_EMAIL" ]; then
  echo "Resetting test user: $SINGLE_EMAIL"
  WHERE_USERS="WHERE email='$SINGLE_EMAIL'"
else
  echo "Resetting ALL dev users"
  WHERE_USERS=""
fi

docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "
DELETE FROM interviews;
DELETE FROM unpackings;
DELETE FROM sessions;
DELETE FROM couples;
DELETE FROM consent_log;
DELETE FROM users $WHERE_USERS;
" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "  Dev DB reset complete"
else
  echo "  DB not reachable (container may not be running yet) - skipping reset"
fi
