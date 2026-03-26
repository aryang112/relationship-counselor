# Onboarding Questions Reference

Complete inventory of every question asked during the Relate onboarding flow. All questions run before account creation (quiz-first pattern). Data is stored locally in `onboardingStore` and submitted to the backend in `finishOnboarding()` after auth.

**Flow order:** Splash > Promise > YourName > CommunicationStyle > ConflictFeelings > PartnerDetails (4 sub-steps) > ConflictPreferences > CreateAccount > Consent > ...

**Progress bar:** Starts at 15% (endowed progress effect) and fills across the 5 quiz screens.

---

## Screen 1: YourNameScreen

**File:** `frontend/src/screens/onboarding/YourNameScreen.tsx`

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 1 | "What's your first name?" | Free text (TextInput, auto-focused) | N/A | `firstName` | Personalization -- AI and UI address the user by name throughout sessions |
| 2 | "How do you identify?" | Single select (gender pills) | `Male`, `Female`, `Non-binary`, `Prefer not to say` | `gender` | Gender-aware AI tone: men get action-oriented "coach" voice, women get validation-first "best friend" voice, non-binary/unspecified get warm universal language |

**Validation:** "Next" button disabled until `firstName` is non-empty. Gender is optional.

---

## Screen 2: CommunicationStyleScreen

**File:** `frontend/src/screens/onboarding/CommunicationStyleScreen.tsx`

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 3 | "When you're upset, you tend to..." | Multi-select (pill chips) | `I withdraw and go quiet` (withdraw), `I need to talk it out immediately` (talk), `I overthink and analyze everything` (analyze), `I get emotional and reactive` (emotional), `I avoid the topic entirely` (avoid) | `communicationStyles` | Maps **conflict role** (pursuer vs. withdrawer). AI uses this to identify the user's negative cycle position and tailor de-escalation -- e.g., pursuers get coached to slow down, withdrawers get coached to stay engaged |

**Subtitle:** "Select all that apply."
**Validation:** "Continue" button hidden until at least 1 option selected.

---

## Screen 3: ConflictFeelingsScreen

**File:** `frontend/src/screens/onboarding/ConflictFeelingsScreen.tsx`

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 4 | "In a fight, what hurts most?" | Multi-select (pill chips) | `Feeling unheard or dismissed` (unheard), `Being blamed or criticized` (blamed), `Feeling abandoned or shut out` (abandoned), `Feeling controlled or pressured` (controlled), `Being misunderstood` (misunderstood) | `conflictFeelings` | Maps **vulnerability triggers and raw spots**. AI avoids language that hits these pain points and validates these specific feelings during mediation |

**Subtitle:** "Select all that apply."
**Validation:** "Continue" button hidden until at least 1 option selected.

---

## Screen 4: PartnerDetailsScreen (4 sub-steps)

**File:** `frontend/src/screens/onboarding/PartnerDetailsScreen.tsx`

This screen has 4 internal steps with dot indicators at the bottom.

### Sub-step 1: Partner Name + Gender

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 5a | "What's your partner's first name?" | Free text (TextInput, auto-focused) | N/A | `partnerName` | Personalization -- AI references partner by name in session prompts and UI copy |
| 5b | "How does your partner identify?" | Single select (gender pills) | `Male`, `Female`, `Non-binary`, `Prefer not to say` | `partnerGender` | Gender-aware AI tone calibration for the partner. Also drives pronoun rendering throughout the app via `PRONOUN_MAP` (he/she/they) |

**Subtitle (5a):** "They'll see their name throughout the experience."
**Validation:** "Next" button disabled until `partnerName` is non-empty. Gender is optional.

### Sub-step 2: Partner Communication Style

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 6 | "When {partnerName} is upset, {pronoun} tend(s) to..." | Multi-select (pill chips) | `{Pronoun} withdraw(s) and go(es) quiet` (withdraw), `{Pronoun} need(s) to talk it out immediately` (talk), `{Pronoun} overthink(s) and analyze(s) everything` (analyze), `{Pronoun} get(s) emotional and reactive` (emotional), `{Pronoun} avoid(s) the topic entirely` (avoid) | `partnerCommunicationStyles` | Maps **partner's conflict role** from the user's perspective. Combined with the user's own style, the AI identifies the **negative cycle** (e.g., pursue-withdraw) and tailors interventions |

**Subtitle:** "Your best guess is enough."
**Note:** Option labels are dynamically conjugated based on partner's gender pronoun (he/she/they).
**Validation:** "Next" button disabled until at least 1 option selected.

### Sub-step 3: What Hurts Partner Most

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 7 | "What do you think hurts {partnerName} most?" | Multi-select (pill chips) | `Feeling unheard or dismissed` (unheard), `Being blamed or criticized` (blamed), `Feeling abandoned or shut out` (abandoned), `Feeling controlled or pressured` (controlled), `Being misunderstood` (misunderstood) | `partnerConflictFeelings` | Maps **partner's vulnerability triggers** from user's perspective. AI uses this to coach the user on what to avoid saying and to frame partner's behavior in context of their pain points |

**Subtitle:** "Understanding this helps create better conversations."
**Validation:** "Next" button disabled until at least 1 option selected.

### Sub-step 4: How You Met

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 8 | "Where did you and {partnerName} first meet?" | Single select (pill chips -- only one selectable) | `Dating app` (dating-app), `Through friends` (through-friends), `Work or school` (work-school), `Bar or restaurant` (bar-restaurant), `Event or party` (event-party), `Online (not dating app)` (online-other), `Through family` (through-family), `Somewhere else` (other) | `howMet` | Builds **emotional investment** and provides relationship context. AI can reference shared origin story during de-escalation to remind partners of their connection |

**Subtitle:** "A little context helps us understand your story."
**Validation:** "Continue" button disabled until 1 option selected.

---

## Screen 5: ConflictPreferencesScreen

**File:** `frontend/src/screens/onboarding/ConflictPreferencesScreen.tsx`

This screen has 3 sections displayed on a single scrollable page.

### Section 1: Resolution Speed

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 9 | "When there's conflict, how quickly do you want to resolve it?" | Single select (radio cards) | `I want to fix it right away` -- Same day (fast), `I need a little time to cool off` -- A day or two (medium), `I need space before I can talk` -- Several days (slow) | `resolutionSpeed` | Maps **resolution timeline expectations**. When partners have mismatched speeds, the AI mediates by validating both needs -- e.g., reassuring the fast resolver that space is not rejection, and the slow resolver that urgency is not pressure |

### Section 2: Attachment Style

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 10 | "Which best describes you in relationships?" | Single select (radio cards) | `Secure` -- "I feel comfortable with closeness and independence", `Anxious` -- "I worry about being abandoned or not loved enough", `Avoidant` -- "I tend to pull away when things get too close", `Not sure` -- "I don't know my attachment style" | `attachmentStyle` | Maps **attachment style** for the AI to adapt its mediation strategy. Anxious users get reassurance-first language; avoidant users get space-respecting prompts; secure users get direct coaching. The anxious-avoidant trap is specifically flagged for intervention |

### Section 3: Past Conflict Patterns

| # | Question Text | Input Type | Options | Store Field | De-escalation Purpose |
|---|--------------|------------|---------|-------------|----------------------|
| 11 | "Patterns that show up in your relationship" | Multi-select (pill chips) | `Same fight, different day` (same-fight), `Stonewalling / silent treatment` (stonewalling), `Things escalate quickly` (escalation), `Keeping score of past wrongs` (score-keeping), `Avoiding hard conversations` (avoidance), `Blame and defensiveness` (blame) | `pastConflictPatterns` | Maps **Gottman's Four Horsemen** patterns (criticism, contempt, defensiveness, stonewalling) and other recurring toxic cycles. AI uses these to name the pattern during mediation and offer specific alternatives |

**Subtitle (Section 3):** "Select any that feel familiar. Optional."
**Validation:** "Continue" button disabled until both `resolutionSpeed` and `attachmentStyle` are selected. `pastConflictPatterns` is optional.

---

## Summary

| Screen | Questions | Total Fields Collected |
|--------|-----------|----------------------|
| YourNameScreen | 2 (name + gender) | `firstName`, `gender` |
| CommunicationStyleScreen | 1 (communication style) | `communicationStyles` |
| ConflictFeelingsScreen | 1 (conflict feelings) | `conflictFeelings` |
| PartnerDetailsScreen | 4 sub-steps (partner name+gender, partner comm style, partner conflict feelings, how met) | `partnerName`, `partnerGender`, `partnerCommunicationStyles`, `partnerConflictFeelings`, `howMet` |
| ConflictPreferencesScreen | 3 sections (resolution speed, attachment, patterns) | `resolutionSpeed`, `attachmentStyle`, `pastConflictPatterns` |
| **Total** | **11 questions across 5 screens** | **13 store fields** |

### Data Submission

All fields are submitted to the backend via `submitCoupleOnboarding()` in `finishOnboarding()` (called from OnboardingNavigator after the Tutorial screen). The payload structure:

```typescript
{
  datingStartDate?: string,
  data: {
    communicationStyles: string[],
    conflictFeelings: string[],
    isLongDistance: boolean | null,
    howMet: string,
    firstDateLocation: string,
    partnerName: string,
    partnerGender: Gender,
    partnerCommunicationStyles: string[],
    partnerConflictFeelings: string[],
    loveReasons: [string, string, string],
    favoriteMemory: string,
    relationshipStrengths: string[],
    resolutionSpeed: string,
    attachmentStyle: string,
    pastConflictPatterns: string[],
  }
}
```

**Note:** Some fields in the store (`datingStartDate`, `isLongDistance`, `firstDateLocation`, `loveReasons`, `favoriteMemory`, `relationshipStrengths`) are defined but not currently collected by any active onboarding screen. They are legacy fields from deleted screens (RelationshipStory, LoveBank) and are submitted as empty defaults.
