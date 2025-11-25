# Database Setup for E2E Tests

## Quick Fix: Clean Test Database

The E2E tests are failing because data isn't being cleaned between tests. Here's how to fix it:

### Option 1: Manual Cleanup Before Running Tests
```bash
# Clean test database
DATABASE_URL="postgresql://postgres:postgres@localhost:54320/relationship_app_test" \
  npx prisma migrate reset --force --skip-seed

# Then run tests
npm run test:e2e
```

### Option 2: Use Clean Script (Recommended)
```bash
# Add to package.json scripts:
"test:e2e:clean": "DATABASE_URL=\"postgresql://postgres:postgres@localhost:54320/relationship_app_test\" npx prisma migrate reset --force --skip-seed && npm run test:e2e"

# Then run:
npm run test:e2e:clean
```

## Why This Happens

The `resetTestDatabase()` function in `setup.ts` tries to delete records, but it's using the Prisma client which is configured for the dev database from `.env`. The test environment variable isn't being loaded.

## Proper Solution

Update jest-e2e.json to load test environment:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  },
  "setupFiles": ["<rootDir>/jest.env.ts"]
}
```

Create `backend/test/jest.env.ts`:
```typescript
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:54320/relationship_app_test";
process.env.JWT_SECRET = "test-secret";
process.env.NODE_ENV = "test";
```

## For Now: Run Tests With Clean Database

```bash
# Clean and run
DATABASE_URL="postgresql://postgres:postgres@localhost:54320/relationship_app_test" \
  npx prisma migrate reset --force --skip-seed && \
  DATABASE_URL="postgresql://postgres:postgres@localhost:54320/relationship_app_test" \
  npm run test:e2e
```
