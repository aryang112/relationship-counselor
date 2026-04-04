# Relate App — State File

> Updated by every agent/subagent. Append-only with timestamps.
> This is the handoff document between all agents.

---

## Current Status

**Branch:** `database-implementation`
**Last updated:** 2026-04-03 (Onboarding Redesign — COMPLETE)
**Last agent:** Jarvis (Claude Opus 4.6)

### What's Active
- **[2026-04-03] Onboarding Redesign** — COMPLETE ✓ (zero TS errors)
  - Source: `relate_onboarding_redesign_spec.md`
  - **Replaced 5 old quiz screens with 8 new behavioral profile screens:**
    1. YourName (kept) → name + gender
    2. ConflictBehaviorScreen (NEW) → Gottman Four Horsemen mapping
    3. CoreEmotionScreen (NEW) → EFT primary emotion
    4. PursueWithdrawScreen (NEW) → demand/withdraw cycle role
    5. FloodingThresholdScreen (NEW) → overwhelm pacing
    6. CoreFearScreen (NEW) → attachment fear (disguised)
    7. RepairStyleScreen (NEW) → post-fight reconnection
    8. RecurringThemeScreen (NEW) → perpetual conflict pattern
    9. CommunicationMediumScreen (NEW) → how fights happen
  - **All single-select** (not multi-select like old screens)
  - **Deleted old screens:** CommunicationStyleScreen, ConflictFeelingsScreen, PartnerDetailsScreen, ConflictPreferencesScreen, RelationshipStoryScreen, LoveBankScreen
  - **Updated onboardingStore.ts:** New profile fields (conflictBehavior, coreEmotion, pursueWithdraw, floodingThreshold, coreFear, repairStyle, recurringTheme, communicationMedium)
  - **Updated OnboardingNavigator:** New 9-screen quiz flow → CreateAccount → Consent → InvitePartner → NotificationPermission → Paywall → Agreement → Main
  - **Updated backend AI profile builder** (interview-ai.service.ts): New lookup maps for all profile fields with backward compatibility for legacy onboarding data
  - **Paywall integration:** PaywallScreen now accepts onSkip/onPurchased props for onboarding context, shown after invite + notifications with "Start with 2 free sessions" skip option
  - **Flow change:** No more WaitingForPartner screen in main flow — after InvitePartner goes directly to NotificationPermission → Paywall
- **[2026-03-28] Sprint 5: App Store Compliance** — COMPLETE ✓ (all tasks, zero TS errors)
  - Source: `relate_appstore_agent_spec.md` + `relate_appstore_compliance_spec.md`
  - Plan: `tasks/todo.md`
  - **Phase 1 — Foundation (Main Agent):**
    - Schema: Added subscriptionTier, subscriptionExpiresAt, revenuecatId, resolvedSessionCount to User model
    - Migration: `20260328181839_add_subscription_fields`
    - Installed react-native-purchases (RevenueCat) + pod install
    - Created subscription types + Zustand store
  - **Phase 2 — Parallel Agents (5 agents, zero conflicts):**
    - TASK 5.0: PaywallScreen + useSubscription hook — COMPLETE ✓
      - `frontend/src/screens/subscription/PaywallScreen.tsx` (NEW) — Premium $14.99/mo + Resolve Now $2.99
      - `frontend/src/hooks/useSubscription.ts` (NEW) — RevenueCat SDK wrapper
      - Session gating in StartMediationScreen (2 free sessions, then paywall)
      - Paywall added to MainNavigator
    - TASK 5.1: Backend subscription endpoints — COMPLETE ✓
      - GET /auth/subscription, POST /auth/subscription/verify, POST /auth/subscription/restore
      - Paywall gate in startSession() (ForbiddenException if free tier + 2 resolved sessions)
      - resolvedSessionCount incremented on session→resolved transition
      - Subscription fields added to register/login/validateUser returns
    - TASK 5.2: iOS Config + Compliance — COMPLETE ✓
      - app.json: updated microphone description, notification color → #E07832, added RevenueCat plugin
      - PrivacyInfo.xcprivacy created (email, name, user content, user ID, UserDefaults API)
      - SplashScreen: "Not a therapist" disclaimer added
      - SettingsScreen: Subscription section with Manage + Restore Purchases
    - TASK 5.3: Demo Seed Script — COMPLETE ✓
      - `backend/prisma/seed-demo.ts` — 2 demo accounts, completed session with interviews, unpacking, reconnection, commitment
      - `docs/APP_STORE_REVIEW.md` — Reviewer credentials + testing instructions
      - npm script: `seed:demo`
    - TASK 5.4: Privacy Labels + Accessibility — COMPLETE ✓
      - `privacy_labels_inventory.json` — 11 data types, 4 SDKs, no tracking
      - Accessibility fixes across 15+ screen files: accessibilityLabel on icon-only buttons, accessibilityRole="header" on titles, tap targets bumped to 44×44 minimum
  - **TypeScript: ZERO errors (frontend + backend)**
  - **Previously done (from earlier sprints):** Account Deletion, AI Consent Modal, Privacy/ToS, Crisis Resources
- **[2026-03-27] Sprint 4: User Feedback Fixes** — COMPLETE ✓ (14/16 issues fixed, zero TS errors)
  - Remaining: #1 splash video, #2 connected video (P2, need Lottie assets)
  - Source: `RelateApp_Fixing.rtf` (16 issues from user testing)
  - Plan: `tasks/todo.md`
  - Wave A (AI prompts): 4.5 interview AI, 4.10/11/12 unpacking prompts, 4.13-16 reconnection AI
  - Wave B (frontend): 4.3 spacing, 4.4 pronouns, 4.6 remove pills, 4.9 dashboard CTA, 4.11b card overflow, 4.7 partner B context
  - Wave C (video animations): 4.1 splash video, 4.2 connected video — P2
  - **COMPLETED (Wave B Tasks 4.3, 4.4, 4.6, 4.9, 4.11b): Frontend UI Fixes**
    - TASK 4.6: Removed ALL emotion pill code from InterviewScreen + useInterview (EMOTIONS array, showEmotionPills/emotionPillsShown state, useEffect, handleEmotionSelect, EmotionPill import, emotion pill JSX, emotion pill styles, responseCount state)
    - TASK 4.4: Gender-aware pronouns on InterviewCompleteScreen — maps partner gender (Male→his, Female→her, else→their), updates waitNote text with gendered pronoun and verb form
    - TASK 4.9: Dashboard "View Unpacking" CTA — when session status is 'unpacking_ready', shows "View Unpacking" button navigating to UnpackingChoice + "Unpacking Ready" badge
    - TASK 4.3: Interview screen spacing fix — added flexGrow:1 + justifyContent:'flex-end' to FlatList contentContainerStyle so messages stack from bottom up (chat-app pattern)
    - TASK 4.11b: Unpacking cards text overflow — wrapped card content in ScrollView with nestedScrollEnabled for both gradient and non-gradient cards, added cardScrollArea style
  - **COMPLETED (Tasks 4.13-4.16): Reconnection Screen Fixes**
    - TASK 4.13: Removed strict turn-taking — both partners can always send messages
    - TASK 4.14: Removed AI name prefixes ("[Aryan]:") from system prompt + added explicit rule
    - TASK 4.15: Removed suggested response pills (SUGGESTED_RESPONSES array + JSX + styles)
    - TASK 4.16: Fixed header truncation, AI generates opening message when no messages exist, updated mediation prompt (1-2 sentence max, offline nudge after 6+ messages)
  - **COMPLETED (Wave A Tasks 4.5, 4.10, 4.11, 4.12): AI Prompt Rewrites**
    - TASK 4.5: Interview AI rewrite — new "close friend" voice (not therapist), response mix rotation (7 types), banned therapy cliches, 30% no-question responses, max_tokens 200→120 for shorter replies. Updated all 3 gender tone blocks (male=direct, female=specific validation, neutral=mirror style).
    - TASK 4.10: Worker unpacking prompt rewrite — Spotify Wrapped energy, direct 2nd-person address ("you both"), added underlyingNeeds + breakthrough fields to JSON schema. Updated both generateUnpacking() and regenerateUnpacking() in workers/openai.service.ts.
    - TASK 4.11: Worker unpacking processor field mapping — partnerAExperience now includes underlyingNeeds appended, deeperInsight uses breakthrough (recommendations as fallback). Both generate and regenerate processors updated.
    - TASK 4.12: Inline unpacking prompts — updated generateUnpackingInline() and regenerateUnpackingInline() in sessions.service.ts to match worker prompts exactly. Same field mapping with underlyingNeeds + breakthrough.
- **[2026-03-26] Sprint 3: App Store Readiness** — COMPLETE ✓ (all 11 tasks, zero TS errors)
  - Plan: `tasks/todo.md` (10 tasks across P0/P1/P2)
  - P0 Wave (in parallel):
    - TASK 3.1: WaitingForPartnerScreen polling — COMPLETE
    - TASK 3.2: Crisis alert & intervention system — COMPLETE
    - TASK 3.3: Profile data API + frontend wiring — COMPLETE
    - TASK 3.4: Interview worker inline fallback check — COMPLETE (N/A — already inline)
  - P0 Wave: ALL COMPLETE ✓ (verified: zero TypeScript errors across frontend/backend/workers)
  - P1 Wave (in parallel):
    - TASK 3.5: Push notification deep linking — COMPLETE
    - TASK 3.6: ReconnectTab active session routing — COMPLETE
    - TASK 3.7: Emotion pills in interview — COMPLETE
    - TASK 3.8a: AI session memory (past context in prompts) — COMPLETE
  - P1 Wave: ALL COMPLETE ✓ (verified: zero TypeScript errors across frontend/backend/workers)
  - P2 Wave (in parallel):
    - TASK 3.8: Splash screen animation — COMPLETE
    - TASK 3.9: Connected celebration animation — COMPLETE
    - TASK 3.10: Commitment save celebration — COMPLETE
  - P2 Wave: ALL COMPLETE ✓ (verified: zero TypeScript errors across frontend/backend/workers)
  - **SPRINT 3 COMPLETE — App ready for E2E testing + App Store submission**
- **[2026-03-26] TASK 3.8 Splash Screen Entrance Animation — COMPLETE** ✓
  - `SplashScreen.tsx`: Replaced manual `useSharedValue`/`useAnimatedStyle`/`useEffect` animations with declarative `entering` props from reanimated. Logo: `FadeIn.duration(600)`. Tagline: `FadeIn.duration(600).delay(200)`. Bottom CTA area: `FadeInUp.duration(600).delay(400).springify().damping(15)`. Removed unused imports (`useEffect`, `Dimensions`, `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withDelay`, `Easing`). No functionality changes.
  - TypeScript: zero new errors (`npx tsc --noEmit` — 3 pre-existing errors in ConnectedScreen.tsx from TASK 3.9 in progress)
- **[2026-03-26] TASK 3.9 Connected Celebration Animation — COMPLETE** ✓
  - `ConnectedScreen.tsx`: Added entrance animations using reanimated `entering` props. Avatar row: `FadeInUp.duration(600).delay(300).springify().damping(14)`. Title: `FadeIn.duration(800)`. Subtitle: `FadeIn.duration(600).delay(600)`. Stats card: `FadeIn.duration(600).delay(600)`. CTA button: `FadeInUp.duration(500).delay(800)`. Added gentle breathing pulse on heart element (`withRepeat`/`withSequence` scaling 1.0-1.15 over 3s cycle, starts 1200ms after mount). Replaced `FadeInDown` imports with `FadeIn`/`FadeInUp`. No functionality changes.
  - TypeScript: zero new errors (1 pre-existing in CommitmentsScreen.tsx, unrelated)
- **[2026-03-26] TASK 3.10 Commitment Save Celebration Animation — COMPLETE** ✓
  - `CommitmentsScreen.tsx`: Added pure reanimated confetti burst animation on save. 15 small dots in warm orange palette (orangeMid, orangeLight, orangeGlow, #FFF8F0) burst outward from the saved badge center on `handleSave` completion. Each particle animates translateX/Y (random angles, 60-150px distance), opacity 1->0, scale 1->0 over 1.2s with staggered delays (60ms increments). Particles auto-unmount after 1.5s via timer. Components: `CelebrationParticle` (individual dot with useSharedValue animations), `CelebrationBurst` (container positioning particles). No new dependencies — pure reanimated `withDelay`/`withTiming`. No functionality changes.
  - TypeScript: zero errors (`npx tsc --noEmit` clean)
- **[2026-03-26] TASK 3.7 Emotion Pills in Interview — COMPLETE** ✓
  - `useInterview.ts`: Added `responseCount` state, tracked via `responsesRef.current.length`, exposed in return interface. Also restored on draft/completed interview resume.
  - `InterviewScreen.tsx`: Imported `EmotionPill` + `FadeIn`. Added `EMOTIONS` array (6 emotions with emojis: Hurt, Dismissed, Scared, Angry, Confused, Overwhelmed). `showEmotionPills` triggers at `responseCount >= 2` (once only via `emotionPillsShown` guard). Pill row renders above input bar with FadeIn.duration(400). `handleEmotionSelect` sends "I felt {emotion}" as user message and hides pills. Manual text send also dismisses pills.
  - TypeScript: zero errors (`npx tsc --noEmit` clean)
- **[2026-03-26] TASK 3.8a AI Session Memory (Past Context in Prompts) — COMPLETE** ✓
  - Added `getPastSessionContext()` public method to `SessionsService` — queries last 5 resolved sessions for a couple, builds a text block with topic, insight, pattern (100 char cap), and commitment for each. Returns null for first-time couples. Output capped at ~600 words.
  - **Unpacking (inline):** `generateUnpackingInline()` fetches pastContext before OpenAI call, appends to system prompt if present.
  - **Unpacking (worker):** `enqueueUnpackingJob()` fetches pastContext and passes as optional field in job data. Worker's `UnpackingJobData` interface updated with `pastContext?: string`. `openai.service.ts` `generateUnpacking()` accepts and injects pastContext. `unpacking.processor.ts` passes it through.
  - **Interview:** `buildSystemPrompt()` accepts optional `pastContext` param. `generateNextQuestion()` and `generateNextQuestionWithContext()` pass it through. Controller's `getNextQuestion` endpoint fetches pastContext via `sessionsService.getPastSessionContext()`.
  - **Reconnection:** `sendMessage()` fetches pastContext inline (same query pattern). `generateAIMediation()` accepts and injects pastContext into system prompt.
  - All changes are additive — null pastContext (first session) produces identical behavior to before.
  - TypeScript: zero errors in both backend and workers.
  - Files modified: `sessions.service.ts`, `interview-ai.service.ts`, `sessions.controller.ts`, `reconnection.service.ts`, `unpacking-queue.service.ts` (backend), `unpacking.queue.ts`, `openai.service.ts`, `unpacking.processor.ts` (workers)
- **[2026-03-26] TASK 3.4 Interview Worker Inline Fallback — N/A, COMPLETE** ✓
  - Interview question generation is already inline — calls OpenAI directly from `interview-ai.service.ts` (`generateNextQuestion` + `generateNextQuestionWithContext`), no BullMQ dependency. No code changes needed.
- **[2026-03-26] TASK 3.3 Profile Data API + Frontend Wiring — COMPLETE** ✓
  - Schema: Added `loveBankEntries Json? @default("[]")` to Couple model. Migration: `20260327013014_add_love_bank_entries`
  - Backend: 5 new endpoints on CouplesController — `GET/POST/DELETE /couples/love-bank`, `GET /couples/stats`, `GET /couples/learnings`. All JWT-guarded via existing JwtAuthGuard. Service queries Prisma for sessions (resolved count), commitments (both agreed), latest session date, datingStartDate.
  - Frontend: New `services/couples.ts` with typed API calls (getLoveBank, addLoveBankEntry, deleteLoveBankEntry, getCoupleStats, getLearnings)
  - LoveBankScreen: Replaced mock data with useEffect→getLoveBank(). Add/delete now hit API. Loading + empty states.
  - LearningsHistoryScreen: Replaced MOCK_LEARNINGS with useEffect→getLearnings(). Loading + empty states. Removed context field (not in Commitment model).
  - UsProfileScreen: Added useEffect loading getCoupleStats()+getLoveBank()+getLearnings() in parallel. Stats now show real data. Love Bank section shows preview card with latest entry count. Learnings section shows preview card. Falls back to local computation if API fails.
  - TypeScript: Zero errors in both frontend and backend.
- **[2026-03-26] TASK 3.2 Crisis Alert & Intervention System — COMPLETE** ✓
  - **Layer 1 (Backend):** Added `detectCrisisInline()` private method to `sessions.service.ts`. Called after interview save in `submitInterview()`. Concatenates all user answers, sends to OpenAI (gpt-4o-mini, temp 0.3) with crisis detection prompt. On medium/high severity: logs `[CRISIS DETECTED]`, sends fire-and-forget email with crisis hotlines via `notificationsService.send()` (email-only channel). Returns `crisisDetected` boolean in response. Controller spreads `crisisDetected` into the interview response object.
  - **Layer 2 (Frontend):** `useInterview` hook exposes `crisisDetected` state. After `submitInterview()` response, sets flag if true. `InterviewScreen` shows `CrisisResourcesModal` when crisis detected — user sees resources before navigating to InterviewCompleteScreen. Non-blocking: dismiss closes modal and proceeds normally.
  - **Layer 3 (Worker):** Replaced TODO in `crisis.processor.ts` with structured `[CRISIS ALERT]` log (sessionId, userId, severity, concerns) for monitoring/Sentry/DataDog pickup.
  - TypeScript: zero new errors (3 pre-existing in `couples.service.ts` from TASK 3.3)
- **[2026-03-26] Unpacking Regeneration — COMPLETE** ✓
- All features compiling

### What TASK 3.5 Agent Completed (March 26 — Push Notification Deep Linking)
- **NEW `navigation/navigationRef.ts`**: Exports `navigationRef` (passed to `NavigationContainer` in App.tsx) and `navigateFromOutside()` helper using `CommonActions.navigate` for type-safe navigation from outside React components.
- **NEW `store/deepLinkStore.ts`**: Zustand store for pending deep link intent. Stores `{ screen, params }` when user taps a notification while unauthenticated. Consumed after auth completes via `consumePendingDeepLink()`.
- **`App.tsx`**: Added `ref={navigationRef}` to `NavigationContainer`.
- **`useNotifications.ts`**: Wired `addNotificationResponseReceivedListener` to extract `{ sessionId, type }` from notification data and navigate to the correct screen:
  - `session_initiated` / `partner_b_invite` / `partner_b_reminder_*` → PartnerBEntry
  - `unpacking_ready` / `partner_viewed_unpacking` / `unpacking_unlocked` → UnpackingChoice
  - `reconnection_turn` → Reconnection
  - `post_resolution_checkin` / `manual_interview_reminder` → SessionDetail
  - Default → HomeTabs
  - If not authenticated: stores intent in deepLinkStore instead of navigating.
  - Foreground notifications: no auto-navigation (banner only).
- **`RootNavigator.tsx`**: Added `useEffect` that consumes pending deep links after `isAuthenticated && onboardingDone` become true (300ms delay for MainNavigator mount).
- TypeScript check: zero errors (`npx tsc --noEmit` clean)

### What TASK 3.1 Agent Completed (March 26 — WaitingForPartnerScreen Polling)
- **`WaitingForPartnerScreen.tsx`**: Added session status polling (5s interval via `setInterval` + refs). Reads `sessionId` from route params via `useRoute`. When `status === 'unpacking_ready'`, shows "{partner} just finished!" text for 1.5s, then navigates to `UnpackingChoice` with `{ sessionId }`. Both interval and timeout cleaned up on unmount.
- No other files modified. No new dependencies.
- TypeScript check: zero errors (`npx tsc --noEmit` clean)

### What Agent C Completed (March 26 — Frontend Regeneration UX)
- **`useUnpacking.ts`**: Added `isRegenerating` boolean state + background polling after feedback submission. Captures `updatedAt` before API call, polls `getUnpacking()` every 3s (up to 10 attempts), detects changed `updatedAt` to update state. Polling cleaned up on unmount via refs.
- **`UnpackingScreen.tsx`**: Added regenerating banner overlay (semi-transparent dark bg, ActivityIndicator + text) with FadeIn/FadeOut animation. FeedbackSheet onSubmit now closes sheet + shows "Regenerating insights..." toast. Cards auto-update when polling detects new data.
- TypeScript check: zero errors (`npx tsc --noEmit` clean)

### What Agent B Completed (March 26 — Unpacking Regeneration)
- Added `regenerateUnpackingInline()` method to `sessions.service.ts` — mirrors `generateUnpackingInline()` but includes previous unpacking output + user feedback in the prompt
- Wired into `submitUnpackingFeedback()`: captures `enqueueResult` from BullMQ enqueue, falls back to inline regeneration when `enqueued === false` (fire-and-forget pattern)
- Removed stale TODO comment block (~15 lines) in `calculateSessionStatus()` about notifications — `notifyUnpackingReady()` is already implemented
- TypeScript check: zero errors (`npx tsc --noEmit` clean)

### What Was Done This Session (March 24, Session 8 — RelateApp_Fixing)

**HomeScreen Fixes:**
- Removed "Together X days" display (not useful until datingStartDate collected)
- Removed Quick Actions section (Learnings, Send Partner Note, Check In)
- Name truncation: added `maxWidth: '80%'` to helloText
- Love Bank: replaced rotating quotes with single personalized quote using partner name
- Cleaned up unused imports (Dimensions, formatDate, BookOpen, MessageCircle, Zap, lightTap, RNAnimated)

**Auth Fixes:**
- #7: RegisterScreen now uses `onboardingStore.firstName` for name (not email prefix)
- #5: New `POST /couples/validate-invite` public endpoint (no JWT required). AcceptInviteScreen calls this for unauthenticated users, stores token in `onboardingStore.pendingInviteToken`. After registration + consent, OnboardingNavigator calls `acceptInvite()` with stored token.
- #13: JWT expiry extended from 7d to 30d. 401 interceptor now resets Zustand auth store (not just SecureStore), causing redirect to login.

**Onboarding Fixes:**
- #8: AgreementScreen — removed partner wait polling. Sign and proceed immediately.
- #9: Tutorial screens bypassed — Agreement → finishOnboarding directly.
- #2: PartnerDetails "Where did you meet" converted from 8 pills to free text. Repositioned to step 0 (after name/gender). TOTAL_STEPS 4→3.

**Interview/Session Fixes:**
- #14: First AI message now shows thinking indicator for 1.5s before appearing.
- #19: AI system prompt rewritten for natural conversational tone (friend, not therapist).
- #20: Random thinking delay (0.8-2.0s) before AI responses.
- #15: Multi-message splitting — 2-3 sentence responses split into separate bubbles with 600-1000ms delay.
- #21: InterviewCompleteScreen copy rewritten with empathy + partner name.
- #24: SessionCard shows `topicTag || topic || context || 'Open conversation'` instead of "Untitled session".

**Research Docs Created:**
- `docs/ONBOARDING_QUESTIONS.md` — All 11 onboarding questions across 5 screens (13 store fields)
- `docs/ANIMATION_RECOMMENDATIONS.md` — 3 splash + 3 connected animation concepts with full specs
- Congratulations + Notification screen design specs (in agent transcripts)

### What Was Done Previously (March 24, Session 7 — App Store Compliance)

**Phase 0 — Quick Fixes:**
- `app.json`: userInterfaceStyle dark→light, splash bg #1A1412→#FAF7F4, android bg same
- `Info.plist`: UIUserInterfaceStyle Dark→Light
- `PromiseScreen.tsx`: Added "not a therapist" disclaimer text below subtitle
- `LegalDocumentModal.tsx`: OpenAI→Anthropic in Privacy Policy data sharing section
- `legal/privacy-policy.md`: Added "AI processing provider (Anthropic)" to data sharing list
- `PrivacyInfo.xcprivacy`: Populated NSPrivacyCollectedDataTypes with EmailAddress, Name, OtherUserContent, OtherDiagnosticData

**Phase 1 — AI Consent Modal (Apple 5.1.2(i)):**
- Schema: `aiConsentAgreedAt DateTime?` on User model
- Migration: `20260324031640_add_ai_consent_and_soft_delete`
- Backend: `POST /auth/ai-consent` endpoint + `recordAiConsent()` service method
- Frontend: `recordAiConsent()` API call in `services/auth.ts`
- **NEW** `AIConsentModal.tsx`: pageSheet modal explaining Anthropic/Claude AI processing, checkbox + agree/decline
- `PreSessionReminderScreen.tsx`: Checks SecureStore for `ai_consent_${userId}`, shows AIConsentModal on first session, blocks on "Not Now"

**Phase 2 — Account Deletion:**
- Schema: `deletedAt DateTime?` on User model (same migration)
- Backend: `DELETE /auth/account` endpoint + `deleteAccount()` with cascading delete (interviews→sessions→couples→consent logs→soft-delete user with PII wipe)
- Frontend: `deleteAccount(reason?)` API call in `services/auth.ts`
- **NEW** `DeleteAccountScreen.tsx`: Warning card, optional reason input, confirmation Alert, SecureStore cleanup, auth reset
- `MainNavigator.tsx`: Added `DeleteAccount` screen + route type

**Phase 3 — Settings Wireup:**
- `SettingsScreen.tsx`: Privacy section now has: Privacy Policy (→LegalDocumentModal), Terms of Service (→LegalDocumentModal), AI Data Processing status, Delete Account (→DeleteAccountScreen)
- About section: Crisis Resources (→CrisisResourcesModal), Contact Support (→mailto), About Relate with version

**Phase 4 — Demo Seed:**
- **NEW** `backend/scripts/seed-demo.ts`: Creates 2 demo users (demo-alex@relate.app / demo-jordan@relate.app, pass: DemoPass123!), linked couple with agreement, 1 completed session with 6 Q&A interviews each
- Added `"seed:demo"` script to `backend/package.json`

### What Needs Testing
- PromiseScreen disclaimer text visible
- First session: AIConsentModal appears → Agree → proceeds to Interview
- AI consent "Not Now": returns to previous screen, session blocked
- Settings → Privacy Policy / ToS → modals open correctly
- Settings → Crisis Resources → modal opens
- Settings → Delete Account → warning → confirm → logged out → back to onboarding
- `cd backend && npm run seed:demo` → 2 accounts created with session data
- Light theme in app.json + Info.plist (rebuild Xcode project)
- All previous test items (animations, keyboard Done bar, gender-aware AI, Partner B flow)

---

## Completed Work

### [2026-03-23] Rework Onboarding for De-escalation (Session 6)

**Problem:** Onboarding had too many free-text screens (RelationshipStory, LoveBank) that caused drop-off and didn't help AI de-escalate conflicts. YourPlanScreen was unnecessary.

**Research:** Analyzed Gottman Method, EFT, attachment theory, and apps like BetterHelp/Lasting/Paired. Identified 8 Tier-1 data points for real-time conflict de-escalation.

**Changes:**
- **Deleted:** `YourPlanScreen.tsx` (removed entirely)
- **Removed from flow:** RelationshipStory, LoveBank screens (files still exist, just not in navigator)
- **PartnerDetailsScreen:** Added 4th sub-step "Where did you first meet?" with 8 selection options (dating app, through friends, work/school, bar/restaurant, event/party, online, through family, somewhere else). Stores in `howMet` field.
- **OnboardingNavigator:** Simplified to 5 quiz screens. Removed RelationshipStory/LoveBank/YourPlan imports and screen definitions. Updated PROGRESS_SCREENS. Auth check moved to ConflictPreferences (last quiz screen).

**New flow:**
```
Pre-auth:  Splash → Promise → YourName → CommunicationStyle → ConflictFeelings
           → PartnerDetails (4 sub-steps) → ConflictPreferences → [CreateAccount]
Post-auth: Consent → InvitePartner → WaitingForPartner → Connected → Agreement → Tutorial
```

**De-escalation data collected (all selection-based):**
1. User's conflict role (communicationStyles) → pursuer/withdrawer identification
2. User's triggers (conflictFeelings) → real-time warning system
3. Partner's conflict role (partnerCommunicationStyles) → negative cycle mapping
4. Partner's triggers (partnerConflictFeelings) → empathy coaching
5. How they met (howMet) → relationship context
6. Resolution speed (resolutionSpeed) → timeout protocol
7. Attachment style (attachmentStyle) → underlying fear identification
8. Conflict patterns (pastConflictPatterns) → Horsemen intervention

**Verification:** Zero TypeScript errors.

---

### [2026-03-23] Calming Animation System (Session 5)

**Goal:** Make the app feel safe, warm, and alive through gentle animations inspired by Calm/Headspace patterns.

**ChatBubble.tsx — Entrance Animations:**
- AI messages: `FadeIn.duration(400).delay(100)` — gentle center fade
- User messages: `FadeInRight.duration(300).springify().damping(15).stiffness(100)` — slide from right
- Partner messages: `FadeInLeft` with same spring config — slide from left
- New `index` prop for stagger delay (index * 50ms) during history load

**TypingIndicator.tsx — Breathing Pulse (replaces bouncing dots):**
- Center circle (24px): orangeLight, scales 0.85→1.15 over 3s breathing cycle
- Inner ripple ring (36px): orangeGlow border, 200ms delay
- Outer ripple ring (48px): orangeTint border, 400ms delay
- Opacity oscillates in sync with scale (0.6→1.0 center, 0.4→0.7 rings)
- "relate" label below circle matches ChatBubble branding

**EmotionPill.tsx — Spring Micro-interaction:**
- Scale spring to 1.08 on press (damping 12, stiffness 200), back to 1 after 100ms
- AnimatedPressable wraps existing Pressable for native thread animation

**ProgressBar.tsx — Animated Width + Glow:**
- Width animates with `withTiming(400ms, Easing.out(cubic))` on progress change
- Glow pulse: scaleY 1→1.5→1 when progress increases (not decreases)
- AnimatedLinearGradient wraps expo LinearGradient

**InterviewScreen.tsx — Safe Space Entry + Send Button:**
- Safe badge: opacity fade-in (delay 300ms, 500ms) + lock icon rotation (-10°→0° spring)
- Prompt section: FadeInDown.duration(600).delay(400)
- Send button: opacity fade (200ms) instead of instant conditional render
- `pointerEvents` toggled to prevent phantom taps when invisible
- Passes `index` to ChatBubble for stagger

**CommunicationStyleScreen + ConflictFeelingsScreen — Pill + Button:**
- New `PillOption` component with scale spring on press (0.95→1 spring)
- Continue button: hidden when no selection, slides up with FadeInUp.springify().damping(14)

**WaitingForPartnerScreen.tsx — Floating Orbs:**
- orbContainer gets translateY oscillation (-6px to +6px, 4s cycle)
- Combines with existing pulse animations for layered motion

**MainNavigator.tsx — Screen Transitions:**
- Interview: `animation: 'fade', animationDuration: 400` (gentle private space entry)
- PartnerBEntry: `animation: 'fade', animationDuration: 350`

**Files modified (10):**
1. `components/domain/ChatBubble.tsx` — entrance animations + index prop
2. `components/domain/TypingIndicator.tsx` — breathing pulse rewrite
3. `components/ui/EmotionPill.tsx` — spring micro-interaction
4. `components/ui/ProgressBar.tsx` — animated width + glow
5. `screens/interview/InterviewScreen.tsx` — safe badge, send fade, index pass
6. `screens/onboarding/CommunicationStyleScreen.tsx` — pill spring + button entrance
7. `screens/onboarding/ConflictFeelingsScreen.tsx` — pill spring + button entrance
8. `screens/onboarding/WaitingForPartnerScreen.tsx` — floating orbs
9. `navigation/MainNavigator.tsx` — fade transitions

**Verification:** Zero TypeScript errors.

---

### [2026-03-23] Expand Pre-Signup Onboarding (Session 4)

**Problem:** Only 3 quiz screens before signup. Research shows 6-10 pre-signup screens is optimal for conversion in relationship/health apps.

**Solution:** Moved 4 existing post-auth screens (RelationshipStory, PartnerDetails, LoveBank, ConflictPreferences) before CreateAccount. These screens make zero API calls — they only write to Zustand onboardingStore, so no backend changes needed.

**New screen: YourPlanScreen.tsx (~270 lines)**
- Loading animation → personalized plan reveal
- Shows communication style tags, attachment style, relationship profile, first session focus
- CTA: "Save your profile & get started" (frames signup as saving, not registering)
- If authenticated (User B): CTA says "Continue", skips CreateAccount

**OnboardingNavigator.tsx changes:**
- Screen order: ...ConflictFeelings → RelationshipStory → PartnerDetails → LoveBank → ConflictPreferences → YourPlan → CreateAccount → Consent → InvitePartner...
- Auth check moved from ConflictFeelings to YourPlan
- Consent now navigates to InvitePartner (User A) or Connected (User B) — no longer routes to RelationshipStory/PartnerDetails
- Progress bar: endowed progress effect (starts at 15%)
- Added `YourPlan: undefined` to `OnboardingStackParamList`

**Flow (new):**
```
Pre-auth:  Splash → Promise → YourName → CommunicationStyle → ConflictFeelings
           → RelationshipStory → PartnerDetails → LoveBank → ConflictPreferences
           → YourPlan → [CreateAccount]
Post-auth: Consent → InvitePartner → WaitingForPartner → Connected → Agreement → Tutorial
```

**Verification:** Zero TypeScript errors.

---

### [2026-03-22] Partner B Entry Flow (Full Implementation)

**Database:**
- Migration `20260323001815_add_partner_b_entry_fields` applied
- 4 new fields on Session: `topicTag`, `topicTagGeneratedAt`, `partnerBSnoozedUntil`, `partnerAExtraction`

**Backend (sessions.service.ts — 1116 lines):**
- State machine: `awaiting_partner_b` added to `ALLOWED_TRANSITIONS` (initiated→, in_progress→, awaiting_partner_b→)
- `calculateSessionStatus()`: Returns `awaiting_partner_b` when initiator completes but partner hasn't
- `validStatuses` array updated to include `awaiting_partner_b`
- `submitInterview()`: Post-interview trigger extracts Partner A context, notifies Partner B, schedules reminders
- `saveDraftInterview()`: Notifies Partner A when Partner B starts sharing (first draft save)
- New methods: `notifyPartnerBInvite()`, `schedulePartnerBReminders()` (4h/24h/72h), `notifyPartnerAStarted()`
- New methods: `getPartnerBContext()`, `snoozePartnerBInvite()` (2h snooze)
- Added `InterviewAIService` to constructor DI

**Backend (sessions.controller.ts — 159 lines):**
- `GET :id/partner-b-context` endpoint
- `POST :id/snooze` endpoint
- `getNextQuestion` updated: context-aware for Partner B using `generateNextQuestionWithContext()`

**Backend (interview-ai.service.ts — 152 lines):**
- `PartnerAExtraction` interface (topicTag, issues, needs, emotions)
- `extractPartnerAContext()`: gpt-4o-mini, temperature 0.3, JSON response format
- `generateNextQuestionWithContext()`: Appends context block to system prompt for Partner B

**Frontend types:**
- `SessionStatus` union includes `'awaiting_partner_b'`
- `Session` interface has `topicTag`, `topicTagGeneratedAt`
- `PartnerBContext` interface in `api.ts`

**Frontend (PartnerBEntryScreen.tsx — 209 lines, NEW):**
- Shows initiator avatar, headline, topic tag (italic orange), privacy note (lock icon)
- CTA: "Share how you're feeling" / "Continue sharing" (if draft exists)
- Snooze: "Not ready yet? Remind me later"
- Loading/error states handled

**Frontend (sessions.ts service):**
- `getPartnerBContext()` → GET /sessions/:id/partner-b-context
- `snoozePartnerBInvite()` → POST /sessions/:id/snooze

**Frontend (MainNavigator.tsx — 200 lines):**
- `PartnerBEntry: { sessionId: string }` registered
- `Interview` params: added optional `partnerBOpeningMessage`
- PartnerBEntry screen passes opening message to Interview on CTA tap

**Frontend (InterviewScreen.tsx):**
- Accepts `partnerBOpeningMessage?` prop, passes to `useInterview`

**Frontend (useInterview.ts — 248 lines):**
- Accepts optional `partnerBOpeningMessage` parameter
- Uses it as initial AI message when starting fresh (no existing interview)

**Frontend (HomeScreen.tsx — 701 lines):**
- Partner B sees "Share my side" card → navigates to PartnerBEntry
- Partner A sees "Waiting for {partnerName} to share their side"
- Badge shows "Awaiting Partner" vs "In Session"
- Topic display prefers `topicTag`

**Frontend (StatusBadge.tsx, SessionDetailScreen.tsx):**
- Added `awaiting_partner_b` entries (label: "Awaiting Partner")

**Verification:** Zero TypeScript errors in both frontend and backend.

---

### [2026-03-22] Gender-Aware Supportive Language (Session 2)

**Backend (interview-ai.service.ts):**
- Renamed `SYSTEM_PROMPT` → `BASE_SYSTEM_PROMPT`, added `buildSystemPrompt(gender)` function
- 3 gender tone blocks: male (coach-like), female (validation-first), neutral (warm inclusive)
- Both `generateNextQuestion()` and `generateNextQuestionWithContext()` accept optional gender param
- Controller passes `req.user.gender` to AI service

**Backend (auth.service.ts):**
- `register()`, `login()`, `validateUser()` now return `gender` field

**Frontend:**
- `UserSummary` type includes `gender?: string`
- NEW: `frontend/src/utils/genderCopy.ts` — centralized gender-aware copy utility
- `useInterview` hook accepts gender param, uses `getGenderCopy()` for all strings
- `InterviewScreen` uses gender-aware loading, prompt, placeholder text
- `WaitingForPartnerScreen` uses gender-aware affirmation cards
- `PreSessionReminderScreen` uses gender-aware headline

### [2026-03-22] Onboarding Reorder: Quiz-First, Signup-Later (Session 2)

**RootNavigator.tsx:**
- Logic changed: `!onboardingDone` → OnboardingNavigator (regardless of auth)
- `!isAuthenticated && onboardingDone` → AuthNavigator (returning users only)
- `isAuthenticated && onboardingDone` → MainNavigator

**OnboardingNavigator.tsx:**
- New flow: Splash → Promise → YourName → CommunicationStyle → ConflictFeelings → CreateAccount → Consent → RelationshipStory → ...
- Added `CreateAccount` and `Login` screens (reuse RegisterScreen/LoginScreen)
- ConflictFeelings checks `isAuthenticated` — skips CreateAccount if already auth'd (User B via invite)
- Consent `onContinue` handles User B skip logic (→ PartnerDetails instead of RelationshipStory)

**YourNameScreen.tsx:**
- Removed premature `updateProfile()` call (runs pre-auth now)
- Data stored only in onboardingStore; profile updated during `finishOnboarding()`

### [2026-03-23] Keyboard Done Bar Consistency (Session 3)

**Problem:** AcceptInviteScreen (and 5 other screens) had no iOS "Done" button above the keyboard. Users couldn't dismiss the keyboard without tapping outside — especially bad on screens with multiline TextInputs (StartSessionScreen, profile LoveBankScreen).

**Fix:** Added `KeyboardDoneBar` component + `inputAccessoryViewID={KEYBOARD_DONE_ID}` to every Input/TextInput across 6 screens:
1. `AcceptInviteScreen.tsx` — invite code input
2. `RegisterScreen.tsx` — email + password inputs
3. `LoginScreen.tsx` — email + password inputs
4. `ForgotPasswordScreen.tsx` — email input
5. `StartSessionScreen.tsx` — multiline topic description
6. `profile/LoveBankScreen.tsx` — new entry + edit entry multiline inputs

**Already had KeyboardDoneBar (no change needed):**
- YourNameScreen, onboarding/LoveBankScreen, PartnerDetailsScreen, RelationshipStoryScreen

**Intentionally no Done bar (chat pattern):**
- InterviewScreen (returnKeyType="send"), ReconnectionScreen (chat interface)

**Verification:** Zero TypeScript errors.

### [2026-03-26] Agent A: Worker regenerate-unpacking handler (Complete)

**Files modified:**
1. `workers/src/queues/unpacking.queue.ts` — Added `RegenerateUnpackingJobData` interface with sessionId, unpackingId, feedbackReason, feedbackText, previousUnpacking, partnerAResponses, partnerBResponses
2. `workers/src/services/openai.service.ts` — Added `regenerateUnpacking()` method with feedback-aware prompt (includes previous output, maps feedbackReason to human-readable text, optional feedbackText). Same model/temperature/schema as `generateUnpacking()`.
3. `workers/src/processors/unpacking.processor.ts` — `processJob()` now routes by `job.name`: `regenerate-unpacking` → `processRegenerateJob()`, default → `processGenerateJob()`. Regenerate handler extracts feedback data, calls `openAIService.regenerateUnpacking()`, upserts DB with same field mapping. Same retry policy (3 attempts, exponential backoff).

**Verification:** `npx tsc --noEmit` — zero errors.

### What TASK 3.6 Agent Completed (March 26 — ReconnectTab Active Session Routing)
- **`ReconnectTabScreen.tsx`**: Complete rewrite from static empty state to dynamic 3-state screen:
  1. **Active reconnection**: Fetches sessions via `getSessions()`, filters `status === 'reconnection'`. Shows card with topic, partner name, status text, and "Continue Reconnection" orange CTA button that navigates to `Reconnection` screen.
  2. **Past reconnections**: Filters `status === 'resolved'`, sorted by updatedAt desc. Each card shows topic, resolved date, checkmark icon. Tappable → `SessionDetail` with `{ id }`.
  3. **Empty state**: Original empty state preserved for when no sessions exist.
- Loading state: ActivityIndicator while fetching. Pull-to-refresh via RefreshControl.
- Uses auth store for partner name resolution from couple data.
- No new files or dependencies added.
- TypeScript check: zero new errors (2 pre-existing in useInterview.ts and useNotifications.ts, unrelated)

## In Progress
- Nothing currently in progress

## Blocked
- Nothing currently blocked

## Next Actions
- Manual test: "I have a partner code" flow (unauthenticated → validate → quiz → register → accept)
- Manual test: Agreement screen → sign → proceeds immediately (no partner wait)
- Manual test: Interview first AI message appears with 1.5s thinking delay
- Manual test: AI responds naturally (multi-message, thinking delay, conversational tone)
- Manual test: InterviewComplete screen shows updated copy with partner name
- Manual test: SessionCard shows topic tag instead of "Untitled session"
- Manual test: HomeScreen shows personalized love bank quote with partner name
- Manual test: No "Together X days" on homepage, no quick actions
- Manual test: PartnerDetails "Where did you meet" is free text (3 steps total)
- Implement splash screen animation (3 concepts in docs/ANIMATION_RECOMMENDATIONS.md)
- Implement connected screen animation (3 concepts in docs/ANIMATION_RECOMMENDATIONS.md)
- Implement congratulations + notification permission screens (specs in agent transcripts)
- Manual test all previous items (App Store compliance, animations, keyboard, gender AI, Partner B)
