# Sprint Plan — Push Notifications + Reconnection Chat

> **Dev Lead:** Claude (autonomous)
> **Created:** 2026-03-25
> **Status:** IN PROGRESS
> **Agents:** Update this file as you complete tasks. Mark ✅ when done, 🔄 when in progress.

---

## Context

**Product Goal:** Relate is an AI relationship mediator. Two partners each privately share their side of a conflict → AI unpacks both perspectives → guided reconnection chat helps them understand each other → they save a shared learning.

**What's Built:**
- Interview flow (Phase 1-2): ✅ Complete
- Unpacking (Phase 3): ✅ Backend + worker built, needs Redis OR inline fallback
- Notifications: 90% built — service, queue, 8 notification triggers all wired. Missing: push token storage + registration endpoint
- Reconnection (Phase 4-5): Frontend UI exists, backend is 0%

**Architecture:**
- Backend: NestJS + Prisma + PostgreSQL + BullMQ
- Frontend: React Native / Expo
- AI: OpenAI (gpt-4o-mini for interviews, gpt-4o for unpacking)
- Notifications: Expo Push API (already integrated in NotificationsService)

---

## Sprint 1: Push Notifications (Unblocks everything)

### Task 1.1 — Schema: Add pushToken to User model
- **File:** `backend/prisma/schema.prisma`
- **Change:** Add `pushToken String?` field to User model
- **Then:** Run `npx prisma migrate dev --name add_push_token`
- **Status:** ✅ DONE — Migration `20260326030332_add_push_token` applied

### Task 1.2 — Backend: POST /notifications/register endpoint
- **Files:** Create `backend/src/modules/notifications/notifications.controller.ts`
- **Endpoints:**
  - `POST /notifications/register` — receives `{ pushToken: string }`, saves to authenticated user's record
  - `DELETE /notifications/register` — clears pushToken (called on logout)
- **Auth:** Both endpoints require JWT (`@UseGuards(JwtAuthGuard)`)
- **Register in:** `notifications.module.ts` — add controller to module
- **Status:** ✅ DONE — Controller + DTO + module updated, registered in app.module.ts

### Task 1.3 — Backend: Push token lookup in notification sends
- **File:** `backend/src/modules/sessions/sessions.service.ts`
- **Change:** Every `this.notificationsService.send()` call currently passes `userId` but no `pushToken`. Add a helper method `private async getUserPushToken(userId: string): Promise<string | null>` that queries `prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } })`.
- **Update:** All notification send calls to include `pushToken: await this.getUserPushToken(userId)` and `email: user.email` (some already have email, check each).
- **Affected methods:** `notifyPartnerBInvite`, `schedulePartnerBReminders`, `notifyPartnerAStarted`, `notifyUnpackingReady`, `scheduleInterviewReminders`, `schedulePostResolutionCheckIn`, `remindPartnerToParticipate`
- **Status:** ✅ DONE — Added `getUserNotificationInfo()` helper, updated all 13 notification send calls with pushToken + email

### Task 1.4 — Frontend: Notification permission onboarding screen
- **File:** Create `frontend/src/screens/onboarding/NotificationPermissionScreen.tsx`
- **Design:**
  - Warm bgPrimary background
  - Bell emoji or illustration at top
  - Title: "Stay connected" (Cormorant Garamond display font)
  - Body: 3 bullet points explaining what they'll be notified about:
    - "Know when your partner is ready to talk"
    - "Get gentle reminders for your sessions"
    - "See when your unpacking insights are ready"
  - Primary CTA: "Enable Notifications" → calls `Notifications.requestPermissionsAsync()` → if granted, registers token → navigates next
  - Secondary: "Maybe Later" link → skips, navigates next
- **Flow placement:** After Agreement screen, before finishOnboarding
- **Update:** `OnboardingNavigator.tsx` — add NotificationPermission screen between Agreement and Tutorial
- **Status:** ✅ DONE

### Task 1.5 — Frontend: Wire token registration on auth boot
- **File:** `frontend/src/hooks/useNotifications.ts` (already exists)
- **Change:** Ensure `registerPushToken()` is called with the Expo push token whenever the user authenticates. Check `RootNavigator.tsx` — it may already call this. Verify the flow works end-to-end.
- **Also:** On logout/delete account, call `DELETE /notifications/register` to clear the token.
- **Status:** ✅ DONE

---

## Sprint 2: Inline Unpacking Fallback (Skip Redis dependency)

### Task 2.1 — Backend: Inline unpacking generation
- **File:** `backend/src/modules/sessions/sessions.service.ts`
- **Change:** In `ensureUnpackingExists()`, after creating the placeholder, check if Redis/queue is available. If NOT available (the current `enqueued: false` case), generate unpacking inline:
  1. Fetch both partners' interview responses
  2. Call OpenAI directly (reuse the prompt from `workers/src/services/openai.service.ts`)
  3. Upsert the real unpacking content
  4. This runs async (fire-and-forget) so it doesn't block the HTTP response
- **Why:** Eliminates Redis/worker dependency for development and small-scale production
- **Status:** ✅ DONE

---

## Sprint 3: Reconnection Chat (Async Turn-Based)

> **Architecture Decision:** Async turn-based (not WebSocket real-time).
> Partners take turns. Each gets AI coaching before responding.
> This aligns with Relate's philosophy: thoughtful, mediated communication > instant messaging.

### Task 3.1 — Schema: ReconnectionMessage + Commitment models
- **File:** `backend/prisma/schema.prisma`
- **Changes:**
```prisma
model ReconnectionMessage {
  id        String   @id @default(uuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  userId    String?  // null for AI mediator messages
  user      User?    @relation(fields: [userId], references: [id])
  role      String   // 'user_a', 'user_b', 'ai'
  text      String
  createdAt DateTime @default(now())

  @@index([sessionId, createdAt])
}

model Commitment {
  id        String   @id @default(uuid())
  sessionId String   @unique
  session   Session  @relation(fields: [sessionId], references: [id])
  text      String   // AI-generated commitment text
  userAAgreed Boolean @default(false)
  userBAgreed Boolean @default(false)
  userAAgreedAt DateTime?
  userBAgreedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
- Add `reconnectionMessages ReconnectionMessage[]` and `commitment Commitment?` relations to Session model
- Add `reconnectionMessages ReconnectionMessage[]` relation to User model
- Run migration: `npx prisma migrate dev --name add_reconnection_and_commitments`
- **Status:** ✅ DONE — Migration `20260326031406_add_reconnection_and_commitments` applied

### Task 3.2 — Backend: Reconnection service
- **File:** Create `backend/src/modules/reconnection/reconnection.service.ts`
- **Methods:**
  - `getMessages(sessionId, userId)` — returns all messages for the session, determines whose turn it is
  - `sendMessage(sessionId, userId, text)` — saves message, determines if AI should respond, generates AI mediation if needed
  - `getWhoseTurn(sessionId)` — based on last message role, determine who goes next (alternating A → AI → B → AI → A...)
  - `generateAIMediation(sessionId, messages, unpacking)` — calls OpenAI with reconnection-specific prompt incorporating unpacking insights
  - `generateCommitment(sessionId)` — AI generates a shared learning/commitment based on the full reconnection conversation
  - `agreeToCommitment(sessionId, userId)` — marks user's agreement
- **AI Prompt for reconnection mediator:**
  - System: "You are a relationship mediator guiding two partners through a reconnection conversation. You have insights from their individual sessions (provided below). Your role: help them hear each other, validate feelings, and find common ground. Keep prompts SHORT (1-2 sentences). Alternate between partners. After 3-4 exchanges each, suggest they formulate a shared commitment."
  - Include unpacking data (surfaceConflict, partnerAExperience, partnerBExperience, sharedTruths) as context
- **Status:** ✅ DONE — Created reconnection.service.ts with all methods + OpenAI integration

### Task 3.3 — Backend: Reconnection controller
- **File:** Create `backend/src/modules/reconnection/reconnection.controller.ts`
- **Endpoints:**
  - `GET /sessions/:id/reconnection` — get messages + turn state + commitment
  - `POST /sessions/:id/reconnection` — send a message (validates it's your turn)
  - `POST /sessions/:id/reconnection/commitment` — generate commitment (after enough exchanges)
  - `PATCH /sessions/:id/reconnection/commitment` — agree to commitment
- **Auth:** All require JWT + must be member of the session's couple
- **Status:** ✅ DONE — Created reconnection.controller.ts with all 4 endpoints

### Task 3.4 — Backend: Reconnection module
- **File:** Create `backend/src/modules/reconnection/reconnection.module.ts`
- **Imports:** PrismaModule, NotificationsModule, ConfigModule
- **Register in:** `app.module.ts`
- **Status:** ✅ DONE — Module created + registered in app.module.ts

### Task 3.5 — Frontend: API service for reconnection
- **File:** Create or update `frontend/src/services/reconnection.ts`
- **Functions:**
  - `getReconnection(sessionId)` → GET /sessions/:id/reconnection
  - `sendReconnectionMessage(sessionId, text)` → POST /sessions/:id/reconnection
  - `generateCommitment(sessionId)` → POST /sessions/:id/reconnection/commitment
  - `agreeToCommitment(sessionId)` → PATCH /sessions/:id/reconnection/commitment
- **Status:** ✅ DONE — Agent E created `frontend/src/services/reconnection.ts` with all 4 API functions + typed interfaces

### Task 3.6 — Frontend: Rewrite useReconnection hook
- **File:** `frontend/src/hooks/useReconnection.ts`
- **Complete rewrite.** Replace all fake/hardcoded logic with real API calls:
  - On mount: `getReconnection(sessionId)` to load existing messages + turn state
  - `sendMessage(text)`: call API, add optimistic message, poll for AI + partner response
  - Polling: every 3s, call `getReconnection` to check for new messages from partner
  - Turn management: `isMyTurn` comes from API response, not local state
  - Commitment: when AI suggests it (after ~4 exchanges each), show commitment UI
  - `completeReconnection()`: agree to commitment + update session status
- **Status:** ✅ DONE — Agent E rewrote hook with real API calls, polling, optimistic updates, fallback for missing backend

### Task 3.7 — Frontend: Update CommitmentsScreen
- **File:** `frontend/src/screens/reconnection/CommitmentsScreen.tsx`
- **Changes:**
  - Replace hardcoded learning text with AI-generated commitment from API
  - Wire "I agree" checkbox to `agreeToCommitment()` API call
  - Show partner's agreement status
  - "Save & Complete" calls `completeReconnection()` only when both agree
- **Status:** ✅ DONE — Agent E wired commitment generation on mount, agreement API, partner status display, both-agreed gating

### Task 3.8 — Notifications for reconnection
- **File:** `backend/src/modules/reconnection/reconnection.service.ts`
- **Add notifications:**
  - When Partner A sends first reconnection message → notify Partner B "Your partner started the reconnection. It's your turn to share."
  - When it's your turn → push notification "{partnerName} responded. Your turn."
  - When commitment is generated → notify both "Your shared learning is ready"
- **Status:** ⬜ TODO

---

## Agent Assignment

| Agent | Sprint | Tasks | Dependencies |
|-------|--------|-------|-------------|
| Agent A | Sprint 1 | 1.1, 1.2, 1.3 | None (start immediately) |
| Agent B | Sprint 1 | 1.4, 1.5 | None (start immediately, parallel with A) |
| Agent C | Sprint 2 | 2.1 | None (start immediately) |
| Agent D | Sprint 3 | 3.1, 3.2, 3.3, 3.4 | Depends on 1.1 (schema migration) |
| Agent E | Sprint 3 | 3.5, 3.6, 3.7 | Depends on 3.2, 3.3 (backend endpoints) |
| Agent F | Sprint 3 | 3.8 | Depends on 3.2 (reconnection service) |

## Rules for Agents

1. **Read this file FIRST** before starting any work
2. **Update status** in this file as you complete each task (⬜ → 🔄 → ✅)
3. **Read `state.md`** and `tasks/lessons.md` before writing code
4. **Run `npx tsc --noEmit`** after every file change to catch errors early
5. **Do NOT modify files another agent is working on** — check the assignment table
6. **If blocked:** write the blocker in this file under the task, move to next task
7. **When done:** update `state.md` with what you completed
