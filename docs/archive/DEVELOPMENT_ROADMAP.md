# Development Roadmap - AI Relationship Mediation App

**Last Updated:** November 20, 2025
**Current Status:** Batch 4C in progress

---

## 📊 Progress Overview

```
✅ Completed: Batch 1, 2, 3, 4A, 4B
🚧 In Progress: Batch 4C (Sessions Management)
⏳ Remaining: Batches 5-8
```

---

## ✅ Completed Batches

### **Batch 1: Backend Foundation**
**Status:** ✅ Complete
**Date:** Nov 19, 2025

**Deliverables:**
- NestJS project setup with TypeScript
- Health check endpoint (`GET /health`)
- Build and test infrastructure
- Development server configuration

**Files:**
- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/src/app.controller.ts`

---

### **Batch 2: Database Setup**
**Status:** ✅ Complete
**Date:** Nov 19, 2025

**Deliverables:**
- Prisma ORM integration
- PostgreSQL connection
- Initial schema with User model
- Migration system setup
- PrismaService for dependency injection

**Files:**
- `backend/prisma/schema.prisma`
- `backend/src/prisma.service.ts`
- `backend/prisma/migrations/20251120034209_init/`

**Database Schema:**
- `users` table (id, email, password, name, timezone)

---

### **Batch 3: Authentication**
**Status:** ✅ Complete
**Date:** Nov 19, 2025

**Deliverables:**
- User registration with bcrypt password hashing
- JWT-based login system
- Passport JWT strategy
- Auth guards for protected routes
- Input validation with DTOs

**API Endpoints:**
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Get JWT access token
- `GET /profile` - Protected test endpoint

**Files:**
- `backend/src/auth/auth.module.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/jwt.strategy.ts`
- `backend/src/auth/jwt-auth.guard.ts`
- `backend/src/auth/dto/*.dto.ts`

**Tests:** 9 unit tests (all passing)

---

### **Batch 4A: Extended Database Schema**
**Status:** ✅ Complete
**Date:** Nov 20, 2025

**Deliverables:**
- Couple model (partner relationship)
- Session model (mediation sessions)
- Interview model (private responses)
- Performance indexes on all foreign keys
- Optional userB handling with proper constraints

**Database Schema:**
- `couples` table - Partner relationships with invite system
- `sessions` table - Mediation session tracking
- `interviews` table - Private Q&A responses (JSONB)

**Indexes Added:**
- `couples_user_a_id_idx`
- `couples_user_b_id_idx`
- `sessions_couple_id_idx`
- `interviews_session_id_idx`
- `interviews_user_id_idx`

**Migrations:**
- `20251120043809_add_couples_sessions_interviews`
- `20251120044159_add_performance_indexes`
- `20251120044416_add_couple_fk_indexes`
- `20251120051713_make_user_b_optional`

**Tests:** 2 schema validation tests

---

### **Batch 4B: Couple Management**
**Status:** ✅ Complete
**Date:** Nov 20, 2025

**Deliverables:**
- Couple creation and invitation system
- Invite acceptance flow
- Shared agreement signing
- Couple info retrieval

**API Endpoints:**
- `POST /couples/invite` - Create couple & generate invite token
- `POST /couples/accept` - Accept invitation
- `GET /couples/me` - Get my couple info
- `POST /couples/agreement` - Sign shared agreement

**Files:**
- `backend/src/modules/couples/couples.module.ts`
- `backend/src/modules/couples/couples.service.ts`
- `backend/src/modules/couples/couples.controller.ts`
- `backend/src/modules/couples/dto/*.dto.ts`

**Business Logic:**
- Prevents self-invite acceptance
- Prevents duplicate couples
- Allows invite regeneration if partner hasn't joined
- Validates agreement signing requires both partners

**Tests:** 10 unit tests (all passing)

---

## 🚧 In Progress

### **Batch 4C: Session Management**
**Status:** 🚧 In Progress
**Assignee:** Codex

**Objective:**
Build session management endpoints to create, track, and update mediation sessions.

**API Endpoints to Build:**
- `POST /sessions` - Create new mediation session
- `GET /sessions/:id` - Get session details
- `GET /sessions` - Get all sessions for user's couple
- `PATCH /sessions/:id/status` - Update session status

**Business Logic Required:**
- Verify user is part of a couple
- Check couple has signed agreement before session creation
- Validate status transitions (initiated → in_progress → unpacking_ready → reconnection → resolved)
- Track which partner initiated the session
- Check if both partners completed interviews

**Files to Create:**
- `backend/src/modules/sessions/sessions.module.ts`
- `backend/src/modules/sessions/sessions.service.ts`
- `backend/src/modules/sessions/sessions.controller.ts`
- `backend/src/modules/sessions/sessions.service.spec.ts`
- `backend/src/modules/sessions/dto/update-status.dto.ts`

**Expected Tests:** Minimum 8 unit tests

**Success Criteria:**
- ✅ Build passes
- ✅ All tests pass
- ✅ Proper error handling (NotFoundException, ForbiddenException, ConflictException)
- ✅ Status transitions validated

---

## ⏳ Upcoming Batches

### **Batch 5: Worker Infrastructure**
**Status:** ⏳ Not Started
**Priority:** High (can be done in parallel)

**Objective:**
Set up background job processing system for AI operations.

**Tasks:**
1. Configure Bull/BullMQ with Redis
2. Set up job queue structure
3. Create worker process
4. Integrate OpenAI SDK
5. Build job processors:
   - AI Interview Handler
   - Unpacking Generator
   - Crisis Language Detector

**Technical Stack:**
- Bull/BullMQ for job queuing
- Redis for queue storage
- OpenAI SDK for GPT-4 and Whisper

**Files to Create:**
- `workers/package.json`
- `workers/src/queues/*.ts`
- `workers/src/processors/*.ts`
- `workers/src/services/openai.service.ts`

**Environment Variables:**
- `REDIS_URL`
- `OPENAI_API_KEY`

**Testing:**
- Queue job → Process → Verify result
- Test retry logic
- Test error handling

---

### **Batch 6: Interview Flow**
**Status:** ⏳ Not Started
**Priority:** High

**Objective:**
Build adaptive AI interview system for private partner responses.

**API Endpoints:**
- `POST /interviews` - Start private interview
- `POST /interviews/:id/respond` - Submit user response
- `GET /interviews/:id` - Get interview progress
- `POST /interviews/:id/complete` - Finalize interview

**Features:**
1. Adaptive questioning (AI determines next question based on responses)
2. Mandatory data collection:
   - Trigger event (what happened)
   - Emotional response (how they feel)
   - Partner intent interpretation
   - Underlying need
   - Resolution hope
3. Voice input support (Whisper transcription)
4. Draft auto-save
5. Response review before submission

**AI Integration:**
- Use GPT-4 for conversational interview
- Store Q&A in Interview.responses (JSONB)
- Track completion status

**Files:**
- `backend/src/modules/interviews/interviews.module.ts`
- `backend/src/modules/interviews/interviews.service.ts`
- `backend/src/modules/interviews/interviews.controller.ts`
- `backend/src/modules/interviews/dto/*.dto.ts`

---

### **Batch 7: AI Unpacking**
**Status:** ⏳ Not Started
**Priority:** High

**Objective:**
Generate relationship insights from both partners' interviews using AI.

**API Endpoints:**
- `POST /sessions/:id/generate-unpacking` - Trigger AI unpacking
- `GET /sessions/:id/unpacking` - Get unpacking results
- `POST /sessions/:id/unpacking/feedback` - Submit feedback if inaccurate

**Features:**
1. Analyze both interviews together
2. Generate insights with positive intent framing
3. Identify shared truths
4. Detect patterns (if multiple sessions exist)
5. Store unpacking results

**AI Requirements:**
- Use GPT-4 for unpacking generation
- Implement positive intent framing rules:
  - Never say "you always" or "you never"
  - Reframe negative behaviors positively
  - Show both partners are on same team
- Pattern recognition across past sessions

**Database:**
- New `unpackings` table needed:
  - `id`, `sessionId`, `content` (JSONB), `createdAt`

**Files:**
- `backend/src/modules/unpackings/*.ts`
- `workers/src/processors/unpacking-generator.ts`

---

### **Batch 8: Guided Reconnection**
**Status:** ⏳ Not Started
**Priority:** Medium

**Objective:**
Real-time chat interface with AI facilitation for couple reconnection.

**Features:**
1. WebSocket-based real-time chat
2. AI moderates conversation
3. Detects defensive language and intervenes
4. Guides toward specific commitments
5. Captures and stores commitments

**API/WebSocket:**
- WebSocket connection for real-time chat
- `POST /sessions/:id/commitments` - Record commitments
- `GET /sessions/:id/commitments` - Get saved commitments

**AI Moderation:**
- Detect escalation (blaming, defensiveness, contempt)
- Interject with de-escalation prompts
- Guide toward vulnerability prompts
- Move conversation toward commitments

**Database:**
- New `messages` table:
  - `id`, `sessionId`, `userId`, `content`, `isAI`, `createdAt`
- New `commitments` table:
  - `id`, `sessionId`, `userId`, `commitment`, `agreedAt`

**Files:**
- `backend/src/modules/reconnection/*.ts`
- `backend/src/gateways/chat.gateway.ts`

---

### **Batch 9: React Native Frontend**
**Status:** ⏳ Not Started
**Priority:** Medium

**Objective:**
Build mobile app for iOS/Android.

**Screens to Build:**
1. Authentication (Login/Register)
2. Onboarding Flow
3. Dashboard
4. Invite Partner
5. Private Interview
6. Unpacking View
7. Reconnection Chat
8. Profile/Settings

**Technical Stack:**
- React Native
- React Navigation
- AsyncStorage for tokens
- WebSocket for real-time features
- Voice recording for interviews

**Files:**
- `frontend/src/screens/*.tsx`
- `frontend/src/navigation/*.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/hooks/*.ts`

---

### **Batch 10: Notifications**
**Status:** ⏳ Not Started
**Priority:** Low

**Objective:**
Push notifications and email notifications.

**Features:**
- Partner initiated session → Notify other partner
- Interview ready → Notify
- Unpacking ready → Notify both
- 3-day check-in after resolution

**Services:**
- Push notifications (Firebase/OneSignal)
- Email (SendGrid/AWS SES)

**Database:**
- `notifications` table for tracking delivery

---

## 📋 Technical Debt & Improvements

### **Optional Enhancements:**

1. **Session Status Enum** (Priority 2)
   - Convert `Session.status` from String to Enum
   - Prevents typos like "IN_PROGRES"
   - Migration needed

2. **Cascade Delete Strategy** (Priority 3)
   - Review delete behavior for Couple → Sessions → Interviews
   - Consider `onDelete: Cascade` vs `onDelete: Restrict`

3. **Rate Limiting** (Priority 2)
   - Add rate limiting to auth endpoints
   - Prevent brute force attacks

4. **API Documentation** (Priority 2)
   - Add Swagger/OpenAPI documentation
   - Document all endpoints

5. **E2E Tests** (Priority 3)
   - Add integration tests beyond unit tests
   - Test complete user flows

6. **Performance Monitoring** (Priority 3)
   - Add APM (Application Performance Monitoring)
   - Track slow queries
   - Monitor AI API latency

---

## 🔧 Development Guidelines

### **Code Review Checklist:**
- ✅ All tests passing
- ✅ Build succeeds
- ✅ Proper error handling
- ✅ DTOs have validation
- ✅ No security vulnerabilities
- ✅ Proper indexes on database queries
- ✅ Business logic in services, not controllers

### **Testing Requirements:**
- Unit tests for all services
- Minimum 80% code coverage
- Test error cases, not just happy paths
- Mock external dependencies (Prisma, OpenAI)

### **Git Workflow:**
1. Create feature branch from `main`
2. Implement feature in small, testable commits
3. Run tests locally
4. Push and create PR
5. CI/CD runs tests
6. Code review
7. Merge to main

---

## 📞 Next Steps

**Immediate (This Week):**
1. ✅ Complete Batch 4C (Sessions Management) - **Codex working**
2. Review and test Batch 4C implementation
3. Fix any issues found in review

**Short Term (Next Week):**
1. Start Batch 5 (Worker Infrastructure)
2. Start Batch 6 (Interview Flow)
3. Plan frontend architecture

**Medium Term (Next 2 Weeks):**
1. Complete AI integration (Batches 6-7)
2. Build reconnection chat (Batch 8)
3. Start frontend development (Batch 9)

**Long Term (Month 2):**
1. Complete frontend
2. Add notifications
3. Beta testing with real couples
4. Production deployment

---

## 📚 Reference Documents

- **Design Spec:** `/relationship-app-detailed-design-spec.md`
- **API Docs:** `/docs/api/` (to be created)
- **Architecture:** `/docs/architecture/` (to be created)

---

**Questions or blockers?** Document them in GitHub Issues.
