# App Store Review — Demo Account Credentials

## Demo Accounts

Two pre-configured accounts are available for testing the full mediation flow:

| Account | Email | Password |
|---------|-------|----------|
| Partner A (Alex) | demo-a@relatetogether.app | Demo2026! |
| Partner B (Rebecca) | demo-b@relatetogether.app | Demo2026! |

## What to Test

1. **Login as Partner A** → Home screen shows completed session with topic "Quality Time"
2. **Tap the session** → View full Unpacking (both perspectives, shared truths, insights)
3. **Navigate to Reconnect tab** → See the reconnection conversation
4. **Navigate to Us tab** → See couple profile, love bank entries, saved learnings
5. **Login as Partner B** (on a second device or after signing out) → Same session visible from Partner B's perspective

## Pre-populated Data

- One completed mediation session (topic: weekend quality time disagreement)
- 6 interview responses per partner (realistic conflict dialogue)
- Full AI Unpacking with insights, shared truths, and pattern recognition
- 5 reconnection messages (both partners + AI mediator)
- 1 agreed commitment: "We'll alternate weekend plans"
- 2 love bank entries

## Session Flow (for fresh account testing)

To test the full onboarding + session creation flow:
1. Register a new account
2. Complete behavioral profile quiz (8 screens)
3. Give consent (ToS, Privacy, AI data processing)
4. Invite a partner → Partner joins via invite code
5. Choose subscription or start with 2 free sessions
6. Start a session → Private venting → Wait for partner → View Unpacking → Reconnect → Save commitment

## Running the Seed Script

```bash
cd backend
npm run seed:demo
```
