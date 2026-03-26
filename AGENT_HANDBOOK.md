# Relate App — Agent Handbook

> **Read this entire file before writing any code.**
> This is the single source of truth for any agent working on this project.
> Last updated: March 11, 2026.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Setup & Commands](#3-setup--commands)
4. [Design System](#4-design-system)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Workers Architecture](#7-workers-architecture)
8. [API Reference](#8-api-reference)
9. [Database Schema](#9-database-schema)
10. [Coding Standards](#10-coding-standards)
11. [Agent Orchestration](#11-agent-orchestration)
12. [Task Status](#12-task-status)
13. [Recent Fixes & Lessons Learned](#13-recent-fixes--lessons-learned-march-911-2026)

---

## 1. Project Overview

**Relate** is an AI relationship mediator app. Two partners install the app, connect via invite code, and when conflict arises, each privately vents to the AI. The AI then "unpacks" both sides, revealing insights neither partner could see alone (the "magic moment"). Finally, the AI guides a reconnection conversation and helps them form commitments.

**Core Flow:**
```
Onboarding → Partner Connection → Session Start →
Phase 1: Private Vent (each partner separately) →
Phase 2: AI Unpacking (Spotify Wrapped-style reveal) →
Phase 3: Guided Reconnection (turn-based chat with AI mediator) →
Commitment / Learning Saved
```

**App name:** "relate" (always lowercase)

**AI persona:** Warm therapist meets wise friend. Never says "I understand" (hollow). Always uses specific reflections from the partners' actual words.

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│            React Native / Expo              │
│  (frontend/)                                │
│  Zustand + React Query + React Navigation   │
└───────────────┬─────────────────────────────┘
                │ REST API (Axios)
┌───────────────▼─────────────────────────────┐
│            NestJS Backend                   │
│  (backend/)                                 │
│  JWT Auth + Prisma ORM + PostgreSQL         │
│  Modules: Auth, Couples, Sessions, AI,      │
│           Notifications, Unpacking          │
└───────────────┬─────────────────────────────┘
                │ BullMQ (Redis)
┌───────────────▼─────────────────────────────┐
│            Workers                          │
│  (workers/)                                 │
│  BullMQ processors + OpenAI GPT-4 / Whisper │
│  Processors: Unpacking, Interview, Crisis   │
└─────────────────────────────────────────────┘
```

**Tech Stack:**
| Layer | Technology |
|-------|-----------|
| Frontend | React Native 0.81, Expo 54, TypeScript |
| State | Zustand (auth, session, UI, onboarding stores) |
| Data Fetching | TanStack React Query |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Styling | StyleSheet + expo-linear-gradient + react-native-reanimated |
| Backend | NestJS, Prisma ORM, PostgreSQL |
| Auth | JWT (passport-jwt) |
| Queue | BullMQ + Redis |
| AI | OpenAI GPT-4 (unpacking), Whisper (transcription) |
| Notifications | Expo Push + SMTP Email |

---

## 3. Setup & Commands

```bash
# Start database
docker compose -f docker-compose.db.yml up -d

# Backend
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev              # Start backend server

# Workers (requires Redis + OPENAI_API_KEY)
cd workers
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npx expo start

# Tests
npm run test --workspace=backend              # Unit tests (49+)
npm run test:e2e                               # E2E tests (90+)

# After schema changes
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:54320/relationship_app_test" \
  npx prisma migrate deploy && npx prisma generate

# TypeScript check (frontend)
cd frontend && npx tsc --noEmit
```

---

## 4. Design System

### Philosophy
"A warm, private therapy room between two people."
Soft morning light through frosted glass — intimate, honest, safe.

### Color Palette (Warm Light Theme)
```
Backgrounds:
  bgPrimary:     #FAF7F4   (warm off-white, main bg)
  bgSecondary:   #F2EDE6   (deeper warm white, cards/sections)
  bgElevated:    #FFFFFF   (pure white, floating elements)

Orange Accent System:
  orangeDeep:    #C45A1A   (hero areas, deep accents)
  orangeMid:     #E07832   (primary buttons, active states)
  orangeLight:   #F0A060   (hover/active accents)
  orangeGlow:    #F5C49A   (glow effects)
  orangeTint:    #FBE8D8   (subtle card backgrounds)

Text:
  textPrimary:   #1A1208   (near-black, warm undertone)
  textSecondary: #6B5A4A   (warm medium gray)
  textMuted:     #A89880   (placeholders, hints)
  textInverse:   #FFFFFF   (on dark/orange backgrounds)

Partner Identity:
  partnerA:      #E07832   (orange)
  partnerB:      #7B8FA6   (cool blue-gray)
  shared:        #9B7EC8   (soft lavender)

Semantic:
  success:       #5A8A6A   (resolution green)
  safe:          #E8F4EA   (green tint for privacy badges)
  warning:       #F0B84A
  error:         #E07070

Borders:
  border:        #E8DDD4
  borderFocus:   #E07832

Special:
  darkBg:        #1A0E08   (unpacking reveal screen only)

Gradients (for LinearGradient):
  gradientHero:  ['#E07832', '#C45A1A', '#8B3A1A']
  gradientCard:  ['#F0A060', '#C45A1A']
  gradientSoft:  ['#FBE8D8', '#FAF7F4']
```

### Typography
```
Display Font:  Cormorant Garamond — serif, emotional, literary
Body Font:     DM Sans — clean, warm, approachable

Font Family Constants (from fontFamilies):
  display:       'CormorantGaramond_500Medium'
  displayBold:   'CormorantGaramond_600SemiBold'
  displayItalic: 'CormorantGaramond_500Medium_Italic'
  body:          'DMSans_400Regular'
  bodyBold:      'DMSans_600SemiBold'

Type Scale (from typography object):
  displayXl:  56px  — Hero splash moments
  displayLg:  40px  — Phase headers, celebration text
  displayMd:  32px  — Screen titles, prompts
  bodyXl:     22px  — Pi-style conversational prompts
  bodyLg:     18px  — Reading text, longer content
  body:       16px  — Standard body text
  bodySm:     14px  — Supporting text
  label:      12px  — Uppercase labels (letter-spacing: 2)
```

### Spacing & Layout
```
spacing: xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48, 3xl=64, 4xl=80
radius:  sm=8, md=16, lg=24, xl=32, pill=999
shadows: All use warm rgb(180,90,30) tint. sm/md/lg/card/glow variants.
```

### Component Patterns
```
Primary Button:  LinearGradient gradientCard, white text, 56px height, pill radius, glow shadow
Secondary Button: transparent bg, 1.5px orangeMid border, orangeMid text
Ghost Button:    no bg/border, orangeMid text
Card:            bgElevated (#FFF), radius.lg (24px), shadows.card, 24px padding
Input:           bgElevated, 1.5px #E8DDD4 border, 56px height, orangeMid focus border
EmotionPill:     orangeTint bg, orangeGlow border, orangeDeep text; selected = orangeMid bg + white text
RevealCard:      variants: orange/blue/shared/warm with gradient backgrounds
```

### Import Pattern
```typescript
import { colors, typography, fontFamilies, spacing, radius, shadows } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { SomeIcon } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
```

---

## 5. Frontend Architecture

### Directory Structure
```
frontend/
├── App.tsx                    # Root: font loading, providers, navigation
├── src/
│   ├── theme/
│   │   ├── colors.ts          # Color palette
│   │   ├── typography.ts      # Font families & type scale
│   │   ├── spacing.ts         # Spacing, radius, shadows
│   │   └── index.ts           # Theme hooks & exports
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx      # Auth → Onboarding → Main routing
│   │   ├── MainNavigator.tsx      # Bottom tabs + stack screens
│   │   ├── OnboardingNavigator.tsx # 12-screen onboarding flow
│   │   ├── AuthNavigator.tsx      # Login/Register/Forgot
│   │   └── index.tsx              # Barrel exports
│   │
│   ├── screens/
│   │   ├── auth/           # Welcome, Login, Register, ForgotPassword
│   │   ├── onboarding/     # 15 screens: Splash → Connected
│   │   ├── dashboard/      # HomeScreen, SessionListScreen
│   │   ├── session/        # StartMediation, StartSession, SessionDetail, WaitingForPartner
│   │   ├── interview/      # InterviewScreen (Phase 1 Vent), InterviewComplete
│   │   ├── unpacking/      # UnpackingScreen (Wrapped reveal), UnpackingChoice
│   │   ├── reconnection/   # ReconnectionScreen (guided chat), Commitments, ReconnectTab
│   │   ├── profile/        # UsProfile, LoveBank, LearningsHistory
│   │   └── settings/       # ProfileScreen, SettingsScreen
│   │
│   ├── components/
│   │   ├── ui/             # Button, Card, Input, Avatar, Badge, EmotionPill, RevealCard, ProgressBar, etc.
│   │   ├── layout/         # SafeArea, Container, Header, KeyboardAware
│   │   ├── domain/         # ChatBubble, InsightCard, CommitmentCard, SessionCard, etc.
│   │   └── feedback/       # Toast, LoadingScreen, EmptyState, ErrorBoundary, Skeleton
│   │
│   ├── hooks/              # useSession, useInterview, useUnpacking, useReconnection, useAuth, useAudioRecorder, useNotifications
│   ├── services/           # api.ts (Axios), sessions.ts, interviews.ts, unpacking.ts, auth.ts, notifications.ts
│   ├── store/              # authStore, sessionStore, uiStore, onboardingStore (all Zustand)
│   ├── types/              # session.ts, user.ts, interview.ts, unpacking.ts, api.ts
│   └── utils/              # format.ts, haptics.ts, validation.ts, deeplink.ts
```

### Navigation Flow
```
RootNavigator (conditional):
  ├── AuthNavigator (if not authenticated)
  │   └── Welcome → Login → Register → ForgotPassword
  ├── OnboardingNavigator (if authenticated but not onboarded)
  │   └── Splash → Promise → Consent → YourName → CommunicationStyle → ConflictFeelings →
  │       RelationshipStory → PartnerDetails → LoveBank → ConflictPreferences →
  │       InvitePartner → WaitingForPartner → Connected → Tutorial
  └── MainNavigator (if fully onboarded)
      ├── Bottom Tabs:
      │   ├── Home → HomeScreen
      │   ├── Sessions → SessionListScreen
      │   ├── Reconnect → ReconnectTabScreen
      │   └── Us → UsProfileScreen
      └── Stack Screens (accessible from any tab):
          StartMediation, PreSessionReminder, SessionDetail, Interview, InterviewComplete,
          UnpackingChoice, Unpacking, WaitingForPartner, Reconnection,
          Commitments, Settings, Profile, LoveBank, LearningsHistory
```

### State Management (Zustand Stores)
```typescript
authStore:       { user, couple, isAuthenticated, isLoading, onboardingDone }
sessionStore:    { sessions, activeSession, currentInterview }
uiStore:         { themeMode, toasts, isOffline }
onboardingStore: { firstName, communicationStyles, conflictFeelings, partnerName, ... }
```

### Data Fetching Pattern
```typescript
// Services (src/services/) make Axios calls
// Hooks (src/hooks/) wrap services with React Query
// Screens consume hooks

// Example:
const { sessions, refresh } = useSession();        // Hook
const response = await getSessions();               // Service
```

---

## 6. Backend Architecture

### Module Structure
```
backend/src/modules/
├── auth/           # JWT authentication, registration, login
├── couples/        # Partner invitation, agreement signing
├── sessions/       # Session CRUD, interview, unpacking, status transitions
├── ai/             # Audio transcription (Whisper)
├── notifications/  # Push (Expo) + Email (SMTP) + delayed queues
└── unpacking/      # Unpacking generation coordination
```

### Session State Machine
```
initiated → in_progress → unpacking_ready → reconnection → resolved
                                                          ↗
Any non-final state → abandoned ─────────────────────────
```

### Key Patterns
- **JWT Guard**: All endpoints except `/auth/*` and `/health` require `JwtAuthGuard`
- **Prisma**: All DB access via Prisma Client. Schema at `backend/prisma/schema.prisma`
- **DTOs**: class-validator for request validation
- **UUID validation**: `ParseUUIDPipe` on all `:id` params
- **Notifications**: Enqueued via BullMQ, sent via Expo Push / SMTP
- **Rate limiting**: Manual reminder has 12h cooldown via `manualReminderSentAt`

---

## 7. Workers Architecture

```
workers/src/
├── processors/
│   ├── unpacking.processor.ts   # Generates AI insights from both interviews
│   ├── interview.processor.ts    # Adaptive follow-up questions
│   └── crisis.processor.ts       # Detects crisis language (severity levels)
├── services/
│   └── openai.service.ts         # OpenAI GPT-4 + Whisper integration
├── queues/                       # BullMQ queue definitions
└── config.ts                     # Redis + environment config
```

---

## 8. API Reference

### Auth (no auth required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register: `{ email, password, name }` → `{ access_token, user }` |
| POST | `/auth/login` | Login: `{ email, password }` → `{ access_token, user }` |

### Auth — Consent (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/consent` | Record consent: `{ tosVersion, privacyVersion, appVersion?, platform? }` |
| GET | `/auth/consent-status` | Check consent: `{ hasConsented, needsReconsent, ... }` |

### Couples (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/couples/invite` | Generate invite token |
| POST | `/couples/accept` | Accept invite: `{ inviteToken }` |
| GET | `/couples/me` | Get current couple |
| POST | `/couples/agreement` | Sign agreement: `{ confirm: true }` |

### Sessions (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions` | Create session: `{ topic?, context? }` |
| GET | `/sessions` | List all sessions |
| GET | `/sessions/:id` | Get session detail |
| PATCH | `/sessions/:id/status` | Update status |
| POST | `/sessions/:id/remind-partner` | Send reminder (rate-limited) |

### Interviews (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions/:id/interview` | Submit completed interview |
| GET | `/sessions/:id/interview` | Get interview (draft or complete) |
| PATCH | `/sessions/:id/interview/draft` | Save draft (auto-save) |

### Unpacking (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/sessions/:id/unpacking` | Get unpacking analysis |
| PATCH | `/sessions/:id/unpacking/choice` | Set wait/view choice |
| POST | `/sessions/:id/unpacking/unlock` | Manual unlock |
| POST | `/sessions/:id/unpacking/feedback` | Submit feedback |
| GET | `/sessions/:id/partner-b-context` | Partner B entry context (topic, opening msg, AI context) |
| POST | `/sessions/:id/snooze` | Partner B snooze invite (2h) |

### AI (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transcribe` | Audio → text (multipart, 25MB max) |

---

## 9. Database Schema

### Models
```
User:       id, email, password, name, timezone, tosVersionAgreed, privacyVersionAgreed,
            consentAgreedAt, dateOfBirthConfirmed, isMinorFlagged
Couple:     id, userAId, userBId, inviteToken, userASignedAt, userBSignedAt
Session:    id, coupleId, status, initiatedBy, topic, context, topicTag, topicTagGeneratedAt,
            partnerBSnoozedUntil, partnerAExtraction (JSON), unpacking state fields
Interview:  id, sessionId, userId, responses (JSON), notes, completedAt (null=draft)
Unpacking:  id, sessionId, surfaceConflict, partnerA/BExperience, sharedTruths (JSON),
            deeperInsight, patternRecognition, tone, feedbackCount, lastFeedbackReason
```

ConsentLog: id, userId, tosVersion, privacyVersion, agreedAt, appVersion, platform

### Key Constraints
- `Interview`: unique on `(sessionId, userId)` — one interview per user per session
- `Unpacking`: unique on `sessionId` — one unpacking per session
- `Couple`: unique on `(userAId, userBId)`

---

## 10. Coding Standards

### General
- **Simplicity first** — minimal changes, no over-engineering
- **No laziness** — find root causes, no temporary fixes
- **Add documentation comments** to every file explaining purpose and design spec reference
- **Preserve existing prop types and hook integrations** when updating visual styling
- **Run `npx tsc --noEmit`** before marking any task complete

### Frontend Specific
- **Always import from theme barrel**: `import { colors, typography, fontFamilies, spacing, radius, shadows } from '../../theme';`
- **Use fontFamilies constants** (not string literals) for font names
- **Use colors constants** (not hex strings) for colors
- **Animations**: Use `react-native-reanimated` (FadeIn, FadeInDown, spring, etc.)
- **Icons**: Use `lucide-react-native` exclusively
- **Gradients**: Use `expo-linear-gradient` with colors from `colors.gradientX`
- **Haptics**: Import from `../../utils/haptics` (lightTap, mediumTap, selectionTap, successTap)
- **No BlurView/glass effects** — clean white cards with warm shadows on the light theme

### Backend Specific
- **DTOs**: Use class-validator decorators for all request validation
- **Prisma**: Always use `prisma.$transaction()` for multi-step writes
- **Error codes**: 400 (bad input), 403 (forbidden), 404 (not found), 409 (conflict/duplicate)
- **Tests**: E2E tests in `backend/test/`, unit tests alongside source files

---

## 11. Agent Orchestration

### When Assigned a Large Task
1. **Explore first** — fire parallel exploration agents to understand the codebase
2. **Plan** — create a task list with `TaskCreate`
3. **Foundation first** — do shared/dependency work yourself (types, theme, config)
4. **Parallelize** — launch 4-6 background agents for independent workstreams
5. **Full context per agent** — each agent prompt must include ALL design system values, file paths, import patterns, and component specs. Agents don't share context.
6. **Track progress** — update tasks as agents complete
7. **Verify** — run TypeScript check and tests after all agents finish

### Agent Prompt Template
When launching a subagent, always include:
- Design system values (colors, fonts, spacing — copy the actual values)
- Import pattern examples
- List of files to read first
- Detailed spec for each file to create/modify
- Existing components available for reuse
- "Preserve existing hook integrations" reminder

### Key Rules (from AgentInstructions.md)
- Enter plan mode for ANY non-trivial task (3+ steps)
- One task per subagent for focused execution
- Never mark a task complete without proving it works
- After corrections from user: update lessons learned
- For non-trivial changes: pause and ask "is there a more elegant way?"
- When given a bug: just fix it, don't ask for hand-holding

---

## 12. Task Status

### Completed (Backend)
- ✅ Auth & onboarding (JWT, partner invitation, agreement signing)
- ✅ Session management (state machine, duplicate prevention)
- ✅ Draft interview system (auto-save/resume)
- ✅ Unpacking storage & API (wait/view locks, feedback)
- ✅ Voice-to-text endpoint (Whisper)
- ✅ Notifications (push + email + delayed reminders)
- ✅ Manual reminder endpoint
- ✅ Worker processors (unpacking, interview, crisis)
- ✅ Legal consent system (POST /auth/consent, GET /auth/consent-status, ConsentLog audit table)

### Completed (Frontend — March 2026 Revamp)
- ✅ Design system overhaul (warm-light theme, Cormorant Garamond)
- ✅ UI component library (10 updated + 3 new)
- ✅ Onboarding flow (12 screens + onboardingStore)
- ✅ Core screens (Home, StartMediation, Interview/Vent, WaitingForPartner)
- ✅ Unpacking reveal (Spotify Wrapped-style, 7 cards)
- ✅ Reconnection chat (guided with AI mediator)
- ✅ Commitment/Learning screen
- ✅ Us Profile, Love Bank, Learnings History
- ✅ Navigation (4-tab bottom bar: Home/Sessions/Reconnect/Us)
- ✅ Auth screens (Welcome, Login, Register, ForgotPassword)
- ✅ Settings screen
- ✅ Legal consent screen (clickwrap, checkbox, ToS/PP modal viewer)
- ✅ Pre-session safety reminder screen (before Interview)
- ✅ Crisis resources modal (tappable hotlines, always accessible)

### Completed (Partner B Entry Flow — March 22, 2026)
- ✅ Database: 4 new Session fields (topicTag, topicTagGeneratedAt, partnerBSnoozedUntil, partnerAExtraction)
- ✅ Backend: `awaiting_partner_b` session status in state machine
- ✅ Backend: AI extraction of Partner A context (topicTag, issues, needs, emotions)
- ✅ Backend: Partner B invite notifications + 4h/24h/72h reminders
- ✅ Backend: `GET /sessions/:id/partner-b-context` + `POST /sessions/:id/snooze` endpoints
- ✅ Backend: Context-aware next-question generation for Partner B
- ✅ Frontend: PartnerBEntryScreen (topic tag, privacy note, CTA, snooze)
- ✅ Frontend: HomeScreen Partner B routing (invite card vs waiting state)
- ✅ Frontend: useInterview accepts custom opening message for Partner B
- ✅ Frontend: StatusBadge + SessionDetailScreen updated for new status

### Pending (Backend)
- 🔴 TASK-B2: Crisis language blocking flow
- 🔴 TASK-B4: Guided reconnection coach (backend endpoints + turn-taking)
- 🔴 TASK-B5: Personality profile integration
- 🔴 TASK-B6: 72-hour non-response handling
- 🔴 TASK-B7: Special character sanitization
- 🔴 TASK-B8: Large JSON response limits

### Pending (Frontend)
- 🔴 Connect onboarding data to backend profile API (when TASK-B5 is built)
- 🔴 Push notification deep linking
- 🔴 Voice recording integration with transcription endpoint
- 🔴 Real-time session polling / WebSocket upgrade
- 🔴 Production build & deployment

### Pending (Infrastructure)
- 🔴 Production Redis setup
- 🔴 Production credentials (OpenAI, Expo, SMTP)
- 🔴 API documentation (Swagger)

---

## 13. Recent Fixes & Lessons Learned (March 9–11, 2026)

### LinkingContext Crash (React Navigation 7)
**Symptom:** `[Error: Couldn't find a LinkingContext context.]` on app launch.
**Root cause:** Duplicate `@react-navigation/native` packages — v7.1.8 in `frontend/node_modules` and v7.1.33 in root `node_modules`. The `NavigationContainer` (v7.1.8) and `BottomTabBar` (using v7.1.33 via `useLinkBuilder`) had different `LinkingContext` objects. Provider from one was invisible to consumers from the other.
**Fix:**
1. Removed `@react-navigation/bottom-tabs` from root `package.json` (it's a frontend-only dep)
2. Updated `@react-navigation/native` in `frontend/package.json` from `^7.1.8` to `^7.1.33`
3. Verify with `npm ls @react-navigation/native` — must show ONE version, all deduped

### React Navigation 7 Theme
**Issue:** React Navigation 7 requires a `fonts` property on the theme object.
**Fix:** `navTheme` in `RootNavigator.tsx` spreads `DefaultTheme` from `@react-navigation/native` to inherit `fonts`. Passed to `<NavigationContainer theme={navTheme}>` in `App.tsx`.

### Onboarding Button Overlap
**Symptom:** Continue and Back buttons overlapping at screen bottom on pill-select screens.
**Root cause:** ScrollView without `style={{ flex: 1 }}` expands to content height, pushing the actions container off-screen. The `flexGrow: 1` was only on `contentContainerStyle` which sizes the inner content, not the ScrollView itself.
**Fix pattern (applied to 6 screens):**
```tsx
<ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}>
// ...
<View style={styles.actions}>
  <Button title="Continue" size="lg" style={styles.continueBtn} />
  <Button title="Back" variant="ghost" size="sm" />
</View>

// styles:
scrollView: { flex: 1 },
scroll: { paddingTop: spacing['2xl'], paddingBottom: spacing.md },  // NO flexGrow
actions: { paddingTop: spacing.lg, paddingBottom: spacing.md, ... },
continueBtn: { marginBottom: spacing.lg },  // 24px gap between buttons
```
**Affected files:** CommunicationStyleScreen, ConflictFeelingsScreen, ConflictPreferencesScreen, LoveBankScreen, RelationshipStoryScreen, PartnerDetailsScreen.

### Registration Flow Simplification
**Change:** Removed name field from RegisterScreen. Registration now collects only email + password. User's name is collected in YourNameScreen during onboarding (no redundancy). Email prefix is sent as placeholder name to satisfy backend `RegisterDto.name` requirement.
**Files changed:** `RegisterScreen.tsx`, `validation.ts` (removed name from registerSchema), `types/user.ts` (name optional on RegisterRequest).

### API Base URL / Network Issues
- `frontend/.env` has `EXPO_PUBLIC_API_BASE_URL=http://<local-ip>:3000`
- This IP changes when switching networks — update with `ipconfig getifaddr en0`
- Phone must be on same WiFi as dev machine (5G/cellular can't reach local IPs)
- Value is baked at bundle time — restart Expo with `--clear` after changing

### Prisma Client Generation
- After fresh `npm install`, must run `cd backend && npx prisma generate` before `npm run start:dev`
- Without this, backend crashes with: `@prisma/client did not initialize yet`

### Database Testing Helpers
Delete a user for re-testing onboarding:
```bash
docker exec relation_counselor_db psql -U postgres -d relationship_app -c "
DELETE FROM couples WHERE user_a_id IN (SELECT id FROM users WHERE email='EMAIL');
DELETE FROM users WHERE email='EMAIL';
"
```
Note: table names are lowercase (`users`, `couples`, `sessions`, `interviews`, `unpackings`), column names are snake_case (`user_a_id`, `created_at`).

---

*This handbook is the ground truth. If you see contradictions with other docs, this file wins.*
