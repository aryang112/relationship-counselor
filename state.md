# Relate App — State File

> Updated by every agent/subagent. Append-only with timestamps.
> This is the handoff document between all agents.

---

## Current Status

**Branch:** `database-implementation`
**Last updated:** 2026-03-25 (Agent C — Sprint 2, Task 2.1)
**Last agent:** Agent C (inline unpacking fallback)

### What's Active
- All features compiling (zero new TypeScript errors — pre-existing smart quote issue on line 1080 of sessions.service.ts)
- Sprint 2 Task 2.1 complete: inline unpacking fallback when Redis unavailable
- 20/20 fixing tasks complete
- Research docs created for splash/connected animations, congratulations/notifications screens
- Ready for manual testing

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
