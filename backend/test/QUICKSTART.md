# E2E Tests - Quick Start Guide

## 1. Set Up Test Database

```bash
# Create test database (PostgreSQL)
createdb relationship_app_test

# Or using psql
psql -c "CREATE DATABASE relationship_app_test;"
```

## 2. Configure Environment

```bash
# Copy environment template
cp test/.env.test.example test/.env.test

# Edit test/.env.test and update DATABASE_URL
# Make sure it points to relationship_app_test database!
```

## 3. Run Migrations

```bash
# From backend directory
cd /Users/aryangupta/relation-counselor/backend

# Run migrations on test database
DATABASE_URL="postgresql://user:password@localhost:5432/relationship_app_test" npx prisma migrate deploy

# Or set in your environment and run
export DATABASE_URL="postgresql://user:password@localhost:5432/relationship_app_test"
npx prisma migrate deploy
```

## 4. Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific suite
npm run test:e2e -- onboarding.e2e-spec.ts

# Watch mode (for development)
npm run test:e2e:watch
```

## Expected Output

```
PASS test/onboarding.e2e-spec.ts
PASS test/sessions.e2e-spec.ts
PASS test/authorization.e2e-spec.ts
PASS test/edge-cases.e2e-spec.ts

Test Suites: 4 passed, 4 total
Tests:       95+ passed, 95+ total
```

## Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL points to test database
- Ensure PostgreSQL is running: `brew services start postgresql`

### "Relation 'users' does not exist"
- Run migrations: `npx prisma migrate deploy`

### "Port 3000 already in use"
- Kill existing processes: `pkill -f nest`

### Tests are very slow
- Normal for E2E tests (real database operations)
- Run in parallel: `npm run test:e2e -- --maxWorkers=4`

## What's Being Tested?

✅ **Onboarding Flow**: User registration → Partner invite → Accept → Agreement
✅ **Session Management**: Session creation → Interviews → Status transitions
✅ **Authorization**: JWT auth, access controls, data isolation
✅ **Edge Cases**: Validation, concurrent ops, error handling

📋 **TODO (Future)**: Notifications, interview resume, crisis detection

## Next Steps

After tests pass:
1. Build interview API endpoints
2. Build unpacking database table + endpoints
3. Add more tests as you build new features
4. Keep tests passing as you develop!
