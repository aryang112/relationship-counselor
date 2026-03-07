# Database Management Guide

Complete guide for managing PostgreSQL databases using Docker for the Relationship App.

## Quick Start

### 1. Start PostgreSQL (First Time)
```bash
# From project root
docker compose -f docker-compose.db.yml up -d

# Wait for it to be ready (check logs)
docker compose -f docker-compose.db.yml logs -f postgres
# Press Ctrl+C when you see "database system is ready to accept connections"
```

This automatically creates:
- ✅ `relationship_app` (development database)
- ✅ `relationship_app_test` (test database)

### 2. Configure Environment Variables
```bash
# Update backend/.env
cd backend
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app"' > .env

# Create test environment file
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app_test"' > test/.env.test
```

### 3. Run Migrations
```bash
# On development database
cd backend
npm run prisma:migrate

# On test database
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app_test"
npx prisma migrate deploy
```

### 4. Verify Setup
```bash
# List databases
docker exec -it relationship-app-postgres psql -U postgres -c "\l"

# List tables in dev database
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app -c "\dt"
```

## Daily Commands

### Start/Stop Database
```bash
# Start
docker compose -f docker-compose.db.yml up -d

# Stop (keeps data)
docker compose -f docker-compose.db.yml down

# Stop and remove data (fresh start)
docker compose -f docker-compose.db.yml down -v
```

### Check Status
```bash
# Is it running?
docker ps | grep postgres

# View logs
docker compose -f docker-compose.db.yml logs postgres

# Health check
docker exec relationship-app-postgres pg_isready -U postgres
```

## Database Access

### PostgreSQL CLI (psql)
```bash
# Connect to postgres (default database)
docker exec -it relationship-app-postgres psql -U postgres

# Connect to dev database
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app

# Connect to test database
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app_test
```

### Common psql Commands (once connected)
```sql
\l              -- List all databases
\c database_name -- Connect to database
\dt             -- List all tables
\d table_name   -- Describe table schema
\du             -- List users
\q              -- Quit
```

### Run SQL Query from CLI
```bash
# Single query
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app \
  -c "SELECT * FROM users;"

# From SQL file
docker exec -i relationship-app-postgres psql -U postgres -d relationship_app < query.sql
```

## Migration Management

### Create Migration
```bash
cd backend

# Make changes to prisma/schema.prisma
# Then create migration:
npm run prisma:migrate
# Enter migration name when prompted (e.g., "add_user_timezone")
```

### Apply Migrations
```bash
# Development
cd backend
npm run prisma:migrate

# Test database
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app_test" \
  npx prisma migrate deploy

# Production (when ready)
DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate deploy
```

### Check Migration Status
```bash
cd backend
npx prisma migrate status
```

### Reset Database (Development Only!)
```bash
cd backend
npx prisma migrate reset
# WARNING: Deletes all data and re-runs migrations
```

## Prisma Studio (Visual Database Browser)

```bash
cd backend
npm run prisma:studio
# Opens at http://localhost:5555
```

You can:
- View all data in tables
- Add/edit/delete records
- Test queries visually

## Data Management

### Clear All Data (Keep Tables)
```bash
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app << 'EOF'
TRUNCATE TABLE interviews CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE couples CASCADE;
TRUNCATE TABLE users CASCADE;
EOF
```

### Backup Database
```bash
# Backup dev database
docker exec relationship-app-postgres pg_dump -U postgres relationship_app \
  > backup_dev_$(date +%Y%m%d_%H%M%S).sql

# Backup test database
docker exec relationship-app-postgres pg_dump -U postgres relationship_app_test \
  > backup_test_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup
```bash
# Restore dev database
docker exec -i relationship-app-postgres psql -U postgres -d relationship_app \
  < backup_dev_20241124_120000.sql
```

### Drop and Recreate Database
```bash
# Drop test database
docker exec -it relationship-app-postgres psql -U postgres \
  -c "DROP DATABASE IF EXISTS relationship_app_test;"

# Recreate
docker exec -it relationship-app-postgres psql -U postgres \
  -c "CREATE DATABASE relationship_app_test;"

# Run migrations
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app_test" \
  npx prisma migrate deploy
```

## Inspection & Debugging

### View Table Data
```bash
# View all users
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app \
  -c "SELECT id, email, name FROM users;"

# View sessions
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app \
  -c "SELECT id, status, created_at FROM sessions ORDER BY created_at DESC LIMIT 10;"
```

### Check Table Schema
```bash
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app \
  -c "\d users"
```

### Count Records
```bash
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app << 'EOF'
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'couples', COUNT(*) FROM couples
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'interviews', COUNT(*) FROM interviews;
EOF
```

### Database Size
```bash
docker exec -it relationship-app-postgres psql -U postgres \
  -c "SELECT pg_size_pretty(pg_database_size('relationship_app')) as size;"
```

## E2E Testing

### Run E2E Tests
```bash
cd backend

# Make sure test database exists and has migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app_test" \
  npx prisma migrate deploy

# Run tests
npm run test:e2e
```

### Reset Test Database Between Test Runs
```bash
# Tests auto-cleanup, but if you want manual reset:
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app_test << 'EOF'
TRUNCATE TABLE interviews CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE couples CASCADE;
TRUNCATE TABLE users CASCADE;
EOF
```

## Production Migration Strategy

### Safe Migration to Production

1. **Test Locally First**
   ```bash
   # Test on local test database
   cd backend
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app_test" \
     npx prisma migrate deploy
   ```

2. **Review Migration SQL**
   ```bash
   # Check what SQL will run
   cat backend/prisma/migrations/$(ls -t backend/prisma/migrations | head -1)/migration.sql
   ```

3. **Backup Production**
   ```bash
   # Before deploying!
   pg_dump $PRODUCTION_DATABASE_URL > prod_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

4. **Deploy to Production**
   ```bash
   DATABASE_URL="$PRODUCTION_DATABASE_URL" npx prisma migrate deploy
   ```

5. **Verify**
   ```bash
   DATABASE_URL="$PRODUCTION_DATABASE_URL" npx prisma migrate status
   ```

### Rollback Strategy

If migration fails in production:
```bash
# Restore from backup
psql $PRODUCTION_DATABASE_URL < prod_backup_20241124_120000.sql
```

## Troubleshooting

### Can't Connect to Database

**Check container is running:**
```bash
docker ps | grep postgres
```

**Check port 5432 is available:**
```bash
lsof -i :5432
```

**If port is in use, stop other PostgreSQL:**
```bash
# Find process using port
lsof -i :5432

# Or change port in docker-compose.db.yml:
# ports:
#   - "5433:5432"  # Use 5433 on host
```

### Container Won't Start

```bash
# View logs
docker compose -f docker-compose.db.yml logs

# Remove old container and volumes
docker compose -f docker-compose.db.yml down -v

# Start fresh
docker compose -f docker-compose.db.yml up -d
```

### Migrations Failing

```bash
# Check current status
cd backend
npx prisma migrate status

# If migrations are out of sync, reset (dev only!)
npx prisma migrate reset

# Or manually fix
# 1. Check database schema
docker exec -it relationship-app-postgres psql -U postgres -d relationship_app -c "\dt"

# 2. Mark migrations as applied without running them (if already applied manually)
DATABASE_URL="..." npx prisma migrate resolve --applied <migration_name>
```

### Can't Drop Database (Active Connections)

```bash
# Terminate all connections first
docker exec -it relationship-app-postgres psql -U postgres << 'EOF'
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'relationship_app_test'
  AND pid <> pg_backend_pid();
EOF

# Then drop
docker exec -it relationship-app-postgres psql -U postgres \
  -c "DROP DATABASE relationship_app_test;"
```

## Tips & Best Practices

✅ **Use Docker for Development**
- Isolated from system PostgreSQL
- Easy to reset/recreate
- Same setup for all team members

✅ **Separate Test Database**
- Never run tests on dev database
- Tests can drop/recreate data freely

✅ **Regular Backups**
- Backup before migrations
- Automate production backups

✅ **Migration Naming**
- Use descriptive names: `add_user_timezone`, not `migration1`
- Include what changed: `add_`, `update_`, `remove_`

✅ **Test Migrations**
- Always test on test database first
- Review generated SQL before production

✅ **Version Control**
- Commit migration files to git
- Never edit applied migrations
- Create new migration for changes

✅ **Connection Pooling**
- Use Prisma's built-in connection pooling
- Monitor active connections in production

## Connection Strings Reference

```bash
# Development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app"

# Test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/relationship_app_test"

# Production (example)
DATABASE_URL="postgresql://user:password@production-host:5432/relationship_app?sslmode=require"
```

## Useful Aliases (Optional)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Database shortcuts
alias db-start='docker compose -f docker-compose.db.yml up -d'
alias db-stop='docker compose -f docker-compose.db.yml down'
alias db-logs='docker compose -f docker-compose.db.yml logs -f postgres'
alias db-psql='docker exec -it relationship-app-postgres psql -U postgres -d relationship_app'
alias db-psql-test='docker exec -it relationship-app-postgres psql -U postgres -d relationship_app_test'
alias db-reset='docker compose -f docker-compose.db.yml down -v && docker compose -f docker-compose.db.yml up -d'
```

Then use:
```bash
db-start    # Start database
db-psql     # Connect to dev database
db-logs     # View logs
```

## Next Steps

1. ✅ Start database: `docker compose -f docker-compose.db.yml up -d`
2. ✅ Run migrations: `cd backend && npm run prisma:migrate`
3. ✅ Run tests: `npm run test:e2e`
4. ✅ Open Prisma Studio: `npm run prisma:studio`

Need help? Check logs with `docker compose -f docker-compose.db.yml logs postgres`
