# Relate App — Codemap

> Maps every significant file/module with its purpose, exports, and dependencies.
> Agents read this FIRST instead of scanning the entire codebase.
> Last updated: 2026-03-22

---

## Project Structure

```
relate/
├── backend/                    # NestJS API server
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (User, Couple, Session, Interview, Unpacking, ConsentLog)
│   ├── src/
│   │   ├── auth/               # JWT auth (login, register, consent)
│   │   ├── modules/
│   │   │   ├── couples/        # Partner invitation, agreement signing
│   │   │   ├── sessions/       # Core session flow (see below)
│   │   │   ├── notifications/  # Push + email notifications, delayed queue
│   │   │   └── unpacking/      # Unpacking generation queue
│   │   └── prisma.service.ts   # Prisma client singleton
│   └── test/                   # E2E tests
├── frontend/                   # React Native / Expo
│   ├── src/
│   │   ├── components/         # UI components (layout, ui, domain, feedback)
│   │   ├── hooks/              # Custom hooks (useInterview, useSession, useAuth, etc.)
│   │   ├── navigation/         # React Navigation (MainNavigator, OnboardingNavigator)
│   │   ├── screens/            # All screens organized by feature
│   │   ├── services/           # API service functions
│   │   ├── store/              # Zustand stores (auth, session, ui, onboarding)
│   │   ├── theme/              # Design system (colors, typography, spacing, shadows)
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Utilities (haptics, format, validation)
│   └── App.tsx                 # Root component
├── workers/                    # BullMQ processors (unpacking, interview, crisis)
├── AGENT_HANDBOOK.md           # Comprehensive project reference (READ FIRST)
├── AgentInstructions.md        # Agent workflow rules
├── state.md                    # Working memory (append-only, current status)
├── tasks/
│   ├── lessons.md              # Learnings from corrections
│   └── todo.md                 # Task plans with checkable items
└── docs/
    └── CODEMAP.md              # This file
```

---

## Backend — Sessions Module (Core)

### `backend/src/modules/sessions/sessions.service.ts` (~1116 lines)
**Purpose:** Core session lifecycle management.
**Key exports:** `SessionsService`
**Dependencies:** PrismaService, CouplesService, UnpackingQueueService, NotificationsService, NotificationsQueueService, InterviewAIService

**State Machine (`ALLOWED_TRANSITIONS`):**
```
initiated → [in_progress, awaiting_partner_b, abandoned]
in_progress → [awaiting_partner_b, unpacking_ready, abandoned]
awaiting_partner_b → [in_progress, unpacking_ready, abandoned]
unpacking_ready → [reconnection, abandoned]
reconnection → [resolved, abandoned]
resolved → []
abandoned → []
```

**Key Methods:**
| Method | Description |
|--------|-------------|
| `startSession()` | Creates session, notifies partner, schedules reminders |
| `submitInterview()` | Finalizes interview, calculates next status, triggers extraction/notifications |
| `saveDraftInterview()` | Auto-save draft, notifies Partner A when B starts |
| `getSession()` | Returns session with sanitized interviews (no responses) |
| `getSessionStatus()` | Returns completion status per partner |
| `calculateSessionStatus()` | Determines next status from completed interviews |
| `getPartnerBContext()` | Returns context for Partner B entry (topic, opening message, AI context) |
| `snoozePartnerBInvite()` | 2h snooze with auto-reminder |
| `notifyPartnerBInvite()` | Push+email invite to Partner B |
| `schedulePartnerBReminders()` | 4h/24h/72h timed reminders |
| `notifyPartnerAStarted()` | Notifies initiator when Partner B begins |
| `remindPartnerToParticipate()` | Manual reminder (12h cooldown) |
| `getUnpacking()` / `setUnpackingChoice()` / `unlockUnpacking()` | Unpacking lock system |
| `submitUnpackingFeedback()` | Regeneration with feedback context |

### `backend/src/modules/sessions/sessions.controller.ts` (~159 lines)
**Purpose:** REST API endpoints for sessions.

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/sessions` | startSession |
| GET | `/sessions` | getAllSessions |
| GET | `/sessions/:id` | getSession |
| POST | `/sessions/:id/interview` | submitInterview |
| POST | `/sessions/:id/interview/next-question` | getNextQuestion (context-aware for Partner B) |
| PATCH | `/sessions/:id/interview/draft` | saveDraftInterview |
| GET | `/sessions/:id/interview` | getInterview |
| GET | `/sessions/:id/status` | getSessionStatus |
| PATCH | `/sessions/:id/status` | updateSessionStatus |
| GET | `/sessions/:id/unpacking` | getUnpacking |
| PATCH | `/sessions/:id/unpacking/choice` | setUnpackingChoice |
| POST | `/sessions/:id/unpacking/unlock` | unlockUnpacking |
| POST | `/sessions/:id/unpacking/feedback` | submitUnpackingFeedback |
| GET | `/sessions/:id/partner-b-context` | getPartnerBContext |
| POST | `/sessions/:id/snooze` | snoozePartnerBInvite |
| POST | `/sessions/:id/remind-partner` | remindPartner |

### `backend/src/modules/sessions/interview-ai.service.ts` (~152 lines)
**Purpose:** AI-powered interview question generation and context extraction.
**Dependencies:** OpenAI API (gpt-4o-mini)

| Method | Description |
|--------|-------------|
| `generateNextQuestion(history, gender?)` | Gender-aware follow-up question from conversation history |
| `generateNextQuestionWithContext(history, context, gender?)` | Context-aware + gender-aware questions for Partner B |
| `buildSystemPrompt(gender)` | Builds system prompt with gender-specific tone block (male/female/neutral) |
| `extractPartnerAContext()` | Extracts topicTag, issues, needs, emotions from Partner A responses |

### `backend/src/auth/auth.controller.ts` + `auth.service.ts`
**Purpose:** Authentication, consent, and account management.

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/auth/register` | register |
| POST | `/auth/login` | login |
| GET | `/auth/me` | getMe (JWT validated) |
| PATCH | `/auth/profile` | updateProfile |
| POST | `/auth/consent` | recordConsent (ToS/Privacy) |
| GET | `/auth/consent-status` | getConsentStatus |
| POST | `/auth/ai-consent` | recordAiConsent (Apple 5.1.2(i)) |
| DELETE | `/auth/account` | deleteAccount (cascading soft-delete) |

### `backend/scripts/seed-demo.ts`
**Purpose:** Demo seed for App Store review. Creates 2 users, couple, completed session.
**Usage:** `cd backend && npm run seed:demo`
**Credentials:** `demo-alex@relate.app` / `demo-jordan@relate.app` (DemoPass123!)

---

## Frontend — Key Files

### Navigation
- **`RootNavigator.tsx`**: Top-level gate. `!onboardingDone` → OnboardingNavigator (quiz-first), `!isAuthenticated && onboardingDone` → AuthNavigator, `isAuthenticated && onboardingDone` → MainNavigator
- **`OnboardingNavigator.tsx`**: De-escalation-focused flow. Splash → Promise → YourName → CommunicationStyle → ConflictFeelings → PartnerDetails (4 sub-steps) → ConflictPreferences → CreateAccount → Consent → InvitePartner → ... → Tutorial. 5 quiz screens (all selection-based) before signup. CreateAccount/Login embedded inline.
- **`MainNavigator.tsx`** (~200 lines): Stack + bottom tabs. Screens: HomeTabs, SessionDetail, StartSession, StartMediation, PreSessionReminder, WaitingForPartner, **PartnerBEntry**, Interview, InterviewComplete, UnpackingChoice, Unpacking, Reconnection, Commitments, Settings, **DeleteAccount**, Profile, UsProfile, LoveBank, LearningsHistory

### Screens — Session Flow
- **`PartnerBEntryScreen.tsx`** (209 lines, NEW): Partner B invite screen with topic tag, privacy note, CTA, snooze
- **`InterviewScreen.tsx`** (~353 lines): Pi-style chat interface for private vent. Accepts optional `partnerBOpeningMessage`
- **`StartMediationScreen.tsx`**: Session creation entry point
- **`PreSessionReminderScreen.tsx`**: Safety reminder before interview
- **`WaitingForPartnerScreen.tsx`**: Partner A waiting state
- **`SessionDetailScreen.tsx`**: Session overview with status labels

### Components — Domain
- **`AIConsentModal.tsx`** (NEW): Apple 5.1.2(i) AI consent modal. Explains Anthropic/Claude AI data processing, checkbox confirmation, agree/decline callbacks.
- **`LegalDocumentModal.tsx`**: Full-screen ToS/Privacy Policy display. References Anthropic (not OpenAI).
- **`CrisisResourcesModal.tsx`**: 4 crisis hotlines + therapist finder.

### Screens — Settings
- **`SettingsScreen.tsx`**: Settings with Privacy section (Privacy Policy, ToS, AI Data Processing, Delete Account) + About section (Crisis Resources, Contact Support, About Relate). Opens LegalDocumentModal and CrisisResourcesModal.
- **`DeleteAccountScreen.tsx`** (NEW): Destructive account deletion with warning card, optional reason, confirmation Alert, cascading cleanup (SecureStore + API + auth reset).

### Screens — Dashboard
- **`HomeScreen.tsx`** (~701 lines): Main dashboard. Shows hero gradient, active session card (with Partner B routing), love bank quotes, recent sessions, quick actions

### Hooks
- **`useInterview.ts`** (~248 lines): Chat state machine. Manages messages, auto-save drafts, AI follow-up questions, completion. Accepts optional `partnerBOpeningMessage` for custom first message.
- **`useSession.ts`**: Session list hook (`useSessionList`)
- **`useAuth.ts`**: Auth flow hook

### Services
- **`sessions.ts`**: `createSession`, `getSessions`, `getSession`, `getSessionStatus`, `updateSessionStatus`, `remindPartner`, **`getPartnerBContext`**, **`snoozePartnerBInvite`**
- **`interviews.ts`**: `getInterview`, `submitInterview`, `saveDraft`, `getNextQuestion`, `transcribeAudio`
- **`auth.ts`**: Login, register, consent, invite, **`recordAiConsent`**, **`deleteAccount`** functions
- **`api.ts`**: Axios instance with auth interceptor, base URL resolution

### Utilities
- **`genderCopy.ts`** (NEW): Centralized gender-aware UI copy. `getGenderCopy(gender)` returns male/female/neutral text for loading, prompts, affirmations, etc.

### Types
- **`session.ts`**: `SessionStatus` (includes `awaiting_partner_b`), `Session` (includes `topicTag`, `topicTagGeneratedAt`), `Interview`, `InterviewResponse`, `Unpacking`
- **`api.ts`**: `PartnerBContext`, `ConsentStatusResponse`, `TranscriptionResponse`, etc.
- **`user.ts`**: `UserSummary` (includes `gender?`), `RegisterRequest`, `LoginRequest`

---

## Database Schema

### Session Model (key fields)
```
id, coupleId, status, initiatedBy, topic, context,
topicTag (VARCHAR 50), topicTagGeneratedAt, partnerBSnoozedUntil, partnerAExtraction (JSONB),
unpackingReadyAt, unpackingAutoUnlockAt, unpackingWaitUserA/B,
manualReminderSentAt, createdAt, updatedAt
```

### Session Statuses
`initiated` → `in_progress` → `awaiting_partner_b` → `unpacking_ready` → `reconnection` → `resolved`
(Any active status can → `abandoned`)

### User Model (key fields)
```
id, email, password, name, gender, onboardingData, timezone,
tosVersionAgreed, privacyVersionAgreed, consentAgreedAt, aiConsentAgreedAt,
dateOfBirthConfirmed, isMinorFlagged, deletedAt, createdAt, updatedAt
```

### PartnerAExtraction (JSON shape)
```json
{
  "topicTag": "household responsibilities",
  "issues": ["unequal chore distribution", "feeling unappreciated"],
  "needs": ["acknowledgment", "shared responsibility"],
  "emotions": ["frustrated", "overwhelmed", "lonely"]
}
```
