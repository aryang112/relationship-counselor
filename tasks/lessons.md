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
