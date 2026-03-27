# Relate App — Claude Code Instructions

## MANDATORY First Steps (Read Before Writing ANY Code)

**STOP. Before you write a single line of code or make any changes, you MUST read these files IN ORDER:**

1. **`state.md`** — Current working state: what's done, in progress, blocked, next actions. This is the handoff document between ALL agents. If you skip this, you WILL duplicate work or break something another agent built.
2. **`tasks/lessons.md`** — Learnings from past mistakes. Contains rules that prevent repeated errors. READ EVERY ENTRY.
3. **`docs/CODEMAP.md`** — File/module map with purposes and dependencies. Saves tokens by not scanning the entire codebase.
4. **`AGENT_HANDBOOK.md`** — Full project context, architecture, design system, API reference, coding standards, task status.

**This is non-negotiable.** Every agent (main or subagent) must read `state.md` and `tasks/lessons.md` at minimum. Skipping these files wastes tokens, duplicates work, and repeats fixed bugs. If you are a subagent, read `state.md` FIRST to understand what other agents are doing.

## Quick Reference

### What is this project?
AI Relationship Mediator — React Native/Expo frontend + NestJS backend + BullMQ workers. App name: "relate" (lowercase).

### Key Commands
```bash
cd backend && npm run start:dev          # Start backend
cd frontend && npx expo start            # Start frontend
cd frontend && npx tsc --noEmit          # TypeScript check
npm run test --workspace=backend         # Unit tests
npm run test:e2e                         # E2E tests
docker compose -f docker-compose.db.yml up -d  # Start DB
```

### Design System (Warm Light Theme)
- Backgrounds: #FAF7F4 / #F2EDE6 / #FFFFFF
- Accent: #E07832 (orange), #C45A1A (deep), #F0A060 (light)
- Text: #1A1208 / #6B5A4A / #A89880
- Fonts: Cormorant Garamond (display) + DM Sans (body)
- Always import from theme barrel: `import { colors, typography, fontFamilies } from '../../theme';`

### Coding Standards
- Add documentation comments to every file
- Use theme constants (not hardcoded values)
- Use lucide-react-native for icons
- Use react-native-reanimated for animations
- Preserve existing hook integrations when updating screens
- Run `npx tsc --noEmit` before marking work complete

### Agent Orchestration (for large tasks)
1. Read AGENT_HANDBOOK.md + AgentInstructions.md first
2. Fire exploration agents in parallel to understand scope
3. Do foundation/shared work yourself
4. Launch 4-6 background agents with FULL context in each prompt
5. Track with TaskCreate/TaskUpdate
6. Verify everything compiles after all agents finish

### Documentation (MANDATORY — after every implementation)
After completing work, you MUST update these files before marking done:
1. **`state.md`** — Current status, what was completed, next actions (append-only with timestamps)
2. **`docs/CODEMAP.md`** — New files, updated API routes, schema changes
3. **`tasks/lessons.md`** — Any corrections, discoveries, or gotchas found during implementation
4. **`AGENT_HANDBOOK.md`** — Update §12 Task Status (mark completed/add new), §8/§9 (new endpoints/models), §13 Recent Fixes (if bugs found)
5. **Auto-memory** (`~/.claude/projects/.../memory/MEMORY.md`) — Add stable patterns, key decisions, gotchas

Do this at the END of implementation (not during). Subagents are exempt — the main agent documents their work.

**Why this matters:** Every new agent session reads these files first. If you don't update them, the next agent wastes tokens re-discovering what you already know, or worse, makes the same mistakes you already fixed.
