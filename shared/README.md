# Shared

Shared types, utilities, and constants used across frontend, backend, and workers.

## Structure

```
shared/
├── types/               # TypeScript types and interfaces
└── utils/               # Shared utility functions
└── constants/           # Shared constants
```

## Shared Types

### Session Types
```typescript
enum SessionStatus {
  INITIATED = 'initiated',
  PARTNER_A_COMPLETE = 'partner_a_complete',
  BOTH_COMPLETE = 'both_complete',
  UNPACKING_READY = 'unpacking_ready',
  RECONNECTION_ACTIVE = 'reconnection_active',
  RESOLVED = 'resolved',
  ABANDONED = 'abandoned'
}
```

### Interview Types
```typescript
interface MandatoryData {
  trigger_event: boolean;
  emotional_response: boolean;
  partner_intent: boolean;
  underlying_need: boolean;
  resolution_hope: boolean;
}
```

### Unpacking Types
```typescript
interface Unpacking {
  surface_conflict: string;
  partner_a_emotional_experience: string;
  partner_b_emotional_experience: string;
  shared_truths: string[];
  deeper_insight: string;
  pattern_recognition: string | null;
  tone: 'empathetic' | 'neutral';
}
```

### Profile Types
```typescript
interface PersonalityProfile {
  communication_style: CommunicationStyle;
  emotional_patterns: EmotionalPatterns;
  conflict_style: ConflictStyle;
  relationship_values: RelationshipValues;
}
```

## Benefits

- Type safety across all services
- Single source of truth for shared logic
- Easier refactoring and maintenance
- Consistent data structures
