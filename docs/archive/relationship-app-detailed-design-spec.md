# AI Relationship Mediation App - Detailed Design Specification

## Document Purpose
This document provides detailed specifications for implementing the core features of the AI relationship mediation app, including user flows, UI wireframes, AI prompt templates, and interaction patterns.

---

## Table of Contents

1. [Core Design Principles](#core-design-principles)
2. [Complete User Flows](#complete-user-flows)
3. [UI Wireframe Specifications](#ui-wireframe-specifications)
4. [AI Prompt Templates](#ai-prompt-templates)
5. [Personality Profile System](#personality-profile-system)
6. [Notification Strategy](#notification-strategy)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Core Design Principles

### Principle 1: Positive Intent Framing
**Never label behaviors negatively. Always reveal the positive intention underneath.**

| ❌ Avoid | ✅ Use Instead |
|---------|---------------|
| "You shut down" | "You took space when overwhelmed" |
| "You're controlling" | "You need predictability to feel secure" |
| "You always escalate" | "You need to be heard when you're hurt" |
| "You never listen" | "You process information internally first" |

### Principle 2: Transparency with Friction
**Make everything transparent, but add thoughtful friction before potentially hurtful content.**

- AI insights are default and immediate
- Raw responses available but require deliberate choice
- Framing messages set expectations before viewing

### Principle 3: Collaborative, Not Divisive
**Every feature should reinforce "we're working on this together."**

- Notifications emphasize invitation, not accusation
- UI shows both partners' progress equally
- Success framed as couple achievement, not individual

### Principle 4: Respect Autonomy
**Give users control while guiding them toward productive choices.**

- "View now" or "Wait for partner" - their choice
- Can exit mediation at any point
- Optional features clearly marked

---

## Complete User Flows

### Flow 1: Onboarding & Partner Connection

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: USER REGISTRATION (Partner A)                      │
└─────────────────────────────────────────────────────────────┘
Screen: Sign Up
├─ Email input
├─ Password input (8+ chars, shown strength indicator)
├─ Name input
├─ Timezone (auto-detected, can change)
└─ [Create Account] button

↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: INVITE PARTNER                                      │
└─────────────────────────────────────────────────────────────┘
Screen: Invite Your Partner
├─ "This app works best when both partners participate"
├─ Generated invitation link (copy button)
├─ Send via:
│  ├─ WhatsApp
│  ├─ Email
│  └─ Text message
└─ "I'll wait" → Dashboard (shows "Waiting for partner")

↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: PARTNER ACCEPTS (Partner B)                        │
└─────────────────────────────────────────────────────────────┘
Partner B clicks link → Sign up screen (pre-filled couple ID)
├─ Email input
├─ Password input
├─ Name input
├─ Timezone
└─ [Join] button

↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: SHARED AGREEMENT (Both see this)                   │
└─────────────────────────────────────────────────────────────┘
Screen: Our Shared Agreement

"Before we begin, let's agree on how we'll use this together:"

┌────────────────────────────────────────────────────────────┐
│ ✓ We'll use this app together to work through conflicts,  │
│   not individually                                         │
│                                                            │
│ ✓ When one of us starts a mediation, the other will       │
│   participate within 48 hours                              │
│                                                            │
│ ✓ We'll be honest in our responses                        │
│                                                            │
│ ✓ We understand this is not therapy or professional       │
│   counseling, but a tool to help us communicate better    │
│                                                            │
│ ✓ We can pause or exit any mediation session if needed    │
└────────────────────────────────────────────────────────────┘

[Partner A: Not yet signed] [Partner B: Not yet signed]

Both must tap "I agree" → Progress to tutorial

↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: QUICK TUTORIAL (3 screens, swipeable)              │
└─────────────────────────────────────────────────────────────┘

Screen 1: How It Works
"When conflicts happen, here's what we'll do together:"

[Illustration: Two people → Private venting → AI unpacking → Reconnection]

Screen 2: Your Privacy Matters
"Your private responses are encrypted and safe. We'll show you 
insights from both perspectives to help you understand each other."

Screen 3: Ready to Begin
"You're all set! You can start a mediation anytime you need 
to work through something together."

[Get Started] → Dashboard
```

---

### Flow 2: Starting a Mediation Session

```
┌─────────────────────────────────────────────────────────────┐
│ PARTNER A: INITIATING MEDIATION                            │
└─────────────────────────────────────────────────────────────┘

Dashboard Screen
├─ No active sessions
├─ [Start Mediation] button (prominent, center)
└─ Past sessions list (if any)

Partner A taps [Start Mediation]

↓

Confirmation Screen:
┌────────────────────────────────────────────────────────────┐
│ Starting a mediation session                               │
│                                                            │
│ Sarah will be notified and invited to share her            │
│ perspective too. You'll both complete private interviews,  │
│ then see insights together.                                │
│                                                            │
│ This usually takes 15-20 minutes total.                    │
│                                                            │
│ [Cancel] [Yes, let's work through this]                   │
└────────────────────────────────────────────────────────────┘

Partner A taps [Yes, let's work through this]

↓

Session Created:
├─ Session ID generated
├─ Status: "initiated"
├─ Partner B notified (push + email)
└─ Partner A taken to Private Interview

↓

┌─────────────────────────────────────────────────────────────┐
│ PARTNER B: RECEIVING NOTIFICATION                          │
└─────────────────────────────────────────────────────────────┘

Push Notification:
"Alex wants to work through something with you 💙"
[Tap to participate]

Email Subject:
"Alex started a mediation session"

Email Body:
"Hi Sarah,

Alex has started a mediation session and wants to hear your 
perspective too. This is a safe space to share how you're feeling.

[Join the session]

With care,
Your Mediation App"

Partner B taps notification → Taken to session overview

↓

Session Overview Screen (Partner B sees):
┌────────────────────────────────────────────────────────────┐
│ Alex wants to work through something                       │
│                                                            │
│ He's already shared his perspective. Now it's your turn    │
│ to share yours privately.                                  │
│                                                            │
│ After you both share, you'll see insights together that    │
│ help you understand what's really happening.               │
│                                                            │
│ Progress:                                                  │
│ ✓ Alex completed his interview                            │
│ ○ Waiting for you                                         │
│                                                            │
│ [I'm ready to share]                                       │
└────────────────────────────────────────────────────────────┘

Partner B taps [I'm ready to share] → Private Interview
```

---

### Flow 3: Private Interview (Adaptive Conversational Format)

```
┌─────────────────────────────────────────────────────────────┐
│ PRIVATE INTERVIEW SCREEN                                    │
└─────────────────────────────────────────────────────────────┘

Header:
├─ "Private Interview - Only you can see this"
├─ Progress: "Question 1 of ~5" (approximate, adaptive)
└─ [Exit] button (saves draft)

Main Area:
┌────────────────────────────────────────────────────────────┐
│ AI Message:                                                │
│ "Hey Alex, I can tell you're upset. Want to tell me        │
│  what happened?"                                           │
└────────────────────────────────────────────────────────────┘

Input Methods:
┌────────────────────────────────────────────────────────────┐
│ [🎤 Speak]  [⌨️ Type]                                      │
│                                                            │
│ Text input box (if typing)                                 │
│ OR                                                         │
│ "Tap to start speaking..." (if voice)                      │
│                                                            │
│ [Send Response]                                            │
└────────────────────────────────────────────────────────────┘

Voice Input Flow:
User taps [🎤 Speak]
├─ Microphone activates
├─ Live transcription appears in real-time
├─ User can tap [Stop] when done
├─ Transcribed text shown (editable)
└─ User taps [Send Response]

↓

AI Response (adaptive based on what user said):
┌────────────────────────────────────────────────────────────┐
│ AI: "So she canceled your video call last minute. That     │
│      sounds really frustrating."                           │
│                                                            │
│     "What was going through your mind when that happened?" │
└────────────────────────────────────────────────────────────┘

User responds again...

↓

This continues for ~5-7 exchanges until AI has gathered:
✓ The trigger event (what happened)
✓ The emotional response (how they feel)
✓ The interpretation (what they think partner intended)
✓ The underlying need (what they really need)
✓ Their hope for resolution (what they want to happen)

↓

Final Screen:
┌────────────────────────────────────────────────────────────┐
│ "Thank you for sharing, Alex."                             │
│                                                            │
│ "I understand this is difficult. Your perspective is       │
│  important, and Sarah will get to share hers too."         │
│                                                            │
│ "You can review and edit your responses, or submit when    │
│  you're ready."                                            │
│                                                            │
│ [Review my responses]  [Submit Interview]                  │
└────────────────────────────────────────────────────────────┘

User taps [Submit Interview]

↓

Confirmation:
┌────────────────────────────────────────────────────────────┐
│ ✓ Your interview is submitted                              │
│                                                            │
│ "Waiting for Sarah to share her perspective..."            │
│                                                            │
│ Progress:                                                  │
│ ✓ Alex completed (You!)                                    │
│ ○ Sarah hasn't started yet                                │
│                                                            │
│ [Go to Dashboard]                                          │
└────────────────────────────────────────────────────────────┘
```

---

### Flow 4: AI Unpacking Generation & Viewing

```
┌─────────────────────────────────────────────────────────────┐
│ BOTH COMPLETE INTERVIEWS → AI GENERATES UNPACKING           │
└─────────────────────────────────────────────────────────────┘

Backend Process:
1. Detect both interviews submitted
2. Trigger AI unpacking generation (30 sec max)
3. Store unpacking results
4. Update session status: "unpacking_ready"
5. Send notifications to both partners

↓

┌─────────────────────────────────────────────────────────────┐
│ NOTIFICATION TO BOTH PARTNERS                               │
└─────────────────────────────────────────────────────────────┘

Push Notification (Partner A):
"Your unpacking is ready! Sarah hasn't viewed it yet. 
Open to see insights together."

Push Notification (Partner B):
"Your unpacking is ready! Alex is waiting to view it with you."

Both tap notification → Viewing Choice Screen

↓

┌─────────────────────────────────────────────────────────────┐
│ VIEWING CHOICE SCREEN                                       │
└─────────────────────────────────────────────────────────────┘

Partner A sees:
┌────────────────────────────────────────────────────────────┐
│ Your unpacking is ready! 💙                                 │
│                                                            │
│ Sarah hasn't viewed it yet.                                │
│                                                            │
│ You can view it now, or wait to experience it together     │
│ when she's online.                                         │
│                                                            │
│ [View it now]  [Wait for Sarah]                            │
└────────────────────────────────────────────────────────────┘

If Partner A selects [Wait for Sarah]:
├─ Unpacking locked for Partner A
├─ When Partner B opens app, sees: "Alex is waiting to view this with you. Ready?"
├─ When Partner B clicks ready → Both unlock simultaneously
└─ After 24h with no Partner B activity → Auto-unlock with message

If Partner A selects [View it now]:
├─ Partner A sees unpacking immediately
└─ Partner B gets normal unlock (no "waiting" message)

↓

┌─────────────────────────────────────────────────────────────┐
│ UNPACKING SCREEN (What both partners see)                  │
└─────────────────────────────────────────────────────────────┘

Header:
"Here's what I'm seeing..."

Section 1: Surface Conflict
┌────────────────────────────────────────────────────────────┐
│ 📱 THE SURFACE CONFLICT                                     │
│                                                            │
│ Alex is hurt about canceled video call plans. Sarah felt  │
│ torn between competing priorities and ended the call when  │
│ things got heated.                                         │
└────────────────────────────────────────────────────────────┘

Section 2: Emotional Experiences
┌────────────────────────────────────────────────────────────┐
│ 💙 WHAT'S REALLY HAPPENING                                  │
│                                                            │
│ ALEX'S EMOTIONAL EXPERIENCE:                               │
│ You're not just upset about tonight's call - you're       │
│ feeling that familiar worry about being deprioritized.     │
│ When plans change unexpectedly, it triggers your need for  │
│ reliability and consistency in the relationship. You felt  │
│ like you were waiting all day, and the cancellation felt   │
│ like proof that you don't matter as much.                  │
│                                                            │
│ SARAH'S EMOTIONAL EXPERIENCE:                              │
│ You were trying to be there for two people you deeply care │
│ about and felt pulled in opposite directions. When Alex    │
│ expressed hurt, you felt overwhelmed and took space rather │
│ than responding in a way you might regret. You're trying   │
│ to balance your life there with maintaining this           │
│ relationship, and it feels impossible sometimes.           │
└────────────────────────────────────────────────────────────┘

Section 3: Shared Truth
┌────────────────────────────────────────────────────────────┐
│ ❤️ WHAT YOU BOTH SHARE                                      │
│                                                            │
│ ✓ You both deeply care about each other                    │
│ ✓ You're both trying to make this long-distance            │
│   relationship work                                        │
│ ✓ You both felt hurt and guilty about this situation       │
│ ✓ You both want to feel prioritized and understood         │
│ ✓ Neither of you wanted to hurt the other                  │
│                                                            │
│ THIS ISN'T ABOUT TONIGHT'S CALL.                           │
│                                                            │
│ This is about finding balance between connection and       │
│ independence in a long-distance relationship. Alex, you're │
│ seeking reassurance that the distance isn't creating       │
│ emotional distance. Sarah, you're seeking space to have    │
│ your own life while staying connected.                     │
└────────────────────────────────────────────────────────────┘

Section 4: Optional - Pattern Recognition (if applicable)
┌────────────────────────────────────────────────────────────┐
│ 🔄 PATTERN I'M NOTICING                                     │
│                                                            │
│ This is the 3rd time we've worked through issues around    │
│ changed plans. The pattern shows that Alex tends to feel   │
│ anxious when structure changes, and Sarah tends to feel    │
│ trapped when she needs to choose between commitments.      │
│                                                            │
│ Understanding this pattern can help you both anticipate    │
│ and navigate these moments differently in the future.      │
└────────────────────────────────────────────────────────────┘

Bottom of screen:
┌────────────────────────────────────────────────────────────┐
│ [📄 See full interview responses]                          │
│                                                            │
│ [Ready to talk about this] → Guided Reconnection           │
└────────────────────────────────────────────────────────────┘

↓ If user taps [📄 See full interview responses]

Friction Screen:
┌────────────────────────────────────────────────────────────┐
│ Before you view the full interviews...                     │
│                                                            │
│ Remember:                                                  │
│ • These were shared in moments of pain                     │
│ • People often express hurt more harshly than they truly   │
│   feel                                                     │
│ • The insights above are what matter most                  │
│ • Focus on understanding, not defending yourself           │
│                                                            │
│ [Go back]  [I understand - Show me]                        │
└────────────────────────────────────────────────────────────┘

↓ If user taps [I understand - Show me]

Full Interview Responses Screen:
┌────────────────────────────────────────────────────────────┐
│ ALEX SAID:                                                 │
│                                                            │
│ Q: "What happened that upset you?"                         │
│ A: "She said we'd video call tonight and then canceled     │
│     last minute AGAIN for her friends. I feel like I'm     │
│     not a priority."                                       │
│                                                            │
│ Q: "What was going through your mind?"                     │
│ A: "Like I don't matter. I waited all day for this call... │
│                                                            │
│ [Continue showing full Q&A...]                             │
│                                                            │
│ ────────────────────────────────────────────────────────   │
│                                                            │
│ SARAH SAID:                                                │
│                                                            │
│ Q: "What happened from your perspective?"                  │
│ A: "My friend was going through a breakup and needed me... │
│                                                            │
│ [Continue showing full Q&A...]                             │
└────────────────────────────────────────────────────────────┘
```

---

### Flow 5: Guided Reconnection (Phase 3)

```
┌─────────────────────────────────────────────────────────────┐
│ GUIDED RECONNECTION SCREEN                                  │
└─────────────────────────────────────────────────────────────┘

Both partners tap [Ready to talk about this] from unpacking screen

↓

Welcome to Reconnection:
┌────────────────────────────────────────────────────────────┐
│ Let's talk this through together                           │
│                                                            │
│ I'll help guide your conversation to make sure you both    │
│ feel heard and understood.                                 │
│                                                            │
│ You can type or use voice messages. Take your time.        │
│                                                            │
│ [Begin conversation]                                       │
└────────────────────────────────────────────────────────────┘

↓

Chat Interface (iMessage-style):
┌────────────────────────────────────────────────────────────┐
│                                                   [Exit]   │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI: "Alex, now that you both understand what's      │ │
│ │         really happening, what do you want Sarah       │ │
│ │         to know?"                                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│                        ┌──────────────────────────────┐    │
│                        │ Alex: "I don't want you to   │    │
│                        │ feel like you can't have     │    │
│                        │ your own life. I just need..."    │
│                        └──────────────────────────────┘    │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🤖 AI: "Sarah, how does that land for you?"           │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌──────────────────────────────────┐                      │
│ │ Sarah: "I appreciate that. I was │                      │
│ │ so afraid you thought..."        │                      │
│ └──────────────────────────────────┘                      │
│                                                            │
│ [AI analyzes tone, decides whether to continue or         │
│  interject if things get defensive]                       │
│                                                            │
│ ───────────────────────────────────────────────────────    │
│                                                            │
│ Input:                                                     │
│ [🎤 Voice Message]  [Type message...]                      │
│                                                            │
└────────────────────────────────────────────────────────────┘

After 3-5 exchanges where tone is productive:

AI Interjection:
┌────────────────────────────────────────────────────────────┐
│ 🤖 AI: "You're both doing great. I can see you're hearing  │
│         each other."                                       │
│                                                            │
│        "What commitment can you each make to move          │
│         forward from here?"                                │
└────────────────────────────────────────────────────────────┘

↓

Commitment Creation:
Both partners share commitments

Alex: "I'll try to give you more notice when I really need our 
       scheduled calls, so you have time to plan."

Sarah: "I'll be more thoughtful about last-minute changes, and 
        communicate earlier if something comes up."

AI: "These are great commitments. Let me capture these for you."

↓

Commitment Summary Screen:
┌────────────────────────────────────────────────────────────┐
│ Our Commitments                                            │
│                                                            │
│ ALEX COMMITS TO:                                           │
│ "I'll try to give you more notice when I really need our   │
│  scheduled calls, so you have time to plan."               │
│                                                            │
│ SARAH COMMITS TO:                                          │
│ "I'll be more thoughtful about last-minute changes, and    │
│  communicate earlier if something comes up."               │
│                                                            │
│ Do you both agree to these commitments?                    │
│                                                            │
│ Alex: [Yes, I agree]                                       │
│ Sarah: [Yes, I agree]                                      │
└────────────────────────────────────────────────────────────┘

Both tap [Yes, I agree]

↓

Resolution Screen:
┌────────────────────────────────────────────────────────────┐
│ ✓ Session Resolved                                         │
│                                                            │
│ "Great work, both of you. You worked through something     │
│  difficult together."                                      │
│                                                            │
│ Your commitments are saved. I'll check in with you both    │
│ in 3 days to see how things are going.                     │
│                                                            │
│ [Return to Dashboard]                                      │
└────────────────────────────────────────────────────────────┘

↓ 3 days later, both partners receive:

Check-in Notification:
"Hi Alex, just checking in - how have things been since you 
and Sarah worked through your last conflict?"

[Things are better] [Still struggling] [Talk to AI]
```

---

## AI Prompt Templates

### Template 1: Private Interview - Initial Question

```
SYSTEM PROMPT:
You are a compassionate relationship mediator helping someone work through 
a conflict with their partner. Your role is to:

1. Help them articulate what happened and how they feel
2. Ask clarifying questions in a conversational, empathetic way
3. Ensure you gather these MANDATORY data points:
   - The trigger event (what specifically happened)
   - Their emotional response (how they feel now)
   - Their interpretation (what they think partner meant/intended)
   - Their underlying need (what they really need from partner)
   - Their hope for resolution (what they want to happen)

CRITICAL RULES:
- Be warm and empathetic, not clinical
- Ask ONE question at a time
- Reflect back what you hear before asking next question
- Avoid leading questions or taking sides
- If they're vague, ask for specific examples
- If they're blaming, gently redirect to their own feelings
- Never use therapy jargon
- Keep responses under 3 sentences

USER CONTEXT:
- User name: {user_name}
- Partner name: {partner_name}
- Relationship history: {relationship_context}
- Past sessions: {session_count}
- Known patterns: {known_patterns}

CONVERSATION HISTORY:
{conversation_so_far}

MANDATORY DATA CHECKLIST:
[ ] Trigger event described
[ ] Current emotions expressed
[ ] Partner's intent interpreted
[ ] Underlying need articulated
[ ] Resolution hope stated

Continue the interview until all mandatory data is gathered.
```

**Example Exchange:**

```
AI: "Hey Alex, I can tell you're upset. Want to tell me what happened?"

USER: "She canceled our video call again."

AI: "So Sarah canceled your video call. That sounds frustrating. 
     Can you tell me more about what happened leading up to that?"

USER: "We had plans to call at 8pm. I waited and then she texted 
       saying her friend needed her."

AI: "You were waiting for the call, and she texted that her friend 
     needed her instead. How did that make you feel?"

USER: "Like I don't matter. Like she doesn't prioritize me."

AI: "That sounds really painful - feeling like you don't matter to her. 
     When you got that text, what did you think she was saying about 
     your relationship?"

[Conversation continues until AI has all mandatory data points]
```

---

### Template 2: AI Unpacking Generation

```
SYSTEM PROMPT:
You are generating relationship insights for a couple working through conflict.

INPUT DATA:
Partner A ({partner_a_name}) responses:
{partner_a_interview}

Partner B ({partner_b_name}) responses:
{partner_b_interview}

RELATIONSHIP CONTEXT:
- Relationship type: Long-distance
- Past sessions: {past_sessions_summary}
- Known patterns: {known_patterns}
- Partner A personality: {partner_a_profile}
- Partner B personality: {partner_b_profile}

YOUR TASK:
Generate insights in the following structure. Use POSITIVE INTENT FRAMING 
throughout - never label behaviors negatively.

OUTPUT FORMAT (JSON):
{
  "surface_conflict": "1-2 sentence summary of what appears to be happening",
  
  "partner_a_emotional_experience": "2-3 sentences using positive intent framing. 
    Start with their surface emotion, then reveal the deeper fear/need underneath. 
    Use 'you' to speak directly to them.",
  
  "partner_b_emotional_experience": "2-3 sentences using positive intent framing. 
    Same structure as partner A.",
  
  "shared_truths": [
    "Both care deeply about each other",
    "Both are trying to make the relationship work",
    "[Other specific shared truths from this situation]"
  ],
  
  "deeper_insight": "2-3 sentences explaining what this is REALLY about 
    (not the surface issue). Connect to relationship dynamics.",
  
  "pattern_recognition": "If this connects to past sessions, note the pattern. 
    Otherwise, null.",
  
  "tone": "empathetic" // Keep insights warm and hopeful
}

CRITICAL RULES:
1. NEVER say "you always" or "you never" or "you tend to"
2. ALWAYS frame behaviors through positive intent:
   - "shut down" → "took space when overwhelmed"
   - "controlling" → "seeking predictability and security"
   - "clingy" → "seeking connection when anxious"
3. Show both partners they're on the same team
4. Identify shared needs/fears, not opposing positions
5. Make insights specific to THIS couple, not generic
6. Validate both perspectives equally - no side-taking
7. End on hope - this is solvable

Example of POSITIVE INTENT FRAMING:

❌ BAD: "Sarah, when Alex got upset, you did what you usually do - 
         you shut down to avoid conflict."

✅ GOOD: "Sarah, when Alex expressed hurt, you gave yourself space 
          rather than responding in anger - you were trying to 
          protect what you both have."
```

**Example Output:**

```json
{
  "surface_conflict": "Alex is hurt about canceled video call plans. Sarah felt torn between competing priorities and ended the conversation when things got tense.",
  
  "partner_a_emotional_experience": "Alex, when plans changed unexpectedly, you felt that familiar worry about being deprioritized. Your need for reliability and consistency is really important to you - it's how you feel secure in the relationship. When the call was canceled, it wasn't just about tonight; it triggered your deeper fear that the distance might be creating emotional distance too.",
  
  "partner_b_emotional_experience": "Sarah, you were trying to be there for two people you deeply care about and felt torn between them. When Alex expressed hurt, you felt overwhelmed and took space rather than responding in a way you might regret later. You're working hard to balance building your life there while staying connected to Alex, and sometimes it feels like you can't do both without disappointing someone.",
  
  "shared_truths": [
    "You both deeply care about each other",
    "You're both trying to make this long-distance relationship work",
    "You both felt hurt and guilty about what happened",
    "You both want to feel prioritized and understood",
    "Neither of you wanted to hurt the other"
  ],
  
  "deeper_insight": "This isn't about tonight's call. This is about finding balance between connection and independence in a long-distance relationship. Alex, you're seeking reassurance that the distance isn't creating emotional distance. Sarah, you're seeking space to have your own life while staying deeply connected. You're both trying to protect the relationship in different ways.",
  
  "pattern_recognition": "This is the 3rd time you've worked through issues around changed plans. Alex tends to feel anxious when structure changes, and Sarah tends to feel trapped when choosing between commitments. Recognizing this pattern can help you both navigate these moments more gently.",
  
  "tone": "empathetic"
}
```

---

### Template 3: Guided Reconnection - AI Facilitator

```
SYSTEM PROMPT:
You are facilitating a conversation between {partner_a_name} and 
{partner_b_name} after they've both seen the unpacking insights.

CONTEXT:
- Unpacking insights: {unpacking_summary}
- Current conversation: {conversation_history}
- Emotional temperature: {analyze_current_tone}

YOUR ROLE:
1. Ask one partner a vulnerability prompt
2. After they respond, ask the other how it lands
3. Monitor for defensive language or escalation
4. Interject if conversation becomes unproductive
5. Guide toward specific, actionable commitments
6. Celebrate progress

PROMPTING STRATEGY:
- Start with Partner A (who initiated), ask them to respond to unpacking
- Then give Partner B space to respond
- Alternate turns
- After 3-5 productive exchanges, move toward commitments

ESCALATION DETECTION:
If you see these patterns, interject:
- Blaming language ("You always...", "You never...")
- Defensiveness ("That's not true!", "You're wrong about...")
- Contempt (sarcasm, eye-rolling tone)
- Stonewalling (one-word responses, withdrawal)

INTERJECTION EXAMPLES:
If escalating:
"Let's pause for a moment. I can sense some defensiveness creeping in. 
 Sarah, can you share what you're feeling right now without focusing 
 on what Alex did?"

If productive:
"You're both doing great. I can see you're really hearing each other."

COMMITMENT PROMPTS:
After productive dialogue:
"What commitment can you each make to move forward from here?"

"What's one specific thing you can do differently next time this comes up?"

OUTPUT FORMAT:
Return your next message to the couple as plain text (not JSON).
Keep it under 2 sentences unless providing guidance.
```

**Example Conversation Flow:**

```
AI: "Alex, now that you both understand what's really happening, 
     what do you want Sarah to know?"

ALEX: "I don't want you to feel like you can't have your own life. 
       I just need to know I still matter to you even when we're apart."

AI: "Sarah, how does that land for you?"

SARAH: "That means a lot. I was so afraid you thought I didn't care 
        about you. I do care - so much. I just felt stuck between two 
        people I love."

AI: "Alex, hearing that she felt stuck between people she loves - 
     including you - how does that change how you see what happened?"

ALEX: "It helps. I didn't realize she was feeling that torn. I thought 
       she was just choosing her friends over me."

AI: "You're both doing great. I can see you're hearing each other. 
     What commitment can you each make to move forward from here?"
```

---

## Personality Profile System

### Data Points to Extract Over Time

```python
partner_profile = {
    "communication_style": {
        "processing_mode": "external" | "internal",  # talks to process vs thinks first
        "conflict_response": "engage" | "withdraw",   # fights or flights
        "expression_style": "direct" | "indirect",    # says what they mean or hints
        "preferred_medium": "voice" | "text"          # from usage patterns
    },
    
    "emotional_patterns": {
        "primary_emotions": ["anxiety", "hurt", "frustration"],  # most common
        "secondary_emotions": ["anger", "defensiveness"],         # surface emotions
        "triggers": [
            "last-minute plan changes",
            "feeling deprioritized",
            "lack of communication"
        ],
        "soothing_needs": [
            "reassurance of importance",
            "predictability",
            "quality time"
        ]
    },
    
    "conflict_style": {
        "escalation_pattern": "pursues" | "withdraws" | "fluctuates",
        "repair_attempts": ["apologizes first", "suggests solutions", "seeks understanding"],
        "time_to_cool_down": "immediate" | "hours" | "days",
        "defensiveness_triggers": ["feeling blamed", "tone of voice", "interruptions"]
    },
    
    "relationship_values": {
        "love_language": "quality time" | "words of affirmation" | "acts of service" | "physical touch" | "gifts",
        "attachment_style": "secure" | "anxious" | "avoidant" | "fearful-avoidant",
        "core_needs": ["reliability", "freedom", "emotional safety", "validation"]
    },
    
    "learned_from_sessions": {
        "effective_approaches": ["needs time to process before discussing", "responds well to validation"],
        "ineffective_approaches": ["pushing for immediate resolution", "dismissing emotions"],
        "growth_areas": ["expressing needs directly", "listening without defending"],
        "strengths": ["willing to self-reflect", "committed to relationship"]
    }
}
```

### How to Use Profiles in AI Responses

**Example 1: Tailoring Interview Questions**

```
# Partner A (anxious attachment, external processor)
AI: "You seem really upset. Talk me through what happened - sometimes 
     it helps to get it all out."

# Partner B (avoidant attachment, internal processor)  
AI: "Take your time. What's the main thing that's bothering you?"
```

**Example 2: Personalizing Unpacking**

```
# Generic unpacking (avoid this):
"You both want to feel valued in the relationship."

# Personalized unpacking (do this):
"Alex, you felt that familiar anxiety when plans changed - your need 
 for reliability is clashing with Sarah's spontaneous nature right now.
 
 Sarah, you felt overwhelmed trying to be there for multiple people, 
 and when you felt pressured, you withdrew the way you typically do 
 when decisions feel impossible."
```

**Example 3: Adapting Reconnection Guidance**

```
# For Partner A (pursuer who escalates):
AI: "Alex, before you respond, take a breath. Sarah's listening. 
     What do you need from her?"

# For Partner B (withdrawer who shuts down):
AI: "Sarah, I know this is hard. You don't have to have all the 
     answers right now. Just share what you're feeling."
```

---

## Notification Strategy

### Timing & Frequency

| Event | Timing | Channel | Content |
|-------|--------|---------|---------|
| Partner initiates session | Immediate | Push + Email | "Alex wants to work through something with you 💙" |
| 24h no response | 24 hours | Push + Email | Gentle reminder |
| 48h no response | 48 hours | Push only | Final reminder with options |
| Unpacking ready | Immediate | Push + Email | "Your unpacking is ready!" |
| 3-day check-in | 72 hours post-resolution | Push only | "How have things been?" |
| Partner waiting to view together | When other partner online | Push only | "Alex is waiting to view this with you" |

### Notification Copy Examples

**Session Initiation (Partner B receives):**
```
PUSH: "Alex wants to work through something with you 💙"
      Tap to participate

EMAIL:
Subject: Alex started a mediation session

Hi Sarah,

Alex has started a mediation session and wants to hear your perspective too. 
This is a safe space for both of you to share how you're feeling.

When you're ready, take 15-20 minutes to share your side privately. After 
you both share, you'll see insights together that help you understand what's 
really happening.

[Join the session]

With care,
[App Name]
```

**24-Hour Reminder (Partner B hasn't responded):**
```
PUSH: "Alex is waiting to hear your perspective 💭"

EMAIL:
Subject: Gentle reminder - Alex is waiting

Hi Sarah,

Alex shared his perspective 24 hours ago and is waiting to hear from you.

I know it's hard to engage when things are tense. This process works best 
when you both participate within 48 hours while things are still fresh.

Whenever you're ready:
[Share my perspective]

- [App Name]
```

**48-Hour Final Reminder:**
```
PUSH: "Last reminder - mediation session waiting for you"
      [Respond now] [I need more time] [Talk to AI about this]
```

**Unpacking Ready:**
```
PUSH: "Your unpacking is ready! 💙 Sarah hasn't viewed it yet."

EMAIL:
Subject: Your relationship insights are ready

Hi Alex,

You and Sarah have both shared your perspectives. I've analyzed both 
and have insights that will help you understand what's really happening.

Sarah hasn't viewed it yet. You can view it now, or wait to experience 
it together when she's online.

[View insights now] [Wait for Sarah]

- [App Name]
```

**3-Day Check-In:**
```
PUSH: "How have things been since you and Sarah worked through your 
       last conflict?"
       [Things are better] [Still struggling] [Talk to me]
```

---

## Edge Cases & Error Handling

### Edge Case 1: Partner B Never Responds

**Scenario:** Partner A completes interview, Partner B doesn't respond for >48 hours

**Handling:**
1. 24h: Gentle reminder to Partner B
2. 48h: Final reminder with options
3. 72h: Offer Partner A options:

```
┌────────────────────────────────────────────────────────────┐
│ Sarah hasn't responded yet                                 │
│                                                            │
│ This happens sometimes when people need space or aren't    │
│ ready to engage yet.                                       │
│                                                            │
│ What would you like to do?                                 │
│                                                            │
│ ○ Send another gentle reminder                             │
│ ○ Close this session for now                              │
│ ○ Talk to me about how you're feeling about this          │
│                                                            │
│ [Choose option]                                            │
└────────────────────────────────────────────────────────────┘

If Partner A selects "Talk to me":
Offer coping support (NOT unpacking):
- "It's frustrating when your partner isn't ready to engage..."
- Validation without conclusions
- Suggest ways to communicate need for participation
- Option to revisit when both ready
```

**Do NOT provide:**
- Solo unpacking for Partner A
- Conclusions about the conflict
- Advice that validates only one perspective

---

### Edge Case 2: Both Click "Wait for Partner"

**Scenario:** Both partners select "Wait for [partner]" when unpacking is ready

**Handling:**
```
State: Both locked, waiting for each other

When EITHER partner returns and opens app:
┌────────────────────────────────────────────────────────────┐
│ You're both waiting to view this together!                 │
│                                                            │
│ Ready to unlock it now?                                    │
│                                                            │
│ [Yes, view it now] → Unlocks for both immediately          │
└────────────────────────────────────────────────────────────┘
```

---

### Edge Case 3: AI Misinterprets the Conflict

**Scenario:** Unpacking doesn't resonate with one or both partners

**Handling:**
Add feedback mechanism on unpacking screen:

```
Bottom of unpacking screen:
┌────────────────────────────────────────────────────────────┐
│ Does this feel accurate?                                   │
│                                                            │
│ [Yes, this is helpful]  [Something feels off]              │
└────────────────────────────────────────────────────────────┘

If "Something feels off":
┌────────────────────────────────────────────────────────────┐
│ Help me understand what I missed:                          │
│                                                            │
│ ○ This doesn't capture what I'm really upset about         │
│ ○ This doesn't reflect my partner's perspective accurately │
│ ○ This feels too generic                                   │
│ ○ Other: [text input]                                      │
│                                                            │
│ [Generate new unpacking]                                   │
└────────────────────────────────────────────────────────────┘

Backend: Regenerate with additional context from feedback
```

---

### Edge Case 4: User Exits Mid-Interview

**Scenario:** User starts private interview but doesn't complete it

**Handling:**
```
1. Auto-save all responses as drafts (every message)
2. When user exits, show:
   ┌────────────────────────────────────────────────────────┐
   │ Your responses are saved                               │
   │                                                        │
   │ You can come back anytime to continue where you left   │
   │ off. Take your time.                                   │
   │                                                        │
   │ [Return to Dashboard]                                  │
   └────────────────────────────────────────────────────────┘

3. When user returns to session:
   ┌────────────────────────────────────────────────────────┐
   │ Welcome back                                           │
   │                                                        │
   │ You were on question 3 of your interview. Ready to    │
   │ continue?                                              │
   │                                                        │
   │ [Continue interview]  [Start over]                     │
   └────────────────────────────────────────────────────────┘
```

---

### Edge Case 5: Abusive or Crisis Language Detected

**Scenario:** AI detects mention of abuse, suicide, self-harm in responses

**Handling:**
```
Immediate intervention screen (blocks progression):

┌────────────────────────────────────────────────────────────┐
│ ⚠️ We're concerned about your safety                       │
│                                                            │
│ Based on what you've shared, we think you might need      │
│ professional support beyond what this app can provide.     │
│                                                            │
│ IMMEDIATE RESOURCES:                                       │
│                                                            │
│ 🆘 National Domestic Violence Hotline                      │
│    1-800-799-7233                                          │
│    thehotline.org                                          │
│                                                            │
│ 🆘 National Suicide Prevention Lifeline                    │
│    988                                                     │
│    suicidepreventionlifeline.org                           │
│                                                            │
│ 🆘 Crisis Text Line                                        │
│    Text HOME to 741741                                     │
│                                                            │
│ This app is designed for relationship communication,      │
│ not crisis intervention. Please reach out to these         │
│ resources for immediate support.                           │
│                                                            │
│ [I've reached out for help]  [Exit session]               │
└────────────────────────────────────────────────────────────┘

Do not allow session to continue until user acknowledges.
```

---

## Technical Implementation Notes

### Voice Input (Whisper API)

```javascript
// Frontend - Voice Recording
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks = [];

  mediaRecorder.addEventListener("dataavailable", event => {
    audioChunks.push(event.data);
  });

  mediaRecorder.addEventListener("stop", async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    
    // Send to backend for transcription
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });
    
    const { transcription } = await response.json();
    
    // Show transcription in editable text field
    setTranscriptionText(transcription);
  });

  mediaRecorder.start();
  setIsRecording(true);
};

// Backend - Whisper API Integration
app.post('/api/transcribe', async (req, res) => {
  const audioFile = req.files.audio;
  
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "en",
    response_format: "text"
  });
  
  res.json({ transcription });
});
```

### Adaptive Question Flow

```python
# Backend - Interview State Machine
class InterviewManager:
    def __init__(self, user_id, partner_id, session_id):
        self.mandatory_data = {
            "trigger_event": False,
            "emotional_response": False,
            "partner_intent": False,
            "underlying_need": False,
            "resolution_hope": False
        }
        self.conversation_history = []
        self.personality_profile = get_profile(user_id)
    
    def get_next_question(self, user_response):
        # Update conversation history
        self.conversation_history.append({
            "role": "user",
            "content": user_response
        })
        
        # Analyze response to check off mandatory data
        self.update_mandatory_checklist(user_response)
        
        # Generate next question using LLM
        next_question = generate_adaptive_question(
            conversation_history=self.conversation_history,
            mandatory_checklist=self.mandatory_data,
            personality_profile=self.personality_profile
        )
        
        self.conversation_history.append({
            "role": "assistant",
            "content": next_question
        })
        
        return next_question
    
    def is_interview_complete(self):
        return all(self.mandatory_data.values())
```

---

## Next Steps for Development

Based on this design spec, the recommended implementation order:

1. **Week 1-2:** Build onboarding flow (FR-1.x)
2. **Week 3:** Build session initiation + notifications (FR-2.x)
3. **Week 4-5:** Build adaptive private interview (FR-3.x) with voice
4. **Week 6-7:** Build AI unpacking generation (FR-4.x)
5. **Week 8-9:** Build guided reconnection (FR-5.x)
6. **Week 10:** Polish, edge cases, error handling
7. **Week 11-12:** Beta testing with 10 couples

---

**Document Version:** 1.0  
**Last Updated:** November 17, 2025  
**Owner:** Aryan
