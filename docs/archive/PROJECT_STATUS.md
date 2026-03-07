# Project Status & Task Breakdown

**Last Updated:** 2026-02-09
**Current Branch:** `database-implementation`
**Test Status:** 90/90 E2E passing, 41/41 unit tests passing

---

## 🎯 Quick Start for New Agents

### Setup Commands
```bash
# Start database
docker compose -f docker-compose.db.yml up -d

# Backend setup
cd backend
npm install
npx prisma migrate deploy
npx prisma generate

# Workers setup (requires Redis + OPENAI_API_KEY)
cd workers
npm install
npm run start:dev

# Run tests
npm run test --workspace=backend              # Unit tests
npm run test:e2e                               # E2E tests
```

### Key Files
- **Backend API:** `backend/src/modules/sessions/sessions.service.ts`
- **Workers:** `workers/src/processors/*.processor.ts`
- **OpenAI Integration:** `workers/src/services/openai.service.ts`
- **Notifications:** `backend/src/modules/notifications/notifications.service.ts`
- **Database Schema:** `backend/prisma/schema.prisma`
- **Design Spec:** `relationship-app-detailed-design-spec.md`

---

## ✅ Completed Features (Don't Rebuild These!)

### Authentication & Onboarding
- ✅ User registration with JWT
- ✅ Partner invitation system
- ✅ Invite token validation
- ✅ Agreement signing (both partners required)
- ✅ Individual signature tracking (`userASignedAt`, `userBSignedAt`)

### Session Management
- ✅ Session creation with duplicate prevention
- ✅ State machine: initiated → in_progress → unpacking_ready → reconnection → resolved
- ✅ Status transition validation
- ✅ Draft interview auto-save (`completedAt: null`)
- ✅ Interview resume capability
- ✅ Privacy guards (interview responses hidden until unpacking)

### Unpacking System
- ✅ Unpacking database model
- ✅ Placeholder creation (`ensureUnpackingExists()`) to prevent 404s
- ✅ Wait/view choice endpoints
- ✅ Both-waiting unlock logic
- ✅ 24h auto-unlock timer
- ✅ Feedback submission with regeneration queue
- ✅ Worker processor (generates AI insights and persists to DB)

### Notifications
- ✅ NotificationsService with Expo push + SMTP email
- ✅ BullMQ queue for delayed notifications
- ✅ Session initiated notifications
- ✅ 24h/48h interview reminders (scheduled on session creation)
- ✅ Unpacking ready notifications
- ✅ Partner waiting/auto-unlock notifications
- ✅ 3-day post-resolution check-in
- ✅ Environment flags: `NOTIFICATIONS_PUSH_ENABLED`, `NOTIFICATIONS_EMAIL_ENABLED`, `NOTIFICATIONS_SEND_REMINDERS_IMMEDIATELY`

### AI Workers
- ✅ Unpacking generation (OpenAI GPT-4)
- ✅ Interview adaptive questioning
- ✅ Crisis language detection
- ✅ Whisper audio transcription service (`openAIService.transcribeAudio()`)

### Testing
- ✅ 90 E2E tests covering core flows
- ✅ 41 unit tests
- ✅ Test helpers and database setup utilities

---

## 🚧 Pending Tasks - Backend

### Priority 1: Critical Gaps

#### TASK-B1: Voice-to-Text REST Endpoint
**Status:** ✅ COMPLETE (2026-02-09) + Codex Fixes Applied
**Effort:** 30 minutes + 15 minutes fixes
**Owner:** Claude

**What Was Built:**
- REST endpoint: `POST /api/transcribe`
- OpenAI Whisper integration with proper file handling
- Authentication (JWT required)
- File validation (size, MIME type)
- Comprehensive error handling

**Acceptance Criteria:**
- [x] Endpoint accepts audio files
- [x] Returns transcribed text
- [x] Handles errors (invalid file, too large, OpenAI failures)
- [x] E2E test added to verify flow
- [x] Unit tests passing (8/8)
- [x] All existing tests still passing (49/49 unit)
- [x] **Codex review findings fixed (3/3)**
- [x] Uses `toFile()` for proper format detection
- [x] Tests validate real behavior (not mocks)
- [x] Dead code removed (unused DTO)

**Design Spec Reference:** Lines 1283-1295

**Implementation Details:**
- **Files Created:**
  - `backend/src/modules/ai/ai.controller.ts` - REST endpoint with auth guard
  - `backend/src/modules/ai/ai.service.ts` - Transcription service with OpenAI integration
  - `backend/src/modules/ai/ai.module.ts` - NestJS module
  - `backend/src/modules/ai/dto/transcribe-audio.dto.ts` - DTO for validation
  - `backend/src/modules/ai/ai.service.spec.ts` - Unit tests (8 tests)
  - `backend/test/transcription.e2e-spec.ts` - E2E tests (11 tests)

- **Files Modified:**
  - `backend/src/app.module.ts` - Added AiModule
  - `backend/src/modules/sessions/sessions.service.spec.ts` - Fixed test mocks for NotificationsQueueService
  - `backend/package.json` - Added multer and @types/multer

- **Features:**
  - JWT authentication required
  - File size validation (max 25MB per OpenAI limit)
  - MIME type validation (supports MP3, WAV, M4A, WEBM, OGG, FLAC)
  - Error handling for: missing file, too large, unsupported format, OpenAI API errors
  - Uses OpenAI Whisper-1 model
  - Returns `{ transcription: string }`

- **Endpoint:** `POST /api/transcribe`
- **Usage:**
  ```bash
  curl -X POST http://localhost:3000/api/transcribe \
    -H "Authorization: Bearer <token>" \
    -F "audio=@recording.mp3"
  ```

---

#### TASK-B2: Crisis Language Blocking Flow
**Status:** 🟡 Worker detects, backend needs integration
**Effort:** 2 hours
**Owner:** Any agent

**What's Done:**
- Crisis detection worker exists (workers/src/processors/crisis.processor.ts)
- Detects severity levels: low/medium/high
- Returns concerns array and recommendations

**What's Needed:**
1. Enqueue crisis detection job on interview submission
2. Block session from proceeding if high severity detected
3. Display crisis resources to user (hotlines, emergency contacts)
4. Update session status to `crisis_detected` (add to schema)
5. Prevent unpacking generation for crisis sessions
6. Send notification to both partners with resources

**Files to Create/Modify:**
- `backend/prisma/schema.prisma` - Add `crisis_detected` status
- `backend/src/modules/sessions/sessions.service.ts` - Integrate crisis check
- `backend/src/modules/sessions/dto/update-status.dto.ts` - Add status
- Create migration for new status
- Add crisis resources config (hotlines by country)

**Acceptance Criteria:**
- [ ] Interview with crisis language blocks session
- [ ] Both partners receive resources
- [ ] Session cannot proceed to unpacking
- [ ] E2E test verifies blocking behavior
- [ ] Low severity doesn't block (just logs)

**Design Spec Reference:** Crisis intervention section (lines 1496-1523)

---

#### TASK-B3: Manual Reminder Endpoint
**Status:** 🟡 Tests reference it, endpoint not found
**Effort:** 45 minutes
**Owner:** Any agent

**What's Done:**
- Test calls `POST /sessions/:id/remind-partner` (test/sessions.e2e-spec.ts)
- Notification service ready

**What's Needed:**
1. Add endpoint to SessionsController
2. Verify session exists and user is part of couple
3. Identify partner who hasn't completed interview
4. Send reminder notification
5. Rate limit (max 1 reminder per 12 hours)

**Files to Create/Modify:**
- `backend/src/modules/sessions/sessions.controller.ts`
- `backend/src/modules/sessions/sessions.service.ts` - Add `sendManualReminder()`
- Add rate limiting with timestamp tracking

**Acceptance Criteria:**
- [ ] Endpoint sends notification to non-completed partner
- [ ] Returns 403 if both completed
- [ ] Returns 429 if called too frequently
- [ ] E2E test passes

---

### Priority 2: Major Features

#### TASK-B4: Guided Reconnection Coach
**Status:** 🔴 Not started
**Effort:** 6-8 hours
**Owner:** Recommended for Codex (complex feature)

**What's Needed:**
1. **Database schema:**
   - `ReconnectionMessage` table (sessionId, userId, content, timestamp, type)
   - Add `reconnectionStartedAt` to Session model

2. **Turn-taking logic:**
   - Track whose turn it is
   - Prevent out-of-turn messages
   - Allow AI to inject prompts

3. **API endpoints:**
   - `GET /sessions/:id/reconnection` - Fetch conversation history
   - `POST /sessions/:id/reconnection/message` - Send message (validates turn)
   - `POST /sessions/:id/reconnection/start` - Begin reconnection phase
   - `GET /sessions/:id/reconnection/turn` - Check whose turn

4. **AI integration:**
   - Prompt between turns: "Partner A, respond to what Partner B just shared"
   - Detect escalation (harsh language, blame)
   - Inject calming prompts if escalation detected
   - Guide toward commitments at end

5. **Worker processor:**
   - `workers/src/processors/reconnection.processor.ts`
   - Analyze message sentiment
   - Generate intervention prompts
   - Detect commitment statements

**Files to Create/Modify:**
- `backend/prisma/schema.prisma` - Add models
- `backend/src/modules/reconnection/reconnection.controller.ts` (new)
- `backend/src/modules/reconnection/reconnection.service.ts` (new)
- `backend/src/modules/reconnection/reconnection.module.ts` (new)
- `workers/src/processors/reconnection.processor.ts` (new)
- `workers/src/queues/reconnection.queue.ts` (new)

**Acceptance Criteria:**
- [ ] Partners can exchange messages in turns
- [ ] AI provides guidance between turns
- [ ] Escalation detection triggers calming prompts
- [ ] Session transitions to `resolved` after commitments
- [ ] E2E test covers full flow

**Design Spec Reference:** Flow 5 - Guided Reconnection (lines 778-924)

---

#### TASK-B5: Personality Profile Integration
**Status:** 🔴 Not started
**Effort:** 4-6 hours
**Owner:** Any agent

**What's Done:**
- `backend/src/modules/profiles/` directory exists (empty)

**What's Needed:**
1. **Database schema:**
   - `Profile` model linked to User
   - Fields: attachmentStyle, communicationPreferences, conflictPatterns, values

2. **Onboarding questions:**
   - 5-7 questions to build profile
   - Store as JSON in profile table

3. **API endpoints:**
   - `GET /users/profile` - Fetch profile
   - `PUT /users/profile` - Update profile
   - `POST /users/profile/questions` - Submit profile questionnaire

4. **Integration into AI prompts:**
   - Modify `openAIService.generateUnpacking()` to include profile data
   - Pass attachment styles, communication preferences to prompts
   - Worker uses profiles to personalize insights

**Files to Create/Modify:**
- `backend/prisma/schema.prisma` - Add Profile model
- `backend/src/modules/profiles/profiles.controller.ts` (new)
- `backend/src/modules/profiles/profiles.service.ts` (new)
- `backend/src/modules/profiles/profiles.module.ts` (new)
- `workers/src/services/openai.service.ts` - Update prompts

**Acceptance Criteria:**
- [ ] Users can complete profile questionnaire
- [ ] Profile data stored and retrievable
- [ ] Unpacking generation uses profile context
- [ ] Recommendations personalized to attachment styles
- [ ] E2E test verifies profile flow

**Design Spec Reference:** Profile system (lines 1355-1396)

---

#### TASK-B6: 72-Hour Non-Response Handling
**Status:** 🔴 Not started
**Effort:** 3-4 hours
**Owner:** Any agent

**What's Needed:**
1. **Cron job/worker:**
   - Check for sessions in `initiated` or `in_progress` status
   - Filter where one partner hasn't responded in 72h
   - Send final reminder with options

2. **Options to non-responding partner:**
   - "I need more time" - Extends deadline by 48h
   - "I can't participate right now" - Session marked `abandoned` by partner choice
   - Send notification with these options

3. **API endpoint:**
   - `POST /sessions/:id/request-extension` - Extend deadline
   - `POST /sessions/:id/decline` - Decline participation

4. **Notification updates:**
   - 72h final reminder notification type

**Files to Create/Modify:**
- `backend/src/modules/sessions/sessions.service.ts` - Add deadline methods
- `backend/src/modules/sessions/sessions.controller.ts` - Add endpoints
- `workers/src/processors/deadline.processor.ts` (new)
- Add cron job or scheduled worker

**Acceptance Criteria:**
- [ ] 72h check runs automatically
- [ ] Partner receives options in notification
- [ ] Can extend or decline
- [ ] Session status updates appropriately
- [ ] E2E test with time manipulation

**Design Spec Reference:** Edge Case - Partner B Never Responds (lines 1439-1458)

---

### Priority 3: Nice-to-Have Features

#### TASK-B7: Special Character Sanitization
**Status:** 🔴 Not started
**Effort:** 1 hour
**Owner:** Any agent

**What's Needed:**
- Add validation to DTOs for special characters
- Sanitize input on all text fields
- Prevent XSS, SQL injection (Prisma handles SQL, focus on XSS)
- Test with malicious input

**Files to Modify:**
- All DTOs in `backend/src/modules/*/dto/`

**E2E Test:** `edge-cases.e2e-spec.ts:543` (currently failing)

---

#### TASK-B8: Large JSON Response Limits
**Status:** 🔴 Not started
**Effort:** 30 minutes
**Owner:** Any agent

**What's Needed:**
- Add size validation to `SubmitInterviewDto`
- Set max interview response size (e.g., 50KB)
- Return clear error if exceeded

**Files to Modify:**
- `backend/src/modules/sessions/dto/submit-interview.dto.ts`

**E2E Test:** `edge-cases.e2e-spec.ts:556` (currently failing)

---

#### TASK-B9: Feedback "Other" Validation
**Status:** 🟡 Partially done
**Effort:** 15 minutes
**Owner:** Any agent

**What's Done:**
- Feedback endpoint exists
- DTO has `reason` and `feedbackText` fields

**What's Needed:**
- Add validation: if `reason === 'other'`, require `feedbackText` to be non-empty
- Return 400 if missing

**Files to Modify:**
- `backend/src/modules/sessions/dto/submit-unpacking-feedback.dto.ts`

**Reference:** Codex_Review_Notes.md:4

---

## 🚧 Pending Tasks - Frontend

### TASK-F1: Complete Frontend Implementation
**Status:** 🔴 Not started (0%)
**Effort:** 80-100 hours
**Owner:** Recommended for multiple agents or dedicated frontend dev

**Current State:**
- Directory structure exists: `frontend/src/`
- No actual implementation (empty directories)

**What's Needed:**

#### 1. Onboarding Flow (8-10 hours)
- Registration screen
- Login screen
- Partner invitation screen (generate/share link)
- Invitation acceptance screen
- Shared agreement screen with signatures
- Profile questionnaire screens (5-7 questions)

#### 2. Dashboard & Session Overview (6-8 hours)
- Main dashboard showing active/past sessions
- Session card components
- Navigation to session detail
- Status badges (initiated, in_progress, unpacking_ready, etc.)

#### 3. Interview UI (12-15 hours)
- **Voice recording component** (critical)
  - Record button with visual feedback
  - Playback controls
  - Upload to `/api/transcribe`
  - Display transcription
- **Text input alternative**
- **Conversational interface** (messages scroll up)
- **Draft auto-save** (save on each response)
- **Resume from draft** (load previous answers)
- Exit/resume UX

#### 4. Unpacking View (8-10 hours)
- Display AI-generated insights
- Wait/view choice UI
- Lock states:
  - "Waiting for partner to view..."
  - "Both waiting - unlock now?"
  - "Auto-unlocks in X hours"
- Feedback buttons
- Feedback form (reason + optional text)

#### 5. Reconnection Coach (10-12 hours)
- Chat interface with turn indicators
- "Your turn" vs "Partner's turn" states
- Message bubbles (partner A, partner B, AI prompts)
- AI guidance between turns
- Commitment submission form
- Escalation warnings (if detected)

#### 6. Notifications & Reminders (4-6 hours)
- Push notification setup (Expo)
- In-app notification badge
- Notification list screen
- Deep linking (notification → session)

#### 7. Settings & Profile (4-6 hours)
- Edit profile
- View/edit personality profile
- Notification preferences
- Logout

**Tech Stack Decisions Needed:**
- State management: Redux / Zustand / Context API
- API client: Axios / React Query / RTK Query
- Navigation: React Navigation (already in package.json?)
- Voice recording: react-native-audio-recorder-player or expo-av
- Push notifications: expo-notifications

**Files to Create:**
- `frontend/src/screens/*` - All screen components
- `frontend/src/components/*` - Reusable components
- `frontend/src/services/api/*` - API client
- `frontend/src/hooks/*` - Custom hooks
- `frontend/src/navigation/*` - Navigation config
- `frontend/src/store/*` - State management

**Acceptance Criteria:**
- [ ] Complete onboarding flow works end-to-end
- [ ] Users can record/upload voice or type text
- [ ] Interview auto-saves drafts
- [ ] Unpacking view shows insights with wait/view logic
- [ ] Reconnection chat enables turn-taking
- [ ] Push notifications work on real device
- [ ] All screens match design spec

**Design Spec Reference:** Entire spec includes UI mockups and flows

---

## 🔧 Infrastructure & DevOps Tasks

### TASK-I1: Production Redis Setup
**Status:** 🟡 Works locally, need production config
**Effort:** 2 hours
**Owner:** DevOps or any agent

**What's Needed:**
- Production Redis instance (AWS ElastiCache, Upstash, Redis Cloud)
- Update `.env` with production `REDIS_URL`
- Test delayed notifications work
- Test worker job processing

---

### TASK-I2: Production Credentials
**Status:** 🔴 Using dev/test values
**Effort:** 1 hour
**Owner:** DevOps or any agent

**What's Needed:**
- Real OpenAI API key with billing
- Expo access token for push notifications
- SMTP credentials for email (SendGrid, AWS SES, Mailgun)
- Update `.env.production` with real values

---

### TASK-I3: Database Cleanup Ordering Fix
**Status:** 🟡 Minor issue in tests
**Effort:** 15 minutes
**Owner:** Any agent

**What's Done:**
- Foreign key constraint: unpacking → session
- Test cleanup deletes sessions before unpackings

**What's Needed:**
- Update test cleanup to delete unpackings first
- Or add cascade delete to schema

**Files to Modify:**
- `backend/test/setup.ts` or `backend/test/test-helpers.ts`

**Reference:** Codex_Review_Notes.md:5

---

## 📋 Documentation Tasks

### TASK-D1: Update HANDOFF_NOTES.md
**Status:** 🟡 Outdated
**Effort:** 30 minutes
**Owner:** Any agent

**What's Needed:**
- Remove claims that unpacking creation is missing (it exists!)
- Update notification status to "implemented, needs prod creds"
- Update voice-to-text status to "service ready, need endpoint"
- Remove TODO comments that are now done

---

### TASK-D2: Archive REMAINING_E2E_FIXES.md
**Status:** 🟡 Outdated (from Nov 24)
**Effort:** 10 minutes
**Owner:** Any agent

**What's Needed:**
- Most issues listed are fixed
- Either update or archive/delete file
- Current test status: 90/90 passing (not 16/104)

---

### TASK-D3: API Documentation
**Status:** 🔴 Missing
**Effort:** 3-4 hours
**Owner:** Any agent

**What's Needed:**
- OpenAPI/Swagger documentation
- Add decorators to controllers
- Generate docs with NestJS Swagger module
- Host at `/api/docs`

---

## 🧪 Testing Tasks

### TASK-T1: E2E Tests for New Features
**Status:** 🟡 Tests have TODO placeholders
**Effort:** Ongoing per feature
**Owner:** Any agent implementing features

**Tests Needed:**
- Voice transcription endpoint
- Crisis blocking flow
- Manual reminder endpoint
- Reconnection turn-taking
- Profile questionnaire
- 72h deadline handling

**Location:** `backend/test/` - add to appropriate spec files

---

### TASK-T2: Integration Tests for Workers
**Status:** 🔴 Missing
**Effort:** 4-6 hours
**Owner:** Any agent

**What's Needed:**
- Test unpacking worker end-to-end (mock OpenAI)
- Test interview worker question generation
- Test crisis detection worker
- Test notification queue processing
- Add to `workers/test/` directory (create)

---

## 📊 Progress Tracking

### Backend Completion: ~87%
- ✅ Core API (100%)
- ✅ Notifications (95%)
- ✅ Unpacking (100%)
- ✅ Voice endpoint (100%) - COMPLETED 2026-02-09
- 🚧 Crisis integration (30%)
- 🔴 Reconnection coach (0%)
- 🔴 Profiles (0%)
- 🔴 72h handling (0%)

### Workers Completion: ~90%
- ✅ Unpacking processor (100%)
- ✅ Interview processor (100%)
- ✅ Crisis processor (100%)
- ✅ OpenAI service (100%)
- 🔴 Reconnection processor (0%)

### Frontend Completion: 0%
- 🔴 All screens (0%)
- 🔴 Components (0%)
- 🔴 API integration (0%)

### Infrastructure: ~60%
- ✅ Docker setup (100%)
- ✅ Local Redis (100%)
- 🚧 Prod Redis (0%)
- 🚧 Prod credentials (0%)

---

## 🎯 Recommended Work Order

### For Immediate Impact (Next 1-2 Days):
1. **TASK-B1** - Voice endpoint (unblocks frontend interview)
2. **TASK-B3** - Manual reminder endpoint (test already references it)
3. **TASK-B9** - Feedback validation (quick fix)
4. **TASK-I3** - Test cleanup ordering (prevents future issues)
5. **TASK-D1** - Update docs (prevents confusion)

### For Week 1:
6. **TASK-B2** - Crisis blocking (safety-critical)
7. **TASK-B4** - Reconnection coach (major feature)
8. **TASK-F1.1-3** - Frontend onboarding + dashboard + interview (unblocks user testing)

### For Week 2:
9. **TASK-B5** - Personality profiles (enhances AI quality)
10. **TASK-F1.4-5** - Frontend unpacking + reconnection views
11. **TASK-B6** - 72h handling (edge case coverage)
12. **TASK-I1-2** - Production infrastructure

### For Week 3:
13. **TASK-F1.6-7** - Frontend notifications + settings
14. **TASK-T1-2** - Comprehensive testing
15. **TASK-D3** - API documentation
16. **TASK-B7-8** - Nice-to-have polish

---

## 🤝 Agent Collaboration Notes

### For Codex:
- You have full context of the system
- Best for: Complex features (reconnection coach, crisis integration)
- You've already built: notifications, unpacking, worker infrastructure
- Familiar with: BullMQ patterns, OpenAI integration, Prisma schema

### For Claude:
- You have strong backend API skills
- Best for: REST endpoints, validation, testing, docs
- Can handle: Voice endpoint, manual reminders, profile API
- Works well with: Clear specs and file references

### Handoff Protocol:
1. **Before starting a task:**
   - Check this file for latest status
   - Read relevant design spec sections
   - Look at similar completed features for patterns

2. **While working:**
   - Update task status in this file (🟡 In Progress)
   - Commit regularly with clear messages
   - Run tests before marking complete

3. **When complete:**
   - Update task status (✅ Complete)
   - Run full test suite
   - Update progress percentages
   - Document any new patterns/decisions
   - List any blockers discovered

4. **If blocked:**
   - Document blocker in task
   - Mark task status (⚠️ Blocked: reason)
   - Move to next task, file issue for resolution

---

## 📞 Questions or Issues?

- **Design clarifications:** Reference `relationship-app-detailed-design-spec.md`
- **Technical patterns:** Look at completed features in same domain
- **Database questions:** Check `backend/prisma/schema.prisma` and `DATABASE_MANAGEMENT.md`
- **Test patterns:** See `backend/test/README.md` and existing E2E tests
- **Worker patterns:** Check completed processors in `workers/src/processors/`

---

**Generated:** 2026-02-09
**Next Review:** Update after each major feature completion
