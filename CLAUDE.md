# Relate App — Claude Code Instructions

## MANDATORY First Step
Before doing ANY work, read `AGENT_HANDBOOK.md` in this repo root. It contains the complete project context, architecture, design system, API reference, coding standards, and task status. This is non-negotiable — reading it prevents wasted effort and duplicated work.

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
