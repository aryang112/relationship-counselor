# E2E Test Review – November 20, 2025

This document summarizes the current gaps between our end-to-end (E2E) test suites and the implemented backend. Each finding highlights the problem, why it diverges from the product specification, and the recommended path to align the implementation with the spec-driven tests.

---

## 1. Auth Responses Misaligned with Spec

**Problem**  
`POST /auth/register` and `POST /auth/login` return `{ accessToken, user }`, whereas the E2E suites (and spec) expect the registration endpoint to return user fields (id, email, name, timezone) at the top level. Tests like `onboarding.e2e-spec.ts:32` fail because `response.body.email` is undefined.

**Spec Alignment**  
Flow 1 emphasizes immediate access to user data (timezone detection, name confirmation). The UI and tests both depend on receiving these fields without additional nesting.

**Recommended Fix**  
Update `AuthService.register`/`AuthController` to return the flattened user payload (and include timezone) alongside the JWT. This is low effort and immediately unblocks multiple onboarding tests.

**Value**  
Consistent payloads simplify frontend integration and keep tests reliable indicators of onboarding health.

---

## 2. Invite Regeneration vs. Conflict Error

**Problem**  
`POST /couples/invite` regenerates the invite token when Partner B hasn’t joined yet (`CouplesService.createInvite`). The onboarding E2E expects a 409 Conflict to prevent duplicate invites (tests referencing Flow 1 rules). Current behavior contradicts both tests and spec.

**Spec Alignment**  
Flow 1 stresses a *single* invite that carries weight—repeated taps aren’t supposed to silently change the token.

**Recommended Fix**  
Throw `ConflictException` when a pending invite exists, and add a separate “Regenerate” endpoint later if we truly need it. Minimal change, matches test expectations.

**Value**  
Prevents race conditions, keeps invites stable, and gives users clearer feedback.

---

## 3. Incorrect HTTP Statuses & Payloads for Agreement Flow

**Problem**  
`POST /couples/agreement` returns 201 Created and wraps the couple in `{ message, couple }`. Tests expect 200 OK and direct access to `agreementSignedAt` (`onboarding.e2e-spec.ts:262`). Similar payload mismatches exist for `/couples/me`.

**Spec Alignment**  
Flow 1 expects confirmation dialogs and immediate visibility into agreement state. The tests model that expectation.

**Recommended Fix**  
Return 200 OK and the plain couple object (or a DTO matching the tests/spec). Apply the same pattern to `/couples/me`.

**Value**  
Reduces frontend parsing logic and keeps the E2E suite meaningful.

---

## 4. Session Guard Should Enforce Agreement with 403

**Problem**  
`SessionsService.startSession` throws `ConflictException` (409) if the agreement isn’t signed; tests expect 403 Forbidden (`sessions.e2e-spec.ts:58`) because it’s an authorization gate, not a conflict.

**Spec Alignment**  
Flow 2 explicitly states sessions can’t begin until both partners sign, positioning it as a gate. Using 403 communicates “you’re not allowed yet,” matching UX copy.

**Recommended Fix**  
Throw `ForbiddenException` when `agreementSignedAt` is null. Update error message to guide users toward signing.

**Value**  
Clarifies intent, aligns HTTP semantics, and lets tests validate the gate correctly.

---

## 5. Interview Submission Response Shape

**Problem**  
`POST /sessions/:id/interview` returns `{ interview, session }`. Tests expect the interview document directly and assert `response.body.sessionId`/`userId`. This mismatch breaks multiple assertions.

**Spec Alignment**  
Flow 2 describes the interview step as private journaling; the API should reflect that by returning the interview itself (plus optional metadata) instead of bundling the session.

**Recommended Fix**  
Return just the interview DTO, or provide a separate endpoint for session refresh. Keep status updates server-side.

**Value**  
Simplifies clients/tests and keeps responsibilities clear.

---

## 6. Duplicate Interview Submissions Not Blocked

**Problem**  
Submitting twice overwrites the existing interview; tests expect a 409 Conflict (`sessions.e2e-spec.ts:171`). Spec text calls out each partner completing their “private interview” once.

**Spec Alignment**  
Allowing silent overwrites undermines the commitment to candid reflections. Users should explicitly edit or restart, not overwrite by accident.

**Recommended Fix**  
Detect existing interview by `sessionId` + `userId` and return 409 with guidance. Later we can add an “edit interview” endpoint if needed.

**Value**  
Protects user trust and ensures the state machine only advances after an intentional completion.

---

## 7. Session Detail Endpoint Exposes Raw Interviews

**Problem**  
`GET /sessions/:id` includes the `interviews` array (with responses). Tests (authorization + session suites) assert that partners should **not** see raw responses until unpacking is ready. This violates both privacy requirements and test assumptions.

**Spec Alignment**  
Flow 3 catalogs strong privacy guarantees: private interviews remain private. Exposing them via sessions contradicts that promise.

**Recommended Fix**  
Adjust `SessionsService.getSession` to omit interview content unless the caller is the author (and even then, consider returning only metadata). Provide a dedicated endpoint later if needed with strict guards.

**Value**  
Maintains privacy, keeps E2E tests relevant, and supports the “transparency with friction” principle.

---

## 8. Missing UUID Validation on Session Routes

**Problem**  
`GET /sessions/:id` (and other routes) accept any string and let Prisma throw, yielding 404. Edge-case tests expect 400 for invalid UUID formats (`edge-cases.e2e-spec.ts:73`).

**Spec Alignment**  
Clear validation errors tie back to the spec’s emphasis on “transparent but gentle” UX. Bad IDs should prompt immediate, clear feedback.

**Recommended Fix**  
Apply `ParseUUIDPipe` (or custom DTO validation) to all `:id` params. This is a trivial change with outsized clarity gains.

**Value**  
Improves DX, helps tests verify validation logic, and keeps logs cleaner.

---

## 9. E2E Infra Depends on `supertest` but Not Installed

**Problem**  
Running `npm run test:e2e` currently fails at compile time (`TS2307: Cannot find module 'supertest'`). Without installing `supertest`/`@types/supertest`, the comprehensive suites can’t even start.

**Spec Alignment**  
The tests are our executable spec; if they can’t run, we lose confidence in spec adherence.

**Recommended Fix**  
Add `supertest` and `@types/supertest` to backend dev dependencies (if not already), and ensure the root `npm install` pulls them in. This is strictly infrastructure but essential for “tests as spec.”

**Value**  
Unblocks the entire E2E suite, enabling ongoing spec verification.

---

## 10. Start Session Response Should Mirror Spec Fields

**Problem**  
`POST /sessions` returns `status: 'initiated'` with `interviews` embedded. Tests expect topic/context fields, initiation metadata, and no interviews yet. This difference is small but causes repeated assertion mismatches.

**Spec Alignment**  
Flow 2 shows the starting dashboard summary: topic, initiator, status. Tests replicate that; we should emit a DTO matching those fields.

**Recommended Fix**  
Shape the response to include `id`, `coupleId`, `status`, `initiatedBy`, `topic`, `context`, `createdAt`, `updatedAt`, and omit interview arrays until needed.

**Value**  
Improves client clarity and reduces boilerplate in tests/UI.

---

## Prioritized Remediation Plan

1. **Fix auth + couple response DTOs and status codes** – unblocks dozens of onboarding tests and keeps frontend parity.
2. **Harden session guards & interview submissions** – addresses multiple business-critical failures (agreement gate, duplicate interviews, privacy leaks).
3. **Add validation + install missing deps** – quick wins that get the E2E suite running consistently.
4. **Revisit longer-term enhancements** (notification TODOs, worker hooks) once the base suite is green.

These fixes are incremental yet high-impact. Once implemented, the E2E suites will accurately enforce the product spec, giving us confidence to proceed with later flows (AI unpacking, reconnection, notifications).
