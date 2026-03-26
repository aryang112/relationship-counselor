# Research Findings

> Researched 2026-03-25. Four items investigated: Voice Recording, Push Notifications, Unpacking Content, and Reconnection Chat.

---

## 1. Voice Recording Architecture (Item 5)

### Current Implementation in Relate

The app already has a working voice-to-text pipeline:

- **Frontend recording**: `frontend/src/hooks/useAudioRecorder.ts` uses `expo-audio` (`useAudioRecorder` from expo-audio with `RecordingPresets.HIGH_QUALITY`). Records in m4a format.
- **Frontend upload**: `frontend/src/services/interviews.ts` `transcribeAudio()` sends audio as multipart form data to `POST /api/transcribe`.
- **Backend endpoint**: `backend/src/modules/ai/ai.controller.ts` receives the file (25MB limit via multer), passes to `AiService.transcribeAudio()`.
- **Backend transcription**: `backend/src/modules/ai/ai.service.ts` uses the OpenAI SDK's `openai.audio.transcriptions.create()` with `model: 'whisper-1'` and `language: 'en'`.
- **UI**: `VoiceRecorderButton` component in `InterviewScreen` toggles between text input and voice recording mode.

### How Other Apps Handle Voice-to-Text

**OpenAI ChatGPT App:**
- Uses their own Whisper model (same `whisper-1` that Relate uses).
- The mobile app records audio locally, uploads the full audio file to their API, and gets text back.
- For "Advanced Voice Mode," they use a separate real-time voice model (GPT-4o audio), which is streaming-based via WebSocket. This is a different use case (conversational voice, not dictation).

**Claude Mobile App (Anthropic):**
- Uses native platform speech recognition (Apple Speech framework on iOS, Google Speech on Android).
- This is on-device, free, and instant -- no API cost per transcription.
- Quality is good for short dictation but less accurate for longer, nuanced speech.

**Wispr (wispr.com):**
- Desktop dictation tool that streams audio in real-time via WebSocket to their own fine-tuned speech-to-text model.
- Known for high accuracy because they use context-aware transcription (considers what app you're in, previous text, etc.).
- Their approach is streaming: audio chunks are sent as they are spoken, and partial transcriptions update in real-time.

### Architecture Options for Relate

| Option | Approach | Latency | Cost | Accuracy | Complexity |
|--------|----------|---------|------|----------|------------|
| **1. Current (Whisper API)** | Record full audio -> upload to OpenAI Whisper | 2-5s after recording stops | ~$0.006/min | Very high | Already implemented |
| **2. Native Speech Recognition** | `expo-speech-recognition` or `react-native-voice` using Apple/Google on-device | Real-time (live text) | Free | Good for short text, worse for long | Low |
| **3. Streaming (Wispr-like)** | WebSocket to Whisper or Deepgram/AssemblyAI streaming API | Real-time (live text) | $0.006-0.01/min | Very high | High (WebSocket infra, streaming audio) |
| **4. Hybrid** | Native speech for live preview -> Whisper API for final polish | Instant preview + 2s final | ~$0.006/min | Highest | Medium |

### Recommendation

**Option 1 (current Whisper API approach) is the right choice for Relate.** Reasons:
- It is already implemented and working. The error mentioned is just about calling `setAudioModeAsync` before recording, which is already handled in the `useAudioRecorder` hook.
- Users are dictating short responses (30s-2min), so the 2-5s post-recording delay is acceptable.
- Whisper-1 accuracy is excellent for English conversational speech.
- Streaming adds significant complexity (WebSocket connections, audio chunking, partial result handling) with minimal user benefit for this use case.
- Native speech recognition is less accurate for emotional, nuanced relationship content where every word matters.

**If latency becomes an issue later**, consider Option 4 (hybrid): show a live native transcription preview while recording, then swap in the Whisper result after upload. This gives instant feedback without sacrificing accuracy.

---

## 2. Push Notifications (Items 8, 10, 11)

### Current State -- Surprisingly Well Built

The notification infrastructure is more complete than expected:

**Frontend (ready to use):**
- `frontend/src/hooks/useNotifications.ts` -- already registers for push notifications via `expo-notifications`, gets Expo push token, sets up foreground/background listeners.
- `frontend/src/services/notifications.ts` -- `registerPushToken()` calls `POST /notifications/register` (but the backend endpoint does not exist yet -- it silently fails).
- `frontend/src/navigation/RootNavigator.tsx` -- already calls `registerPushToken(expoPushToken)` when user is authenticated. This means the token registration flow is wired up, just needs the backend endpoint.

**Backend (infra ready, endpoint missing):**
- `backend/src/modules/notifications/notifications.service.ts` -- Full notification service with `send()` method supporting push and email channels.
  - Push: sends via Expo Push API (`https://exp.host/--/api/v2/push/send`) using `EXPO_ACCESS_TOKEN` env var.
  - Email: sends via SMTP (nodemailer) using `SMTP_*` env vars.
  - Gated by `NOTIFICATIONS_PUSH_ENABLED` and `NOTIFICATIONS_EMAIL_ENABLED` env vars.
- `backend/src/modules/notifications/notifications-queue.service.ts` -- BullMQ queue for async notification sending with retry logic (3 attempts, exponential backoff). Falls back to direct send when Redis is not configured.
- `backend/src/modules/notifications/notifications.module.ts` -- NestJS module exporting both services.

**Backend notification calls already in place (but no-ops without push tokens):**
- `notifyPartnerBInvite()` -- sends push+email when Partner A completes interview ("X asked me to reach out to you")
- `schedulePartnerBReminders()` -- schedules 3 follow-up reminders at 4h, 24h, 72h via the notification queue
- `notifyPartnerAStarted()` -- notifies Partner A when Partner B starts their interview
- `notifyUnpackingReady()` -- notifies both partners when unpacking is ready
- `remindPartnerToParticipate()` -- manual "Remind Partner" button endpoint at `POST /sessions/:id/remind-partner`
- Various unpacking-related notifications (partner viewed, unlocked, etc.)

### What's Missing

1. **Backend `POST /notifications/register` endpoint** -- No controller exists to receive and store push tokens. The User model in Prisma has no `pushToken` field. This is the critical gap.

2. **Push token storage** -- The User model needs a `pushToken String?` field (or a separate `PushToken` model to support multiple devices).

3. **Token lookup in notification sends** -- `NotificationsService.send()` accepts `pushToken` in the payload, but the callers in `sessions.service.ts` pass `userId` without looking up the user's push token first. Every `notificationsService.send()` call needs to fetch the user's push token from the DB.

4. **APNs/FCM setup** -- For push notifications to actually reach devices:
   - **iOS (APNs)**: Need an Apple Push Notification service key (.p8 file) uploaded to Expo. This is configured in the Expo dashboard or `eas.json`, not in code.
   - **Android (FCM)**: Need a Firebase project with `google-services.json`. Configure in `app.json` under `expo.android.googleServicesFile`.
   - **Expo Push Service** handles the actual delivery to APNs/FCM -- you just need the `EXPO_ACCESS_TOKEN` (already referenced in the code).

5. **Onboarding notification permission screen** -- Currently, `useNotifications` calls `requestPermissionsAsync()` immediately on mount. Best practice is a "soft ask" screen before the OS permission dialog.

### Onboarding Notification Permission -- Best Practices

**The "Soft Ask" Pattern (recommended):**
1. Show a custom screen explaining WHY notifications matter: "Know when your partner is ready to reconnect" / "Get gentle reminders for your sessions"
2. User taps "Enable Notifications" button
3. THEN trigger the OS permission dialog (`requestPermissionsAsync()`)
4. If denied, gracefully continue without notifications

**Where to place it in onboarding:**
- After Agreement screen, before Tutorial/Home. The user has already committed to the app, and the value prop of notifications is clear ("know when your partner responds").
- Alternative: show it after the first session is created, when the partner notification value is most tangible.

**Screen design recommendations:**
- Illustration of a phone with a sample notification ("Aryan just shared their side")
- Brief copy: 2-3 bullet points on what they'll be notified about
- Primary CTA: "Enable Notifications"
- Secondary link: "Maybe Later" (skip without penalty)
- Do NOT auto-trigger the OS dialog on screen mount

### Implementation Checklist

- [ ] Add `pushToken String?` to User model in Prisma schema
- [ ] Create `POST /notifications/register` endpoint (receive token, save to user)
- [ ] Create `DELETE /notifications/register` endpoint (clear token on logout)
- [ ] Update all `notificationsService.send()` callers to look up pushToken from DB
- [ ] Set `EXPO_ACCESS_TOKEN` env var in production
- [ ] Upload APNs key to Expo dashboard
- [ ] Create `NotificationPermissionScreen` in onboarding flow
- [ ] Move `requestPermissionsAsync()` from hook auto-call to explicit screen trigger
- [ ] Add notification permission screen to OnboardingNavigator after Agreement

---

## 3. Unpacking Content -- "Pending AI Unpacking" (Item 13)

### Root Cause

The "Pending AI unpacking" text is a **placeholder** created by `ensureUnpackingExists()` in `sessions.service.ts` (line ~830). When a session reaches `unpacking_ready` status, it creates an Unpacking record with placeholder text:

```
surfaceConflict: 'Pending AI unpacking'
partnerAExperience: 'Pending AI unpacking'
partnerBExperience: 'Pending AI unpacking'
sharedTruths: []
deeperInsight: 'Pending AI unpacking'
```

The actual AI generation is supposed to happen via a **BullMQ worker**, but it requires Redis to be running.

### The Full Pipeline

1. **Trigger**: When both partners complete their interviews, `submitInterview()` in `sessions.service.ts` detects both are done and transitions the session to `unpacking_ready`.

2. **Placeholder creation**: `ensureUnpackingExists()` creates a placeholder Unpacking record immediately (so the API always returns something).

3. **Job enqueue**: `enqueueUnpackingJob()` calls `unpackingQueue.enqueueGenerateUnpacking()` which adds a job to the BullMQ `unpacking` queue. **This requires Redis** (`REDIS_URL` or `REDIS_HOST` env var). Without Redis, it logs "Skipping unpacking enqueue (queue not configured)" and returns `{ enqueued: false }`.

4. **Worker processing**: The `UnpackingProcessor` in `workers/src/processors/unpacking.processor.ts` picks up the job, calls `openAIService.generateUnpacking()` which uses OpenAI GPT to analyze both partners' responses, then upserts the real content into the `unpackings` table.

5. **OpenAI call**: `workers/src/services/openai.service.ts` sends both partners' interview responses to OpenAI with a system prompt requesting JSON output with: `summary`, `sharedTruths`, `positiveIntents`, `patterns`, `recommendations`.

### Why It Shows "Pending"

The unpacking stays "Pending" because one or more of these are true:
- **Redis is not running** -- the BullMQ queue cannot enqueue jobs without Redis. The `UnpackingQueueService` silently skips.
- **The worker process is not running** -- even if Redis is up, the `workers/` process must be running to consume jobs from the queue.
- **No `OPENAI_API_KEY`** configured in the worker environment.

### What's Needed to Fix

1. **Start Redis**: `docker compose -f docker-compose.db.yml up -d` (check if Redis is included) or run Redis separately.
2. **Set env vars**: `REDIS_URL` or `REDIS_HOST`+`REDIS_PORT` in both backend and worker `.env`.
3. **Set `OPENAI_API_KEY`** in the worker `.env`.
4. **Start the worker**: `cd workers && npm run start` (or however the worker process is launched).
5. **Alternative -- inline generation**: Skip the queue entirely and generate unpacking synchronously in the backend when both interviews complete. This avoids the Redis/worker dependency but blocks the HTTP response for 5-10s during OpenAI generation. Could use a simple async approach: fire-and-forget the generation, let the frontend poll.

### Prisma Schema for Unpacking

The `Unpacking` model (table `unpackings`) has:
- `surfaceConflict` -- neutral summary of the conflict
- `partnerAExperience` -- reframing of Partner A's perspective
- `partnerBExperience` -- reframing of Partner B's perspective
- `sharedTruths` (Json) -- array of validating statements
- `deeperInsight` -- calming next steps/recommendations
- `patternRecognition` -- observed relationship patterns
- `tone` -- always "supportive" from the worker
- `feedbackCount` + `lastFeedbackReason` -- for regeneration feedback loop

---

## 4. Reconnection Chat -- Entirely Stub (Item 16)

### Current State

The `useReconnection` hook at `frontend/src/hooks/useReconnection.ts` is **100% fake**:

- AI messages cycle through 3 hardcoded strings: "Pause for a breath...", "Try naming one need...", "Keep it specific..."
- Partner messages are always: `"${partnerName}: I hear you. I want us to improve this together."`
- After the user sends a message, a fake partner response appears after 1 second via `setTimeout`.
- `completeReconnection()` just calls `updateSessionStatus(sessionId, 'resolved')`.
- No backend communication for messages whatsoever.

The `ReconnectionScreen` at `frontend/src/screens/reconnection/ReconnectionScreen.tsx` is a real UI (chat bubbles, voice button, input bar) but it's wired to this fake hook.

### Backend State

- **Session status machine** supports `reconnection` as a valid status (transitions from `unpacking_ready` to `reconnection`, then to `resolved` or `abandoned`).
- **No reconnection-specific endpoints** exist. No message storage, no real-time sync, no AI mediation endpoint for reconnection.
- **No WebSocket/Gateway** infrastructure exists anywhere in the backend. No `@WebSocketGateway`, no Socket.io, no SSE endpoints.
- The `updateSessionStatus` endpoint (`PATCH /sessions/:id/status`) can transition to `reconnection` and `resolved`, which is the only real backend integration.

### What a Real Implementation Would Need

**Option A: WebSocket-based real-time chat (recommended for best UX)**

1. **WebSocket Gateway** (NestJS `@WebSocketGateway` with Socket.io):
   - `joinSession(sessionId)` -- both partners join a room
   - `sendMessage(sessionId, text)` -- broadcast to partner + trigger AI
   - `typing(sessionId)` -- typing indicators
   - Auth via JWT token in handshake

2. **Message Storage** -- New Prisma model:
   ```
   model ReconnectionMessage {
     id        String   @id @default(uuid())
     sessionId String
     userId    String?  (null for AI messages)
     role      String   (me/partner/ai)
     text      String
     createdAt DateTime @default(now())
   }
   ```

3. **AI Mediation Endpoint** -- After each partner message pair (A sends, B sends), the AI generates a mediation prompt:
   - Takes the full conversation history + unpacking insights
   - Generates a contextual prompt (not cycling through 3 hardcoded strings)
   - Could use the same OpenAI service with a reconnection-specific system prompt

4. **Presence detection** -- Know when both partners are online and in the session

**Option B: Polling-based (simpler, less real-time)**

1. **REST endpoints**:
   - `POST /sessions/:id/reconnection/messages` -- send a message
   - `GET /sessions/:id/reconnection/messages?after=timestamp` -- poll for new messages
   - `POST /sessions/:id/reconnection/ai-prompt` -- request next AI mediation prompt

2. **Frontend polling**: Poll every 2-3 seconds for new messages. Simpler but laggy.

**Option C: Async turn-based (simplest, aligns with app's async nature)**

Since the app already operates asynchronously (Partner A does interview, Partner B does interview later), reconnection could also be async:
1. Partner A writes a message, gets an AI coaching prompt, writes a response.
2. Partner B gets a notification, reads Partner A's messages, gets their own AI coaching, writes responses.
3. Back and forth like messaging, not real-time chat.
4. This is much simpler to build and may actually be more thoughtful/productive than real-time chat.

### Recommendation

**Option C (async turn-based) is the most aligned with Relate's philosophy.** The app is about thoughtful, mediated communication -- not instant messaging. Real-time chat risks escalation. An async approach where each partner gets AI coaching before responding is safer and more therapeutic.

If real-time is desired, Option A (WebSocket) provides the best UX but requires significant infrastructure (Socket.io, presence, message storage, connection management).

### Key Dependencies for Any Option

- Message persistence model in Prisma
- AI mediation service with reconnection-specific prompts that incorporate unpacking insights
- Frontend hook rewrite to replace fake data with real API calls
- Notification when it's your turn to respond (ties into item 2 above)
