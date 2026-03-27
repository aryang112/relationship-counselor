# relate

> AI-powered relationship mediator for couples.

When conflict arises, each partner privately shares their side with the AI. **relate** then unpacks both perspectives — revealing insights neither partner could see alone — and guides a reconnection conversation toward shared commitments.

## How It Works

```
1. Private Vent     → Each partner shares their side (private, AI-only)
2. AI Unpacking     → The AI reveals both perspectives (the "magic moment")
3. Reconnection     → Guided conversation with AI mediator
4. Commitment       → Save shared learnings for the future
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native 0.81, Expo 54, TypeScript |
| **Backend** | NestJS, Prisma ORM, PostgreSQL |
| **Workers** | BullMQ, Redis, OpenAI GPT-4 + Whisper |
| **State** | Zustand, TanStack React Query |
| **Navigation** | React Navigation (native-stack + bottom-tabs) |
| **Styling** | Cormorant Garamond + DM Sans, warm-light theme |

## Project Structure

```
relate/
├── frontend/          React Native / Expo app
│   └── src/
│       ├── screens/       37 screens (auth, onboarding, core flow)
│       ├── components/    35 components (ui, domain, layout, feedback)
│       ├── hooks/         Custom hooks (useSession, useInterview, etc.)
│       ├── services/      API client layer (Axios)
│       ├── store/         Zustand stores (auth, session, UI, onboarding)
│       └── theme/         Design system (colors, typography, spacing)
│
├── backend/           NestJS API server
│   ├── src/modules/       Auth, Couples, Sessions, AI, Notifications
│   ├── prisma/            Schema + migrations
│   └── test/              E2E test suites (90+ tests)
│
├── workers/           BullMQ background processors
│   └── src/
│       ├── processors/    Unpacking, Interview, Crisis detection
│       └── services/      OpenAI integration
│
├── database/          Docker init scripts
└── docs/              Historical documentation archive
```

## Quick Start

```bash
# 1. Start the database
docker compose -f docker-compose.db.yml up -d

# 2. Backend
cd backend && npm install
npx prisma migrate deploy && npx prisma generate
npm run start:dev

# 3. Workers (requires Redis + OPENAI_API_KEY in .env)
cd workers && npm install && npm run start:dev

# 4. Frontend
cd frontend && npm install && npx expo start
```

## Testing

```bash
npm run test --workspace=backend    # Unit tests
npm run test:e2e                     # E2E tests
cd frontend && npx tsc --noEmit     # TypeScript check
```

## For AI Agents

See [`AGENT_HANDBOOK.md`](./AGENT_HANDBOOK.md) for comprehensive project context, architecture, API reference, design system spec, and coding standards. See [`CLAUDE.md`](./CLAUDE.md) for Claude Code-specific instructions.

## License

Private — All rights reserved.
