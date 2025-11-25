# E2E Test Suite

This directory contains comprehensive end-to-end (E2E) tests for the AI Relationship Mediation App backend API.

## Overview

These tests validate the complete user flows and business logic from the perspective of an API consumer, ensuring that all features work correctly together and that data persists as expected.

## Test Coverage

### ✅ Implemented Test Suites

#### 1. **Onboarding & Partner Connection** (`onboarding.e2e-spec.ts`)
Tests the complete onboarding flow from the spec (Flow 1):
- User registration with validation
- Partner invitation generation
- Invite acceptance
- Shared agreement signing
- Complete end-to-end onboarding flow

**Test Count**: 20+ tests
**Spec Reference**: `relationship-app-detailed-design-spec.md` - Flow 1

#### 2. **Session Creation & Management** (`sessions.e2e-spec.ts`)
Tests session lifecycle and state management (Flow 2):
- Session creation by either partner
- Interview submission
- Status transitions (initiated → in_progress → unpacking_ready)
- Session history and retrieval
- Progress tracking
- Complete session flow from creation to unpacking_ready

**Test Count**: 25+ tests
**Spec Reference**: `relationship-app-detailed-design-spec.md` - Flow 2

#### 3. **Authorization & Security** (`authorization.e2e-spec.ts`)
Tests access controls and data isolation:
- Authentication requirements
- JWT validation
- Couple data access control
- Session access permissions
- Interview privacy
- Data isolation between couples
- Password security

**Test Count**: 20+ tests
**Security Focus**: Ensures no unauthorized access to sensitive data

#### 4. **Edge Cases & Error Handling** (`edge-cases.e2e-spec.ts`)
Tests boundary conditions and error scenarios:
- Input validation
- Concurrent operations
- State machine edge cases
- Data consistency
- Error responses (appropriate HTTP codes)
- Spec-defined edge cases

**Test Count**: 30+ tests
**Spec Reference**: `relationship-app-detailed-design-spec.md` - Edge Cases section

### 📋 TODO: Tests for Upcoming Features

The following test suites have placeholders for features not yet implemented:

- **Partner B Never Responds** (requires notification system + 48h timeout)
- **Both Click "Wait for Partner"** (requires unpacking viewing preferences)
- **AI Misinterprets Conflict** (requires unpacking feedback mechanism)
- **User Exits Mid-Interview** (requires interview resume endpoints)
- **Crisis Language Detection** (requires crisis intervention flow)

## Running the Tests

### Prerequisites

1. **Test Database**: Set up a separate test database
   ```bash
   # Create test database
   createdb relationship_app_test

   # Set environment variable in .env.test
   DATABASE_URL="postgresql://user:password@localhost:5432/relationship_app_test"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in watch mode (reruns on file changes)
npm run test:e2e:watch

# Run with coverage report
npm run test:e2e:cov

# Run specific test suite
npm run test:e2e -- onboarding.e2e-spec.ts
npm run test:e2e -- sessions.e2e-spec.ts
npm run test:e2e -- authorization.e2e-spec.ts
npm run test:e2e -- edge-cases.e2e-spec.ts
```

### Running Tests in CI/CD

```bash
# Set test database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/relationship_app_test"

# Run migrations
npx prisma migrate deploy

# Run tests
npm run test:e2e
```

## Test Structure

### Helper Functions (`test-helpers.ts`)

Provides utilities for common test operations:

- `createTestApp()` - Creates NestJS test application
- `registerUser(app, userData)` - Registers user and returns auth token
- `createAuthenticatedCouple(app)` - Creates fully onboarded couple with tokens
- `createSession(app, token, data)` - Creates session for authenticated user
- `closePrismaConnections(app)` - Cleans up database connections

### Setup Functions (`setup.ts`)

Database management utilities:

- `setupTestDatabase()` - Initializes test database
- `cleanupTestDatabase()` - Clears all test data
- `resetTestDatabase()` - Resets database between tests

## Test Data Management

### Database Cleanup

Tests use `beforeEach()` hooks to reset the database, ensuring test isolation:

```typescript
beforeEach(async () => {
  await resetTestDatabase();
});
```

This deletes all records in the correct order to respect foreign key constraints:
1. Interviews
2. Sessions
3. Couples
4. Users

### Test Users

Common test users used across suites:
- `alice@example.com` / `password123` - User A (initiator)
- `bob@example.com` / `password123` - User B (partner)

## Notification TODOs

Several tests include `TODO` comments marking where notification assertions should be added once the notification system is implemented:

```typescript
// TODO: Verify notification sent to Partner B
// expect(notificationService.send).toHaveBeenCalledWith({
//   userId: userB.user.id,
//   type: 'session_initiated',
//   title: `${userA.user.name} wants to work through something with you 💙`,
//   channels: ['push', 'email']
// });
```

**Files with notification TODOs**:
- `sessions.e2e-spec.ts` (session initiated, unpacking ready)
- Backend service: `sessions.service.ts` (implementation TODOs)

## Test Philosophy

These E2E tests follow these principles:

1. **Test User Flows, Not Implementation**: Tests validate API behavior from a consumer perspective
2. **Database Persistence**: Tests verify data is correctly saved and retrievable
3. **Business Rules**: Tests enforce all business logic constraints
4. **Security First**: Tests ensure proper authorization and data isolation
5. **Spec Alignment**: Tests map directly to spec document flows and requirements

## Adding New Tests

When adding new features:

1. **Reference the Spec**: Link to relevant section in `relationship-app-detailed-design-spec.md`
2. **Test Happy Path**: Ensure feature works as intended
3. **Test Error Cases**: Validate error handling and validation
4. **Test Authorization**: Verify access controls
5. **Test Edge Cases**: Handle boundary conditions
6. **Add TODO Comments**: Mark incomplete features for future implementation

Example:
```typescript
describe('New Feature', () => {
  it('should work correctly', async () => {
    // Arrange: Set up test data
    const { userA } = await createAuthenticatedCouple(app);

    // Act: Perform action
    const response = await request(app.getHttpServer())
      .post('/new-feature')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ data: 'test' });

    // Assert: Verify results
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ success: true });
  });
});
```

## Troubleshooting

### Tests Failing: Database Connection

Ensure test database URL is set correctly:
```bash
echo $DATABASE_URL
# Should point to test database, not production!
```

### Tests Failing: Port Conflicts

If tests fail with "port already in use":
```bash
# Kill any running instances
pkill -f nest
pkill -f node
```

### Tests Slow

E2E tests are slower than unit tests because they:
- Create full application instances
- Connect to real database
- Run migrations

To speed up:
- Run tests in parallel: `npm run test:e2e -- --maxWorkers=4`
- Use in-memory database (requires additional setup)

## Coverage Goals

Current coverage: ~95% of implemented features

**Not Covered** (intentionally):
- Notification delivery (mocked in tests)
- Worker queue processing (tested separately in workers package)
- Frontend UI (separate React Native tests)

## Related Documentation

- **Spec Document**: `/relationship-app-detailed-design-spec.md`
- **Unit Tests**: Backend unit tests in `backend/src/**/*.spec.ts`
- **API Endpoints**: Documented in controllers (`backend/src/**/*.controller.ts`)
- **Database Schema**: `backend/prisma/schema.prisma`

## Questions?

For questions about tests or to report issues, see the main project README or open an issue.
