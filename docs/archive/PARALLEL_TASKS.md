# Parallel Task Plan - Claude & Codex

**Goal:** Both agents work simultaneously with zero file conflicts.
**Rule:** Each agent owns exclusive directories/files. No overlapping.

**Reality check:** Backend is ~87% complete. Sessions, interviews, unpacking, notifications, crisis detection workers, and transcription are all built. The frontend is 0% — that's where both agents should spend their time.

---

## Phase 0: Project Init (Run Once, Either Agent)

Before any parallel work, one agent must bootstrap the Expo project:

```bash
cd frontend
npx create-expo-app@latest . --template blank-typescript
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar expo-av expo-haptics expo-secure-store \
  react-native-reanimated react-native-gesture-handler \
  @react-navigation/native @react-navigation/native-stack
npm install zustand axios @tanstack/react-query react-hook-form zod \
  lucide-react-native react-native-mmkv
```

**Owner:** Whoever starts first
**Time:** 15 minutes

---

## Phase 1: Codex — Backend Quick Fixes (~1.5 hours)

Codex knocks out the **3 remaining backend gaps** before joining frontend.

### BF1: Backend Fixes (Codex only)
**Time:** 1-1.5 hours | **No dependencies**
**Files:**
```
backend/src/modules/sessions/dto/submit-unpacking-feedback.dto.ts
backend/test/setup.ts OR backend/test/test-helpers.ts
backend/src/modules/sessions/sessions.controller.ts
backend/src/modules/sessions/sessions.service.ts
```

**Tasks:**
- [ ] **TASK-B9**: Add validation — if feedback reason is `other`, require `feedbackText`
- [ ] **TASK-I3**: Fix test cleanup ordering — delete unpackings before sessions
- [ ] **TASK-B3**: Add `POST /sessions/:id/remind-partner` endpoint with rate limiting

Once done, Codex moves to **Phase 2** frontend work.

---

## Phase 2: Both Agents Build Frontend (In Parallel)

Both agents work inside `frontend/src/` with **strictly divided file ownership**.

### Shared Foundation (Claude builds first, Codex uses)

Claude builds the foundation layer that both agents depend on.

#### CF1: Foundation Layer (Claude)
**Time:** 2-3 hours | **Blocks:** Everything else in Phase 2
**Files (Claude owns):**
```
frontend/src/theme/colors.ts
frontend/src/theme/typography.ts
frontend/src/theme/spacing.ts
frontend/src/theme/index.ts
frontend/src/types/api.ts
frontend/src/types/user.ts
frontend/src/types/session.ts
frontend/src/types/interview.ts
frontend/src/types/unpacking.ts
frontend/src/services/api.ts          (Axios instance + interceptors)
frontend/src/services/auth.ts         (login, register, token storage)
frontend/src/services/sessions.ts     (CRUD)
frontend/src/services/interviews.ts   (submit, drafts, transcribe)
frontend/src/services/unpacking.ts    (fetch, choice, feedback)
frontend/src/store/authStore.ts       (Zustand)
frontend/src/store/sessionStore.ts
frontend/src/store/uiStore.ts
frontend/src/utils/format.ts
frontend/src/utils/validation.ts
frontend/src/utils/haptics.ts
```

**Deliverables:**
- [ ] Theme tokens (colors, typography, spacing) with dark mode
- [ ] Typed API client with auth token injection
- [ ] Service methods for every backend endpoint
- [ ] Zustand stores for auth, sessions, and UI state
- [ ] Zod schemas for form validation
- [ ] Utility helpers (date formatting, haptics)

---

#### CF2: UI Component Library (Claude)
**Time:** 3-4 hours | **Depends on:** CF1
**Files (Claude owns):**
```
frontend/src/components/ui/Button.tsx
frontend/src/components/ui/Input.tsx
frontend/src/components/ui/Card.tsx
frontend/src/components/ui/Badge.tsx
frontend/src/components/ui/Avatar.tsx
frontend/src/components/ui/BottomSheet.tsx
frontend/src/components/ui/IconButton.tsx
frontend/src/components/ui/Divider.tsx
frontend/src/components/layout/SafeArea.tsx
frontend/src/components/layout/Container.tsx
frontend/src/components/layout/Header.tsx
frontend/src/components/layout/KeyboardAware.tsx
frontend/src/components/feedback/Toast.tsx
frontend/src/components/feedback/Skeleton.tsx
frontend/src/components/feedback/EmptyState.tsx
frontend/src/components/feedback/ErrorBoundary.tsx
frontend/src/components/feedback/LoadingScreen.tsx
```

**Deliverables:**
- [ ] Button (primary, secondary, ghost) with haptics + press animation
- [ ] Input with focus glow, error shake, label + helper text
- [ ] Card with optional status border
- [ ] Badge, Avatar (initials), BottomSheet (spring animation)
- [ ] Layout wrappers (SafeArea, Header, KeyboardAware)
- [ ] Feedback: Toast, Skeleton loader, EmptyState, ErrorBoundary

---

### After Foundation: Split Screen Work

Once CF1 + CF2 are done, both agents build screens in parallel with strict file ownership.

---

### Claude's Screens

#### CF3: Auth & Onboarding Screens (Claude)
**Time:** 4-5 hours | **Depends on:** CF1, CF2
**Files (Claude owns):**
```
frontend/src/screens/auth/LoginScreen.tsx
frontend/src/screens/auth/RegisterScreen.tsx
frontend/src/screens/auth/ForgotPasswordScreen.tsx
frontend/src/screens/onboarding/InvitePartnerScreen.tsx
frontend/src/screens/onboarding/AcceptInviteScreen.tsx
frontend/src/screens/onboarding/AgreementScreen.tsx
frontend/src/screens/onboarding/TutorialScreen.tsx
frontend/src/navigation/AuthNavigator.tsx
frontend/src/navigation/OnboardingNavigator.tsx
```

**Deliverables:**
- [ ] Login with email/password, error handling, "forgot password" link
- [ ] Register with validation, strength indicator
- [ ] Invite partner screen with share sheet (WhatsApp, SMS, email)
- [ ] Accept invite with pre-filled couple ID
- [ ] Agreement screen with dual signature UI
- [ ] 3-screen swipeable tutorial
- [ ] Auth navigator (login ↔ register)
- [ ] Onboarding navigator (invite → accept → agreement → tutorial)

---

#### CF4: Interview UI (Claude)
**Time:** 5-6 hours | **Depends on:** CF1, CF2
**Files (Claude owns):**
```
frontend/src/screens/interview/InterviewScreen.tsx
frontend/src/screens/interview/InterviewCompleteScreen.tsx
frontend/src/components/domain/ChatBubble.tsx
frontend/src/components/domain/TypingIndicator.tsx
frontend/src/components/domain/VoiceRecorderButton.tsx
frontend/src/components/domain/WaveformVisualizer.tsx
frontend/src/components/domain/PrivacyBadge.tsx
frontend/src/hooks/useInterview.ts
frontend/src/hooks/useAudioRecorder.ts
```

**Deliverables:**
- [ ] Chat-style interview with AI messages on left, user on right
- [ ] Voice record button with pulsing animation + waveform
- [ ] Audio upload → transcription → display flow
- [ ] Text input fallback
- [ ] Auto-save drafts on each response
- [ ] Resume from draft on re-entry
- [ ] "Only you can see this" privacy badge
- [ ] Exit button that saves draft
- [ ] Completion screen with encouraging message

---

#### CF5: Notifications & Polish (Claude)
**Time:** 3-4 hours | **Depends on:** CF3, CF4
**Files (Claude owns):**
```
frontend/src/hooks/useNotifications.ts
frontend/src/hooks/useAuth.ts
frontend/src/hooks/useSession.ts
frontend/src/services/notifications.ts
frontend/src/utils/deeplink.ts
frontend/app.config.ts (or app.json)
```

**Deliverables:**
- [ ] Expo push notification registration
- [ ] Deep linking (notification tap → correct screen)
- [ ] Auth hook (auto-login from stored token)
- [ ] Session hook (polling or websocket for status updates)
- [ ] App config (name, icon, splash, permissions)

---

### Codex's Screens

Codex joins frontend after BF1 backend fixes (~1.5 hours). Uses Claude's foundation (theme, components, services) as imports.

#### XF1: Dashboard & Session Screens (Codex)
**Time:** 4-5 hours | **Depends on:** CF1, CF2 (waits for Claude)
**Files (Codex owns):**
```
frontend/src/screens/dashboard/HomeScreen.tsx
frontend/src/screens/dashboard/SessionListScreen.tsx
frontend/src/screens/session/SessionDetailScreen.tsx
frontend/src/screens/session/StartSessionScreen.tsx
frontend/src/screens/settings/SettingsScreen.tsx
frontend/src/screens/settings/ProfileScreen.tsx
frontend/src/components/domain/SessionCard.tsx
frontend/src/components/domain/PartnerStatus.tsx
frontend/src/components/domain/StatusBadge.tsx
frontend/src/navigation/MainNavigator.tsx
frontend/src/navigation/RootNavigator.tsx
frontend/src/navigation/index.tsx
```

**Deliverables:**
- [ ] Home screen with active session hero + past sessions list
- [ ] Session card component with status, topic, partner progress
- [ ] Start session confirmation screen
- [ ] Session detail screen with status timeline
- [ ] Settings screen with logout, profile edit
- [ ] Main tab navigator + root navigator (auth check)

---

#### XF2: Unpacking & Reconnection Views (Codex)
**Time:** 5-6 hours | **Depends on:** CF1, CF2 (waits for Claude)
**Files (Codex owns):**
```
frontend/src/screens/unpacking/UnpackingScreen.tsx
frontend/src/screens/unpacking/UnpackingChoiceScreen.tsx
frontend/src/screens/reconnection/ReconnectionScreen.tsx
frontend/src/screens/reconnection/CommitmentsScreen.tsx
frontend/src/components/domain/InsightCard.tsx
frontend/src/components/domain/LockStateView.tsx
frontend/src/components/domain/FeedbackSheet.tsx
frontend/src/components/domain/TurnIndicator.tsx
frontend/src/components/domain/ReconnectionBubble.tsx
frontend/src/components/domain/CommitmentCard.tsx
frontend/src/hooks/useUnpacking.ts
frontend/src/hooks/useReconnection.ts
```

**Deliverables:**
- [ ] Unpacking view with expandable insight cards
- [ ] Wait/View choice screen with clear choice buttons
- [ ] Lock state views (waiting, both-waiting, auto-unlock countdown)
- [ ] Feedback bottom sheet (reason picker + text input)
- [ ] Reconnection chat with turn indicator banner
- [ ] AI guidance messages (distinct centered style)
- [ ] Message input disabled when not your turn
- [ ] Commitment cards with confirmation checkboxes

---

## Execution Timeline

```
Hour 0          Hour 1.5        Hour 5          Hour 10
  │               │               │               │
  │  CLAUDE ──────┼───────────────┼───────────────┤
  │  Phase 0      │ CF1+CF2       │ CF3: Auth     │
  │  (project     │ Foundation +  │ CF4: Interview│
  │   init)       │ Components    │ CF5: Polish   │
  │               │               │               │
  │  CODEX ───────┼───────────────┼───────────────┤
  │  BF1: Backend │ (waits for    │ XF1: Dashboard│
  │  quick fixes  │  CF1+CF2)     │ XF2: Unpacking│
  │  (1.5 hours)  │               │               │
```

**Key insight:** Codex finishes backend fixes in ~1.5 hours, then waits for Claude's foundation layer (CF1+CF2). Once those are committed, both agents build screens in parallel with zero file conflicts.

---

## Parallel Safety (No Conflicts)

| Agent  | Owns These Files | Never Touches |
|--------|-----------------|---------------|
| Claude | `frontend/src/theme/**`, `frontend/src/types/**`, `frontend/src/services/**`, `frontend/src/store/**`, `frontend/src/utils/**`, `frontend/src/components/ui/**`, `frontend/src/components/layout/**`, `frontend/src/components/feedback/**`, `frontend/src/screens/auth/**`, `frontend/src/screens/onboarding/**`, `frontend/src/screens/interview/**`, `frontend/src/hooks/useInterview.ts`, `frontend/src/hooks/useAudioRecorder.ts`, `frontend/src/hooks/useNotifications.ts`, `frontend/src/hooks/useAuth.ts`, `frontend/src/hooks/useSession.ts`, `frontend/src/navigation/AuthNavigator.tsx`, `frontend/src/navigation/OnboardingNavigator.tsx` | Codex's files |
| Codex  | `backend/**` (Phase 1 only), `frontend/src/screens/dashboard/**`, `frontend/src/screens/session/**`, `frontend/src/screens/settings/**`, `frontend/src/screens/unpacking/**`, `frontend/src/screens/reconnection/**`, `frontend/src/components/domain/**`, `frontend/src/hooks/useUnpacking.ts`, `frontend/src/hooks/useReconnection.ts`, `frontend/src/navigation/MainNavigator.tsx`, `frontend/src/navigation/RootNavigator.tsx`, `frontend/src/navigation/index.tsx` | Claude's files |

**Zero overlap.** Claude owns foundation + auth + interview screens. Codex owns dashboard + session + unpacking + reconnection screens + domain components.

---

## Context Files for Each Agent

### Claude Should Read:
- `.claude/commands/frontend.md` (design system, patterns)
- `relationship-app-detailed-design-spec.md` (user flows, wireframes)
- `PROJECT_STATUS.md` (API endpoints, what's built)
- This file (task assignments)

### Codex Should Read:
- `.claude/commands/frontend.md` (design system — Codex must follow the same design tokens)
- `relationship-app-detailed-design-spec.md` (feature specs)
- `PROJECT_STATUS.md` (API endpoints)
- `HANDOFF_NOTES.md` (backend context for BF1 fixes)
- This file (task assignments)

---

## Backend Status (Why It's Mostly Done)

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (register, login, JWT) | Done | Working with guards |
| Couples (invite, accept, agreement) | Done | Individual signatures |
| Sessions (CRUD, status machine) | Done | Full state machine |
| Interviews (submit, draft, finalize) | Done | With draft save |
| Unpacking (generate, choice, feedback, unlock) | Done | Worker + placeholder flow |
| Transcription (POST /api/transcribe) | Done | Whisper + toFile() |
| Notifications (push + email) | Done | BullMQ queue, reminders |
| Crisis detection worker | Done | Severity levels |
| Interview question worker | Done | Adaptive questions |
| Unpacking generation worker | Done | OpenAI integration |

**Remaining backend (~13%):**
- TASK-B9: Feedback `other` validation (15 min)
- TASK-I3: Test cleanup ordering (15 min)
- TASK-B3: Remind-partner endpoint (45 min)

**Deferred backend (post-MVP):**
- Reconnection coach (turn-taking chat — new feature)
- Personality profiles (new feature)
- 72-hour non-response handling (new feature)

These are new features, not gaps in the current backend. They can be built after the frontend MVP ships.

---

## Definition of Done

### Per Task:
- [ ] Code compiles without errors
- [ ] No file conflicts with other agent's work
- [ ] Follows design system in `.claude/commands/frontend.md`
- [ ] Dark mode support via theme tokens
- [ ] Loading, error, and empty states handled

### Integration:
- [ ] Frontend can complete full: register → invite → agreement → session → interview → unpacking flow
- [ ] Push notifications deliver and deep-link correctly
- [ ] Both light and dark mode work
- [ ] All existing backend endpoints have matching frontend screens
