# Relate App — Lessons Learned

> Updated after any correction from the user or discovery during implementation.
> Read this at session start to avoid repeating mistakes.

---

## Session 2026-03-22: Partner B Entry Flow

### 1. Always Maintain State Files
**Mistake:** Completed full implementation without updating `state.md`, `tasks/lessons.md`, or `docs/CODEMAP.md`.
**Rule:** After EVERY implementation session, update state files BEFORE marking work done. This is not optional — it's how agents share knowledge.
**Pattern:** Final step checklist:
1. `state.md` — what was done, what's active, next actions
2. `tasks/lessons.md` — any corrections or discoveries
3. `docs/CODEMAP.md` — new files, updated API routes, schema changes
4. `AGENT_HANDBOOK.md` §12 — mark tasks complete, add new ones
5. Auto-memory `MEMORY.md` — stable patterns, key decisions

### 2. Subagent State File Updates
**Issue:** Subagents don't update state files — they just return results to the main agent.
**Rule:** The MAIN agent is responsible for documenting all subagent work in state files. Don't assume subagents will do it.

### 3. Prisma Schema Field Placement
**Pattern:** When adding new fields to a Prisma model, place them logically grouped (not randomly scattered). The Partner B fields were placed together before `manualReminderSentAt`, which makes semantic sense since they're related to partner flow.

### 4. TypeScript Type Extensions for New Session Statuses
**Pattern:** When adding a new session status, you must update:
- Backend: `ALLOWED_TRANSITIONS`, `validStatuses`, `calculateSessionStatus()`
- Frontend: `SessionStatus` type union, `StatusBadge` config, `SessionDetailScreen` status labels
- Frontend: `isActive()` helper (check if the new status should be considered "active")
- Frontend: `HomeScreen` active session card routing logic

### 5. InterviewAIService Already in Module Providers
**Discovery:** `InterviewAIService` was already registered as a provider in `sessions.module.ts`, so adding it to `SessionsService` constructor just worked without module changes. NestJS DI resolves it automatically.
**Rule:** Check module providers before assuming you need to add new registrations.

### 6. Session getSession() Returns All Fields
**Discovery:** The `getSession` service method sanitizes interviews (strips responses/notes) but returns all session-level fields via `...session` spread. So `partnerAExtraction` (a Json? field) is available in the response even though it's not explicitly in the return type.
**Gotcha:** TypeScript won't know about it since the return isn't explicitly typed — cast as needed.

### 7. Parallel Agent Strategy Works Well
**Pattern:** For the Partner B flow, launching backend and frontend agents in parallel (after completing foundation/shared types work) was efficient. Total wall-clock time ~4 minutes for both. Key requirement: give each agent FULL context (design system values, file contents, exact edit specs).

### 8. Migration Naming Convention
**Pattern:** Use descriptive migration names: `add_partner_b_entry_fields`. Prisma auto-prepends the timestamp.

---

## Session 2026-03-22 (Session 2): Auth Fixes + Dynamic AI + Gender-Aware Language

### 9. SecureStore Persists Across App Restarts
**Issue:** Auth tokens and onboarding flags survive app restarts, so simulator shows "already logged in" state even after backend DB reset.
**Rule:** Auth boot sequence must ALWAYS validate JWT against backend (`GET /auth/me`) before trusting local SecureStore data. On failure, clear ALL stored auth data (token, user, onboarding flags).

### 10. Auth Return Objects Must Include All Needed User Fields
**Issue:** `register()`, `login()`, `validateUser()` only returned `{ id, email, name }` — gender was missing, preventing frontend from personalizing UI.
**Rule:** When adding a new user field that frontend needs, update ALL THREE auth return objects (register, login, validateUser).

### 11. Hardcoded Strings in Hooks Are a Maintenance Burden
**Issue:** Interview questions were hardcoded in `useInterview.ts`, making them impossible to personalize.
**Pattern:** For strings that may need personalization (gender, language, A/B testing), centralize them in a utility file (e.g., `genderCopy.ts`) and consume via a lookup function.

### 12. RootNavigator Auth Gate Determines Everything
**Issue:** `RootNavigator` gates on `isAuthenticated` first, which means unauthenticated users can NEVER see onboarding screens.
**Pattern:** When reordering flows (e.g., onboarding before auth), must restructure RootNavigator's conditional logic. The key insight: show OnboardingNavigator for `!onboardingDone` regardless of auth state, and embed Register inside the onboarding flow.

### 13. YourNameScreen updateProfile() Timing
**Issue:** User originally set `name: email.split('@')[0]` during registration. Real name entered in YourNameScreen but only sent to backend during `finishOnboarding()` (too late for Agreement screen).
**Fix:** Call `updateProfile()` immediately in YourNameScreen. BUT when reordering onboarding before auth, YourNameScreen runs pre-auth, so updateProfile can't be called. Solution: store locally and call updateProfile after auth.

### 14. Agreement Screen Needs Polling for Partner Signature
**Pattern:** Any screen that waits for the other partner's action needs polling (GET request at regular intervals). The AgreementScreen had no polling — partner's signature was never detected.

---

## Session 2026-03-23: Keyboard Done Bar Consistency

### 15. Every Screen with TextInput Needs KeyboardDoneBar on iOS
**Issue:** AcceptInviteScreen (and 5 others) had no iOS "Done" button above keyboard. Users were trapped — couldn't dismiss keyboard, especially on multiline inputs.
**Rule:** When creating ANY screen with a TextInput or Input component, ALWAYS:
1. Import `KeyboardDoneBar` and `KEYBOARD_DONE_ID` from `../../components/ui/KeyboardDoneBar`
2. Render `<KeyboardDoneBar />` as the first child of `<SafeArea>`
3. Add `inputAccessoryViewID={KEYBOARD_DONE_ID}` to EVERY TextInput/Input on the screen
**Exceptions:** Chat interfaces (InterviewScreen, ReconnectionScreen) use `returnKeyType="send"` with a send button — different pattern, no Done bar.

### 16. Audit All Screens When Fixing a UI Consistency Issue
**Issue:** User reported the problem on AcceptInviteScreen, but 5 other screens had the same missing Done bar.
**Rule:** When a user reports a UI inconsistency, don't just fix the one screen — grep for all screens with the same pattern and fix them all. Use `Grep` for `TextInput|<Input` across `frontend/src/screens/` to find all candidates, then cross-reference with `KeyboardDoneBar` to find gaps.

### 17. Input Component Passes Through All TextInput Props
**Discovery:** The `Input` component uses `{...rest}` spread on the underlying TextInput, so `inputAccessoryViewID`, `returnKeyType`, and other TextInput props pass through automatically. No need to modify the Input component when adding new TextInput props.

---

## Session 2026-03-23 (Session 5): Calming Animation System

### 18. Reanimated `entering` Animations on FlatList Items Need Index for Stagger
**Pattern:** When using `FadeInRight`/`FadeInLeft` with `.delay(index * N)` on FlatList `renderItem`, you must pass `index` from the renderItem callback to the child component. Without it, all items animate simultaneously.
**Gotcha:** The FlatList recycles views, so entering animations only fire when items first mount (not on scroll). This is fine for chat — new messages animate in, old ones are already visible.

### 19. AnimatedPressable for Per-Component Scale Springs
**Pattern:** When each list item needs its own independent scale animation (e.g., pill selection spring), create a small sub-component with its own `useSharedValue`. You can't share a single shared value across multiple items — each needs its own. Use `Animated.createAnimatedComponent(Pressable)` and handle `onPressIn`/`onPressOut` for spring scale effects.
**Existing pattern:** The `Button` component already uses this exact pattern (`AnimatedPressable`, scale 0.97 on press).

### 20. Breathing Animations: Use Easing.inOut(Easing.ease) for Natural Rhythm
**Pattern:** For breathing/pulse animations, `Easing.inOut(Easing.ease)` creates a smooth sine-wave-like rhythm. Combined with `withRepeat(withSequence(expand, contract), -1)`, it feels organic.
**Config:** 3s total cycle (1.5s inhale scale up, 1.5s exhale scale down). Stagger ripple rings by 200ms increments.

### 21. Replace Conditional Render with Opacity for Smooth Transitions
**Pattern:** Instead of `{condition && <Component />}` which makes elements pop in/out, use an always-rendered `Animated.View` with opacity animation + `pointerEvents={'none'}` when hidden. This enables smooth fade transitions.
**Applied to:** Send button in InterviewScreen, Continue button in onboarding (FadeInUp entrance).

### 22. Animated.createAnimatedComponent for Third-Party Components
**Pattern:** `LinearGradient` from expo-linear-gradient can't directly accept animated styles. Wrap it with `Animated.createAnimatedComponent(LinearGradient)` to create `AnimatedLinearGradient`. Same applies to any third-party component.
**Gotcha:** The animated component must accept a `style` prop for this to work.

### 23. Parallel Agent Strategy for Animation Work
**Pattern:** Animation work parallelizes well because each file is independent. Launched 5 agents simultaneously, each handling 1-2 files. Total wall-clock: ~3 min for 10 files.
**Key:** Give each agent the FULL current file content + exact edit specs + design system color values.

---

## Session 2026-03-26: Unpacking Regeneration

### 24. Async Regeneration Needs Polling, Not Single Refresh
**Issue:** After submitting feedback, `sendFeedback()` called `refresh()` once — but regeneration happens asynchronously (AI takes seconds). Single refresh returned stale data.
**Pattern:** For any fire-and-forget backend operation that changes data asynchronously, use client-side polling: capture a "before" marker (e.g., `updatedAt`), poll at intervals, compare to detect change, timeout gracefully.
**Config used:** 3s interval, 10 max attempts (30s timeout).

### 25. Always Add Inline Fallback When Adding Worker Jobs
**Issue:** `regenerate-unpacking` job was enqueued to BullMQ but had no inline fallback when Redis is unavailable — feedback was silently lost.
**Rule:** When adding a new BullMQ job type, ALWAYS add a matching inline fallback in the backend service. Check `enqueueResult.enqueued === false` and fire the inline version. Match the existing pattern (fire-and-forget with `.catch(() => {})`).

---

## Session 2026-03-26 (Sprint 3): App Store Readiness

### 26. Parallel Agent Sprint Orchestration Works at Scale
**Pattern:** 11 tasks across 3 priority waves (P0/P1/P2), 15 agents total, zero merge conflicts. Key: each agent gets FULL context, touches non-overlapping files per wave, master runs TypeScript between waves, state.md append-only updates prevent conflicts.

### 27. Interview Question Generation Was Already Inline
**Discovery:** Unlike unpacking (BullMQ), interview questions call OpenAI directly from `interview-ai.service.ts`. No inline fallback needed.
**Rule:** Before building an inline fallback, trace controller → service to check if BullMQ is involved.

### 28. AI Session Memory is Additive-Only
**Pattern:** `getPastSessionContext()` returns `null` for first-time couples — all prompts work identically without it. This null=no-op pattern makes features safely additive.

### 29. Crisis Detection Must Be Fire-and-Forget
**Pattern:** Crisis check must not block the response. Email is fire-and-forget. The `crisisDetected` flag in the API response drives the frontend modal — email is a bonus.

---

## Session 2026-03-27 (Sprint 4): User Feedback Fixes

### 30. AI Prompt Framing Determines Tone — "Counselor" vs "Friend"
**Issue:** Prompt said "warm empathetic relationship counselor conducting a private interview" — no matter how many "be casual" instructions followed, the AI defaulted to clinical patterns ("It sounds like...", always asking questions).
**Fix:** Changed framing to "close friend you call at midnight". This single reframe changed the entire output tone. The role identity in the first sentence of a system prompt overrides everything else.
**Rule:** When AI output feels robotic despite instructions, change the ROLE IDENTITY, not just add more rules.

### 31. "Don't Repeat" Instructions Don't Work — Give Alternatives Instead
**Issue:** Telling the AI "never repeat the same phrase" doesn't work. LLMs default to a small set of empathy templates due to sycophantic bias.
**Fix:** Instead of "don't repeat", give 7 explicit response types with examples and say "rotate between these, never the same type twice in a row." Positive instructions beat negative ones.
**Source:** Northeastern University anti-sycophancy research, Pi AI design patterns.

### 32. Unpacking Field Mapping Was Wrong — positiveIntents ≠ Experience
**Issue:** `positiveIntents.partnerA` was mapped to `partnerAExperience` DB field, but "positive reframing" is NOT the same as "what they experienced/felt." Cards showed the same generic content.
**Fix:** Updated prompt to generate separate `underlyingNeeds` and `breakthrough` fields. Concatenated positiveIntents + underlyingNeeds into the experience field. Used `breakthrough` as primary for `deeperInsight`.
**Rule:** Always verify that AI output field NAMES match the UI card they'll appear on. Test with real data.

### 33. Fire-and-Forget Inline Generation Needs a Delay
**Issue:** `generateUnpackingInline()` was called fire-and-forget (`.catch(() => {})`) immediately after the DB transaction. The async function re-queried the DB before the transaction was committed, got stale data, and failed silently.
**Fix:** Added 1s `setTimeout` before the inline call + replaced silent `.catch(() => {})` with actual error logging.
**Rule:** Fire-and-forget async functions that re-query the DB need a small delay after the originating transaction. NEVER use silent `.catch(() => {})` — always log errors.

### 34. User Said "Remove It" Twice — Feature Was Re-Added by Agent
**Issue:** User asked to remove emotion pills in an earlier session. Sprint 3 Task 3.7 re-added them because the task plan didn't check user feedback history.
**Rule:** Before building a feature, grep `tasks/lessons.md` and past user feedback for mentions of that feature. If the user explicitly rejected something, don't re-add it.

---

## Session 2026-03-28 (Sprint 5): App Store Compliance

### 35. Audit Existing Code Before Building — Most Features Were Already Done
**Discovery:** 4 of 8 App Store tasks (account deletion, AI consent, privacy/ToS, crisis resources) were already fully implemented from earlier sprints. Could have wasted 4 agent slots building duplicates.
**Rule:** Before planning a sprint from an external spec, run an exploration agent to audit what already exists in the codebase. Cross-reference the spec tasks with existing screens, endpoints, and components.

### 36. Five Parallel Agents on Non-Overlapping Files = Zero Conflicts
**Pattern:** Sprint 5 fired 5 agents simultaneously. Each touched completely different file sets (PaywallScreen, auth endpoints, app.json/PrivacyInfo, seed script, accessibility across screens). Zero merge conflicts, zero TS errors. Key: foundation work (schema, types, store) done by main agent first, then agents branch out.

### 37. RevenueCat IAP Requires Placeholder API Key
**Pattern:** `react-native-purchases` can be installed and code written against it, but the actual API key (`appl_PLACEHOLDER_KEY`) must be configured in RevenueCat dashboard + App Store Connect before testing. The code compiles fine with a placeholder — real key is a deployment step, not a code step.

### 38. PrivacyInfo.xcprivacy Is Required for App Store Submission
**Discovery:** Apple requires this file since 2024. Without it, builds are rejected at technical validation (before human review). Must declare: tracking status, collected data types, and accessed API types (UserDefaults, etc.).
