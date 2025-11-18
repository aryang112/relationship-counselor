# Workers - Background Job Processors

BullMQ workers for asynchronous AI processing tasks.

## Structure

```
workers/
├── src/
│   ├── jobs/                    # Job definitions
│   ├── processors/              # Job processors
│   │   ├── extraction/          # AI extraction jobs
│   │   ├── synthesis/           # AI synthesis jobs
│   │   └── validation/          # AI validation jobs
│   └── utils/                   # Worker utilities
```

## Job Types

### 1. Extraction Jobs
- Extract structured data from interview responses
- Identify: issues, emotions, needs, requests, quotes
- Run when: Partner completes interview

### 2. Synthesis Jobs
- Generate AI unpacking from both partner extractions
- Create: surface conflict, emotional experiences, shared truths, deeper insights
- Run when: Both partners complete interviews

### 3. Validation Jobs
- Validate AI outputs for quality and safety
- Check for: crisis language, abuse indicators, accuracy
- Run when: AI generates any output

## Tech Stack

- BullMQ
- Redis
- OpenAI SDK
- TypeScript

## Processing Flow

```
Interview Complete → Queue Extraction Job
Both Extracted → Queue Synthesis Job
Synthesis Complete → Queue Validation Job
Validation Pass → Notify Partners
```

## Configuration

- Max retry attempts: 3
- Job timeout: 30 seconds
- Concurrency: 5 jobs per worker
