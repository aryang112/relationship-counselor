# Implementation Notes - Draft Interviews & Agreement Enforcement

**Date**: November 25, 2025
**Status**: ✅ Complete - All Tests Passing

---

## Summary

This document details the implementation of two critical features and subsequent regression fixes:

1. **Draft Interview System** - Auto-save/resume for interview sessions
2. **Agreement Enforcement** - Both partners must sign before creating sessions
3. **Regression Fixes** - Three issues identified and resolved post-implementation

---

## Feature #1: Draft Interview System

### Product Benefit (Per Design Spec)

From **Edge Case 4** in `relationship-app-detailed-design-spec.md`:

- **Respects autonomy**: Users can exit anytime (Core Principle #4)
- **Reduces drop-off**: Users won't lose progress if interrupted
- **Lower pressure**: Knowing they can exit makes starting less intimidating
- **Real-world friendly**: 15-20 minute interviews can be completed over multiple sessions

### Technical Implementation

#### Database Changes

**Schema Update** (`backend/prisma/schema.prisma:80`):
```prisma
model Interview {
  // ... existing fields
  @@unique([sessionId, userId])  // ← NEW: One interview per user per session
}
```

- `completedAt DateTime?` field already existed (nullable - perfect for drafts)
- Added unique constraint to prevent duplicate interviews

**Migration**: `20251125192321_add_individual_agreement_signatures_and_interview_constraint/migration.sql`

#### API Endpoints

**New Endpoints** (`backend/src/modules/sessions/sessions.controller.ts:53-68`):

1. **`PATCH /sessions/:id/interview/draft`** - Save draft
   - Saves partial interview responses
   - Sets `completedAt: null` (marks as draft)
   - Idempotent (can call multiple times)

2. **`GET /sessions/:id/interview`** - Retrieve interview
   - Returns current interview (draft or complete)
   - Allows resuming where user left off

3. **`POST /sessions/:id/interview`** - Submit final (modified)
   - Converts draft to completed interview
   - Sets `completedAt: Date`
   - Triggers session status update if both complete

#### DTOs

**New DTO** (`backend/src/modules/sessions/dto/save-draft-interview.dto.ts`):
```typescript
export class SaveDraftInterviewDto {
  @IsNotEmpty()
  responses: any; // Partial or complete conversation history (JSON)

  @IsOptional()
  @IsString()
  notes?: string;
}
```

#### Service Methods

**Location**: `backend/src/modules/sessions/sessions.service.ts`

1. **`saveDraftInterview()`** (lines 130-162):
   - Upserts interview with `completedAt: null`
   - Rejects if interview already completed
   - Preserves draft status on updates

2. **`getInterview()`** (lines 164-176):
   - Retrieves user's interview for session
   - Returns 404 if no interview found

3. **`submitInterview()`** (lines 178-247) - Updated:
   - Now uses `upsert` instead of `create`
   - Finalizes draft by setting `completedAt`
   - Prevents re-submission of completed interviews

4. **`calculateSessionStatus()`** (lines 332-336) - Updated:
   - Filters out draft interviews (`completedAt === null`)
   - Only counts completed interviews for status transitions
   - Prevents premature `unpacking_ready` status

5. **`getSessionStatus()`** (lines 255-258) - Updated:
   - Same filtering logic as `calculateSessionStatus`

### Files Modified

- `backend/prisma/schema.prisma`
- `backend/src/modules/sessions/dto/save-draft-interview.dto.ts` (new)
- `backend/src/modules/sessions/sessions.controller.ts`
- `backend/src/modules/sessions/sessions.service.ts`
- `backend/test/edge-cases.e2e-spec.ts` (test updated)

---

## Feature #2: Agreement Enforcement

### Product Benefit (Per Design Spec)

From **Step 4: Shared Agreement** in `relationship-app-detailed-design-spec.md`:

- **Mutual consent**: Both partners must explicitly agree before mediation
- **Shared accountability**: Prevents unilateral forcing into mediation
- **Sets expectations**: 48-hour response time, honesty, not therapy
- **Legal/ethical protection**: Both parties consented to terms

### Critical Bug Fixed

**Original Issue**: Schema only had ONE `agreementSignedAt` timestamp. When EITHER partner signed, it was set, allowing sessions even though both hadn't agreed.

### Technical Implementation

#### Database Changes

**Schema Update** (`backend/prisma/schema.prisma:34-35`):
```prisma
model Couple {
  // ... existing fields
  userASignedAt DateTime? @map("user_a_signed_at")  // ← NEW
  userBSignedAt DateTime? @map("user_b_signed_at")  // ← NEW
  // REMOVED: agreementSignedAt DateTime?
}
```

**Migration** (`20251125192321_add_individual_agreement_signatures_and_interview_constraint/migration.sql`):
```sql
-- Add individual agreement signature tracking
ALTER TABLE "couples" ADD COLUMN "user_a_signed_at" TIMESTAMP(3);
ALTER TABLE "couples" ADD COLUMN "user_b_signed_at" TIMESTAMP(3);

-- Backfill existing data (NO DATA LOSS)
UPDATE "couples"
SET "user_a_signed_at" = "agreement_signed_at",
    "user_b_signed_at" = "agreement_signed_at"
WHERE "agreement_signed_at" IS NOT NULL;

-- Remove old single timestamp
ALTER TABLE "couples" DROP COLUMN IF EXISTS "agreement_signed_at";
```

#### Service Changes

**Couples Service** (`backend/src/modules/couples/couples.service.ts`):

1. **`signAgreement()`** (lines 107-136) - Updated:
   - Determines which partner is signing (userA vs userB)
   - Sets appropriate field (`userASignedAt` or `userBSignedAt`)
   - Returns immediately if user already signed
   - No longer sets a shared timestamp

2. **`bothPartnersSignedAgreement()`** (lines 138-140) - NEW:
   ```typescript
   bothPartnersSignedAgreement(couple: any): boolean {
     return !!(couple.userASignedAt && couple.userBSignedAt);
   }
   ```

**Sessions Service** (`backend/src/modules/sessions/sessions.service.ts:37-39`):

Updated session creation check:
```typescript
if (!this.couplesService.bothPartnersSignedAgreement(couple)) {
  throw new ForbiddenException(
    'Both partners must sign the shared agreement before starting a session.'
  );
}
```

### Files Modified

- `backend/prisma/schema.prisma`
- `backend/src/modules/couples/couples.service.ts`
- `backend/src/modules/sessions/sessions.service.ts`

---

## Regression Fixes

### Issue #1: DTO Type Mismatch ❌→✅

**Problem**: Service method signature used wrong DTO type

**Location**: `backend/src/modules/sessions/sessions.service.ts:133`

**Before**:
```typescript
async saveDraftInterview(
  sessionId: string,
  userId: string,
  dto: SubmitInterviewDto,  // ❌ Wrong!
)
```

**After**:
```typescript
async saveDraftInterview(
  sessionId: string,
  userId: string,
  dto: SaveDraftInterviewDto,  // ✅ Correct!
)
```

**Impact**: Type inconsistency, validation rules not properly applied

---

### Issue #2: Migration Data Loss Risk ❌→✅

**Problem**: Original migration dropped `agreementSignedAt` without preserving data

**Location**: Migration SQL file

**Before** (would cause data loss):
```sql
ALTER TABLE "couples" ADD COLUMN "user_a_signed_at" TIMESTAMP(3);
ALTER TABLE "couples" ADD COLUMN "user_b_signed_at" TIMESTAMP(3);
ALTER TABLE "couples" DROP COLUMN IF EXISTS "agreement_signed_at";  -- ❌ Data lost!
```

**After** (safe migration):
```sql
ALTER TABLE "couples" ADD COLUMN "user_a_signed_at" TIMESTAMP(3);
ALTER TABLE "couples" ADD COLUMN "user_b_signed_at" TIMESTAMP(3);

-- Backfill existing agreements to both new fields
UPDATE "couples"
SET "user_a_signed_at" = "agreement_signed_at",
    "user_b_signed_at" = "agreement_signed_at"
WHERE "agreement_signed_at" IS NOT NULL;  -- ✅ Data preserved!

ALTER TABLE "couples" DROP COLUMN IF EXISTS "agreement_signed_at";
```

**Impact**: Prevented data loss for existing couples who had signed agreements

---

### Issue #3: Unit Test Mocks Outdated ❌→✅

**Problem**: Unit tests expected old schema and didn't mock new methods

#### Couples Service Tests

**File**: `backend/src/modules/couples/couples.service.spec.ts`

**Changes**:
1. Replaced `agreementSignedAt` with `userASignedAt`/`userBSignedAt` in all mocks
2. Split test into separate cases for User A and User B signing
3. Added "already signed" test case
4. Added new test suite for `bothPartnersSignedAgreement()` method:
   - ✅ Returns true when both signed
   - ✅ Returns false when only userA signed
   - ✅ Returns false when only userB signed
   - ✅ Returns false when neither signed

**Lines Modified**: 178-296

#### Sessions Service Tests

**File**: `backend/src/modules/sessions/sessions.service.spec.ts`

**Changes**:

1. **Type Definitions** (lines 13-33):
   - Added `upsert: jest.Mock` to interview mock
   - Added `bothPartnersSignedAgreement: jest.Mock` to couplesService mock

2. **startSession Tests** (lines 65-168):
   - Updated all couple mocks to use `userASignedAt`/`userBSignedAt`
   - Added `bothPartnersSignedAgreement` mock calls
   - Split agreement test into two cases:
     - "agreement not signed by both" (one partner signed)
     - "neither partner signed agreement"

3. **submitInterview Tests** (lines 182-230):
   - Changed from `create` to `upsert` pattern
   - Added `completedAt` to all interview mocks
   - Updated test name to "throws conflict when same user resubmits completed interview"

4. **getSessionStatus Test** (line 277):
   - Added `completedAt: new Date()` to interview mock

**Total New Tests**: +15 test cases added across both files

---

## Test Results

### Unit Tests: ✅ All Passing

```
Test Suites: 4 passed, 4 total
Tests:       40 passed, 40 total
Time:        3.49s
```

**Coverage**:
- ✅ `app.controller.spec.ts`
- ✅ `auth.service.spec.ts`
- ✅ `couples.service.spec.ts` (includes 4 new `bothPartnersSignedAgreement` tests)
- ✅ `sessions.service.spec.ts` (includes updated draft + agreement tests)

### E2E Tests: ✅ All Passing

```
Test Suites: 4 passed, 4 total
Tests:       90 passed, 15 todo, 105 total
Time:        23.934s
```

**Previously Failing Tests Now Passing**:
- ✅ `edge-cases.e2e-spec.ts` - "should auto-save interview responses as drafts"
- ✅ `edge-cases.e2e-spec.ts` - "should block session creation until agreement signed by both"

**Full Coverage**:
- ✅ `edge-cases.e2e-spec.ts` - 27 passed
- ✅ `sessions.e2e-spec.ts` - 26 passed
- ✅ `authorization.e2e-spec.ts` - 20 passed
- ✅ `onboarding.e2e-spec.ts` - 17 passed

---

## API Documentation

### Draft Interview Endpoints

#### Save Draft Interview
```http
PATCH /sessions/:sessionId/interview/draft
Authorization: Bearer <token>
Content-Type: application/json

{
  "responses": {
    "questions": [
      { "q": "What happened?", "a": "She canceled our call" }
    ]
  },
  "notes": "Feeling frustrated"
}

Response: 200 OK
{
  "id": "interview-uuid",
  "sessionId": "session-uuid",
  "userId": "user-uuid",
  "responses": { ... },
  "notes": "Feeling frustrated",
  "completedAt": null,  // ← Draft status
  "createdAt": "2025-11-25T19:00:00Z",
  "updatedAt": "2025-11-25T19:05:00Z"
}
```

#### Get Current Interview
```http
GET /sessions/:sessionId/interview
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "interview-uuid",
  "sessionId": "session-uuid",
  "userId": "user-uuid",
  "responses": { ... },
  "completedAt": null,  // null = draft, Date = completed
  "createdAt": "2025-11-25T19:00:00Z",
  "updatedAt": "2025-11-25T19:05:00Z"
}
```

#### Submit Final Interview
```http
POST /sessions/:sessionId/interview
Authorization: Bearer <token>
Content-Type: application/json

{
  "responses": {
    "questions": [
      { "q": "What happened?", "a": "She canceled our call" },
      { "q": "How did that make you feel?", "a": "Really hurt" },
      { "q": "What do you need?", "a": "To feel prioritized" }
    ]
  }
}

Response: 201 Created
{
  "id": "interview-uuid",
  "completedAt": "2025-11-25T19:10:00Z",  // ← Now complete!
  // ... other fields
}
```

### Agreement Endpoints

#### Sign Agreement (Both Partners Must Call)
```http
POST /couples/agreement
Authorization: Bearer <token>
Content-Type: application/json

{ "confirm": true }

Response: 200 OK
{
  "id": "couple-uuid",
  "userAId": "user-a-uuid",
  "userBId": "user-b-uuid",
  "userASignedAt": "2025-11-25T18:00:00Z",  // Partner A signed
  "userBSignedAt": null,  // Partner B hasn't signed yet
  // ... other fields
}
```

---

## Breaking Changes

### Migration Required

**Database**: Migration `20251125192321_add_individual_agreement_signatures_and_interview_constraint` must be applied

**Apply Migration**:
```bash
# Development database
cd backend
npx prisma migrate deploy

# Test database
DATABASE_URL="postgresql://postgres:postgres@localhost:54320/relationship_app_test" \
  npx prisma migrate deploy
```

### API Changes

1. **Interview Submission Flow Changed**:
   - **Before**: POST `/sessions/:id/interview` (one-shot submission)
   - **After**:
     - PATCH `/sessions/:id/interview/draft` (save as you go)
     - GET `/sessions/:id/interview` (retrieve draft)
     - POST `/sessions/:id/interview` (finalize)

2. **Agreement Field Removed from API Responses**:
   - **Before**: Couple objects returned `agreementSignedAt: Date | null`
   - **After**: Couple objects return:
     - `userASignedAt: Date | null`
     - `userBSignedAt: Date | null`

---

## Future Considerations

### Voice-to-Text Endpoint (Not Yet Implemented)

From design spec (lines 1283-1295), need to add:

```http
POST /api/transcribe
Content-Type: multipart/form-data

audio: <audio-file>

Response: 200 OK
{
  "transcription": "She canceled our video call again..."
}
```

Implementation would use OpenAI Whisper API.

### Notifications (Not Yet Implemented)

From HANDOFF_NOTES.md, still needed:
- Session initiation notifications
- 24h/48h reminders for non-responsive partner
- Unpacking ready notifications
- Partner-waiting unlock notifications
- 3-day post-resolution check-ins

---

## Files Changed Summary

### New Files (2)
- `backend/src/modules/sessions/dto/save-draft-interview.dto.ts`
- `IMPLEMENTATION_NOTES.md` (this file)

### Modified Files (7)
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20251125192321_.../migration.sql`
- `backend/src/modules/couples/couples.service.ts`
- `backend/src/modules/sessions/sessions.service.ts`
- `backend/src/modules/sessions/sessions.controller.ts`
- `backend/src/modules/couples/couples.service.spec.ts`
- `backend/src/modules/sessions/sessions.service.spec.ts`
- `backend/test/edge-cases.e2e-spec.ts`

### Total Lines Changed
- **Added**: ~450 lines (code + tests)
- **Modified**: ~200 lines
- **Deleted**: ~100 lines (old test code)

---

## Verification Checklist

- [x] Unit tests pass (40/40)
- [x] E2E tests pass (90/90 passing, 15 todo for future features)
- [x] Migration tested on dev database
- [x] Migration tested on test database
- [x] No data loss in migration
- [x] TypeScript compilation succeeds
- [x] API endpoints documented
- [x] Breaking changes documented
- [x] Product benefits align with spec
- [x] All regressions fixed

---

**Implementation Complete**: November 25, 2025
**Next Steps**: See HANDOFF_NOTES.md for remaining features (unpacking pipeline, notifications, guided reconnection)
