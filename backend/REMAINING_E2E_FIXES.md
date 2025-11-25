# Remaining E2E Test Fixes

**Status**: 16 passing, 73 failing, 15 todo (Total: 104 tests)
**Pass Rate**: 15.4%
**Generated**: 2025-11-24

## Overview

After fixing critical spec-alignment issues (privacy leaks, HTTP semantics, invite stability, UUID validation), the following test failures remain. These are categorized by root cause to guide systematic fixes.

---

## Category 1: HTTP Status Code Mismatches (26 failures)

### Issue 1.1: POST /couples/accept returns inconsistent status codes
**Root Cause**: Controller returns 201 when it should return 200 for idempotent acceptance
**Failed Tests**:
- `onboarding.e2e-spec.ts` - "should allow Partner B to accept valid invitation"
- `onboarding.e2e-spec.ts` - "should prevent accepting already-used invitation token"
- `authorization.e2e-spec.ts` - "should prevent user from accessing another couples data"
- `authorization.e2e-spec.ts` - "should prevent third party from accessing couples session"
- `authorization.e2e-spec.ts` - "should list only sessions for requesting users couple"
- `authorization.e2e-spec.ts` - "should ensure complete data isolation between couples"
- `edge-cases.e2e-spec.ts` - "should block session creation until agreement signed by both"

**Expected**: 200 OK (resource already exists, idempotent operation)
**Actual**: 201 Created
**Fix Location**: `src/modules/couples/couples.controller.ts:44-54`

```typescript
// Current:
@Post('accept')
async acceptInvite(@Request() req, @Body() dto: AcceptInviteDto) {
  const couple = await this.couplesService.acceptInvite(
    req.user.id,
    dto.inviteToken,
  );
  return {
    message: 'Invite accepted',
    couple,
  };
}

// Should return 200 OK since accepting an invite modifies existing couple resource
```

### Issue 1.2: POST /auth/login returns 201 instead of 200
**Root Cause**: Auth controller returns 201 Created for login, but login doesn't create resources
**Failed Tests**:
- Multiple tests in `sessions.e2e-spec.ts` (via test-helpers.ts)
- Multiple tests in `authorization.e2e-spec.ts`

**Expected**: 200 OK (authentication doesn't create resources)
**Actual**: 201 Created
**Fix Location**: `src/auth/auth.controller.ts` (need to verify actual file)

**Note**: Many cascading failures in test-helpers.ts at lines 44, 94 expecting 200 for login

---

## Category 2: Response Structure Mismatches (8 failures)

### Issue 2.1: Session endpoints return nested response instead of flat resource
**Root Cause**: Controller wraps response in extra object layer
**Failed Tests**:
- `sessions.e2e-spec.ts` - "should allow Partner A to initiate a mediation session"
- `sessions.e2e-spec.ts` - "should allow Partner B to initiate a mediation session"

**Expected Response**:
```json
{
  "id": "uuid",
  "coupleId": "uuid",
  "status": "initiated",
  "topic": "string",
  // ... other session fields
}
```

**Actual Response**:
```json
{
  "message": "Session created",
  "session": {
    "id": "uuid",
    // ... session fields nested here
  }
}
```

**Fix Location**: `src/modules/sessions/sessions.controller.ts:23-26`

```typescript
// Current:
@Post()
startSession(@Request() req, @Body() dto: StartSessionDto) {
  return this.sessionsService.startSession(req.user.id, dto);
}

// Service returns session directly, controller shouldn't wrap it
```

### Issue 2.2: POST /couples/accept wraps couple in response object
**Root Cause**: Similar to 2.1, extra wrapping layer
**Failed Tests**:
- `onboarding.e2e-spec.ts` - "should complete entire onboarding flow from registration to signed agreement"

**Expected**: Return couple object directly
**Actual**: Returns `{ message, couple }` object
**Fix Location**: `src/modules/couples/couples.controller.ts:44-54`

### Issue 2.3: Interview responses missing from submitInterview response
**Root Cause**: Service returns `{ interview, session }` but controller may not expose interview correctly
**Failed Tests**:
- `authorization.e2e-spec.ts` - "should allow user to submit their own interview"

**Expected**: Response includes `interview.id` at top level
**Actual**: `interview.id` is undefined in response
**Fix Location**: `src/modules/sessions/sessions.controller.ts:38-45`

---

## Category 3: Validation & Error Handling (15 failures)

### Issue 3.1: Invalid UUID should return 400, not 404
**Root Cause**: ParseUUIDPipe may not be configured correctly or missing from some routes
**Failed Tests**:
- `onboarding.e2e-spec.ts` - "should reject invalid invitation token"
- `authorization.e2e-spec.ts` - "should prevent user from accepting invite for already-paired couple"

**Expected**: 400 Bad Request (malformed input)
**Actual**: 404 Not Found (Prisma query returns null for invalid UUID)
**Fix Location**: Ensure ParseUUIDPipe is applied to ALL routes with UUID params

**Note**: This was supposedly fixed but tests still failing. May need to:
1. Check if ParseUUIDPipe is correctly imported
2. Verify it's applied to `/couples/accept` route's `inviteToken` parameter
3. Ensure DTO validation includes UUID format validation

### Issue 3.2: Status transition validation returns wrong HTTP codes
**Root Cause**: Service throws different exceptions than tests expect
**Failed Tests**:
- `sessions.e2e-spec.ts` - "should prevent invalid status transitions" (expects 400, gets 200)
- `sessions.e2e-spec.ts` - "should prevent reverting from resolved status" (expects 400, gets 409)
- `edge-cases.e2e-spec.ts` - "should prevent skipping required status steps" (expects 400, gets 200)
- `edge-cases.e2e-spec.ts` - "should prevent reverting from final states" (expects 400, gets 409)

**Analysis**:
- Line 226 in `sessions.service.ts` throws 409 Conflict for final state reversion
- Tests expect 400 Bad Request (invalid input)
- Some transitions succeed when they should fail (getting 200)

**Expected**: 400 Bad Request (client sent invalid status transition)
**Actual**: Either 200 OK (no validation) or 409 Conflict (wrong semantics)
**Fix Location**: `src/modules/sessions/sessions.service.ts:216-238`

```typescript
// Current validation:
if (FINAL_SESSION_STATUSES.includes(session.status) && newStatus !== session.status) {
  throw new ConflictException('Cannot update status of a completed session.');
}

// Missing validation for invalid transitions like:
// - initiated -> resolved (skipping in_progress, unpacking_ready)
// - Should validate state machine rules comprehensively
```

### Issue 3.3: Self-invite prevention returns 409 instead of 400
**Root Cause**: Service treats self-invite as conflict, but it's actually invalid input
**Failed Tests**:
- `onboarding.e2e-spec.ts` - "should prevent user from accepting their own invitation"

**Expected**: 400 Bad Request (you can't accept your own invite - client error)
**Actual**: 409 Conflict
**Fix Location**: `src/modules/couples/couples.service.ts:75-77`

```typescript
// Current:
if (invite.userAId === userId) {
  throw new ConflictException('You cannot accept your own invite');
}

// Should be BadRequestException - this is invalid input, not resource conflict
```

### Issue 3.4: Session access without couple returns 403 instead of 404
**Root Cause**: Authorization check fires before resource lookup
**Failed Tests**:
- `authorization.e2e-spec.ts` - "should prevent user without couple from accessing any session"

**Expected**: 404 Not Found (session doesn't exist for this user's context)
**Actual**: 403 Forbidden
**Fix Location**: `src/modules/sessions/sessions.service.ts:282-301`

**Analysis**: This is a design question - should we reveal that a session exists if user isn't authorized?
- **403 approach**: "You're not allowed to see this" (reveals existence)
- **404 approach**: "This doesn't exist" (hides existence, better security)

Tests expect 404 for better security posture.

---

## Category 4: Privacy & Security (2 failures)

### Issue 4.1: Interview responses still exposed in session detail endpoint
**Root Cause**: Despite sanitization, interviews array is still being returned
**Failed Tests**:
- `authorization.e2e-spec.ts` - "should prevent user from viewing raw partner interview before unpacking"

**Expected**: `session.interviews` should be undefined or not include responses/notes
**Actual**: Returns `[{completedAt, createdAt, id, sessionId, updatedAt, userId}]`

**Analysis**: The test expects interviews to be completely hidden, but current implementation returns metadata.
Need to clarify spec requirement:
- Option A: Hide interviews completely until unpacking
- Option B: Show metadata only (current implementation)

**Fix Location**: `src/modules/sessions/sessions.service.ts:76-97`

---

## Category 5: Concurrent Operations (3 failures)

### Issue 5.1: Simultaneous registrations with same email
**Root Cause**: Race condition in unique email constraint
**Failed Tests**:
- `edge-cases.e2e-spec.ts` - "should handle simultaneous user registrations with same email"

**Expected**: Exactly one 201 Created, one 409 Conflict
**Actual**: Different result (both succeed or both fail)
**Fix Location**: Database constraint + proper error handling in auth service

### Issue 5.2: Simultaneous invite acceptances
**Root Cause**: Race condition in couple update
**Failed Tests**:
- `edge-cases.e2e-spec.ts` - "should handle simultaneous invite acceptances gracefully"

**Expected**: [201, 404] or [201, 409]
**Actual**: [200, 404]
**Fix Location**: Add transaction lock or optimistic locking to `couples.service.ts:88-95`

### Issue 5.3: Simultaneous session creations
**Root Cause**: Race condition in "active session" check
**Failed Tests**:
- `edge-cases.e2e-spec.ts` - "should handle simultaneous session creations from same couple"

**Expected**: One succeeds, one fails
**Actual**: Both may succeed
**Fix Location**: Add transaction or unique constraint to prevent duplicate active sessions

---

## Category 6: Feature Gaps (8 failures)

### Issue 6.1: Special character sanitization not implemented
**Root Cause**: Input sanitization/validation incomplete
**Failed Tests**:
- `edge-cases.e2e-spec.ts` - "should sanitize special characters in input"

**Expected**: Special characters handled safely
**Actual**: Feature not implemented
**Fix Location**: Add input sanitization middleware or DTO validators

### Issue 6.2: Large JSON response handling
**Root Cause**: No limits on interview response size
**Failed Tests**:
- `edge-cases.e2e-spec.ts` - "should handle large JSON interview responses"

**Expected**: Accept large responses (or reject with clear limit)
**Actual**: Undefined behavior
**Fix Location**: Add size limits to `SubmitInterviewDto`

### Issue 6.3: Auto-save draft interviews not implemented
**Root Cause**: Feature not built yet
**Failed Tests**:
- `edge-cases.e2e-spec.ts` - "should auto-save interview responses as drafts"

**Expected**: Incomplete interviews saved with `completedAt: null`
**Actual**: Feature doesn't exist
**Fix Location**: `sessions.service.ts:99-162` needs draft save logic

---

## Category 7: Test Infrastructure Issues (11 failures)

### Issue 7.1: Complete session flow test failure
**Root Cause**: Test setup issue - `couple.userA` is undefined
**Failed Tests**:
- `sessions.e2e-spec.ts` - "should complete full session lifecycle from creation to unpacking_ready"

**Error**: `TypeError: Cannot read properties of undefined (reading 'userA')`
**Fix Location**: Test code issue in `sessions.e2e-spec.ts:636`

**Analysis**: Test expects `couple` object to have `userA` property, but response structure changed

---

## Priority Fix Order

### High Priority (Blocks Many Tests)
1. **Fix POST /auth/login to return 200** (blocks ~20 tests via test-helpers)
2. **Fix POST /couples/accept to return 200** (blocks ~10 tests)
3. **Fix session response structure** (blocks session tests)
4. **Fix status transition validation** (security-critical)

### Medium Priority (Security & Spec Alignment)
5. **Fix interview privacy exposure** (security requirement)
6. **Fix UUID validation edge cases** (proper error handling)
7. **Fix concurrent operation race conditions** (data integrity)

### Low Priority (Nice to Have)
8. **Implement special character sanitization**
9. **Add large JSON handling**
10. **Implement draft auto-save feature**

---

## Quick Wins

These can be fixed with minimal changes:

1. **couples.controller.ts:44-54** - Change status code to 200, unwrap response
2. **sessions.controller.ts:23-26** - Return session directly without wrapping
3. **couples.service.ts:75-77** - Change ConflictException to BadRequestException
4. **sessions.service.ts:226** - Change ConflictException to BadRequestException

---

## Files Requiring Changes

| File | Issues | Estimated Effort |
|------|--------|------------------|
| `src/auth/auth.controller.ts` | Login status code | 5 min |
| `src/modules/couples/couples.controller.ts` | Accept status + response structure | 10 min |
| `src/modules/couples/couples.service.ts` | Self-invite exception type | 5 min |
| `src/modules/sessions/sessions.controller.ts` | Response structure | 10 min |
| `src/modules/sessions/sessions.service.ts` | Status validation, privacy, error codes | 30 min |
| `src/modules/sessions/dto/submit-interview.dto.ts` | Size limits, sanitization | 15 min |
| `test/sessions.e2e-spec.ts` | Test infrastructure fixes | 10 min |

**Total Estimated Effort**: ~1.5 hours to fix all issues

---

## Notes for Codex

- All file paths are relative to `/Users/aryangupta/relation-counselor/backend/`
- Tests run via `npm run test:e2e`
- Test database: PostgreSQL on localhost:54320
- Spec reference: `../relationship-app-detailed-design-spec.md`
- Previous fixes already completed:
  - ✅ Privacy sanitization in getSession() and getAllSessions()
  - ✅ Session guard throws 403 (not 409) when agreement not signed
  - ✅ Invite reminder pattern implemented
  - ✅ ParseUUIDPipe added to session routes

## Verification Checklist

After fixes, verify:
- [ ] All status codes match HTTP semantics (200 for updates, 201 for creates, 400 for bad input, 403 for auth, 404 for not found, 409 for conflicts)
- [ ] Response structures match test expectations (no extra wrapping)
- [ ] Privacy requirements enforced (no interview responses exposed)
- [ ] UUID validation catches invalid formats before database queries
- [ ] Concurrent operations handled safely with transactions/locks
- [ ] All 104 tests passing (or 89 passing + 15 intentional TODOs)
