# AI Workers - Relationship Mediation

Background job processors for AI-powered relationship mediation features.

## Features

- **Interview Handler**: Generates adaptive interview questions using GPT-4
- **Unpacking Generator**: Analyzes both partners' responses to create relationship insights
- **Crisis Detector**: Identifies concerning language requiring intervention

## Architecture

- **Queue System**: BullMQ for reliable job processing
- **Redis**: Job queue storage and state management
- **OpenAI API**: GPT-4 for AI operations, Whisper for audio transcription

## Setup

### Prerequisites

- Redis server running locally or accessible remotely
- OpenAI API key with access to GPT-4

### Environment Variables

Add to `backend/.env` (workers will load this file):

```env
# Database (Prisma for workers)
DATABASE_URL=postgresql://user:password@localhost:5432/relation_counselor

# Redis Configuration (prefer URL; host/port as fallback)
REDIS_URL=redis://localhost:6379
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=  # Optional

# OpenAI Configuration
OPENAI_API_KEY=sk-...  # Required
# Optional: override models
# OPENAI_MODEL=gpt-4o
# OPENAI_MODEL_FAST=gpt-4o-mini
```

### Installation

\`\`\`bash
# From repository root
npm install --workspace=workers
\`\`\`

## Development

### Start Workers

\`\`\`bash
# From repository root
npm run dev:workers
\`\`\`

### Build

\`\`\`bash
npm run build --workspace=workers
\`\`\`

### Test

\`\`\`bash
npm test --workspace=workers
\`\`\`

## Production

### Start Workers

\`\`\`bash
npm run build --workspace=workers
npm start --workspace=workers
\`\`\`
