# Backend - NestJS API Server

RESTful API server with state machine for managing mediation sessions.

## Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/                # Authentication & authorization
│   │   ├── users/               # User management
│   │   ├── sessions/            # Mediation session management
│   │   │   ├── dto/             # Data transfer objects
│   │   │   └── entities/        # Database entities
│   │   ├── interviews/          # Private interview management
│   │   ├── unpacking/           # AI unpacking results
│   │   ├── reconnection/        # Guided reconnection chat
│   │   ├── notifications/       # Push & email notifications
│   │   ├── profiles/            # Personality profiles
│   │   └── ai/                  # AI integration
│   │       ├── extractor/       # Extract structured data from interviews
│   │       ├── synthesizer/     # Generate unpacking insights
│   │       └── validator/       # Validate AI outputs
│   ├── common/                  # Shared utilities
│   │   ├── decorators/          # Custom decorators
│   │   ├── filters/             # Exception filters
│   │   ├── guards/              # Auth guards
│   │   ├── interceptors/        # Request/response interceptors
│   │   └── pipes/               # Validation pipes
│   ├── config/                  # Configuration
│   └── database/                # Database config
│       ├── migrations/          # Database migrations
│       └── seeds/               # Seed data
```

## Key Features

- RESTful API with state machine for session flow
- WebSocket support for real-time updates
- Job queue integration (BullMQ)
- JWT authentication
- Rate limiting & security
- OpenAI API integration
- Email & push notification service

## Tech Stack

- NestJS
- Fastify
- TypeORM/Prisma (TBD)
- PostgreSQL
- Redis
- BullMQ
- Passport (JWT)
- OpenAI SDK
