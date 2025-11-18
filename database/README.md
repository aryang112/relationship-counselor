# Database

PostgreSQL database schema, migrations, and seeds.

## Structure

```
database/
├── migrations/          # Database migrations
├── schemas/             # Schema definitions
└── seeds/               # Seed data for development
```

## Key Entities

### Users
- id, email, password_hash, name, timezone
- partner_id (relationship to another user)
- created_at, updated_at

### Sessions
- id, couple_id, status, created_at, updated_at
- status: initiated, partner_a_complete, both_complete, unpacking_ready, reconnection_active, resolved, abandoned

### Interviews
- id, session_id, user_id, conversation_history, extracted_data
- status: in_progress, completed

### Extractions
- id, interview_id, trigger_event, emotions, needs, requests, quotes

### Unpackings
- id, session_id, surface_conflict, partner_a_experience, partner_b_experience
- shared_truths, deeper_insight, pattern_recognition

### Reconnections
- id, session_id, conversation_history, commitments
- status: active, completed

### Commitments
- id, session_id, user_id, commitment_text, agreed_at, check_in_status

### PersonalityProfiles
- id, user_id, communication_style, emotional_patterns, conflict_style
- relationship_values, learned_from_sessions

### Notifications
- id, user_id, type, content, sent_at, read_at

## Relationships

- User has_one Partner (User)
- Couple has_many Sessions
- Session has_two Interviews
- Session has_one Unpacking
- Session has_one Reconnection
- Reconnection has_many Commitments
- User has_one PersonalityProfile
