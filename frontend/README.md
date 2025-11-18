# Frontend - React Native Mobile App

Mobile application for couples to participate in AI-guided mediation sessions.

## Structure

```
frontend/
├── src/
│   ├── screens/              # Screen components
│   │   ├── onboarding/       # Sign up, partner invite, agreement
│   │   ├── dashboard/        # Main dashboard
│   │   ├── session/          # Session overview screens
│   │   ├── interview/        # Private interview screens
│   │   ├── unpacking/        # AI unpacking view
│   │   ├── reconnection/     # Guided reconnection chat
│   │   ├── profile/          # User profile
│   │   └── settings/         # App settings
│   ├── components/           # Reusable components
│   │   ├── common/           # Buttons, inputs, cards, etc.
│   │   ├── session/          # Session-specific components
│   │   ├── interview/        # Interview components
│   │   ├── unpacking/        # Unpacking components
│   │   └── reconnection/     # Reconnection components
│   ├── navigation/           # Navigation configuration
│   ├── services/             # API and external services
│   │   ├── api/              # API client
│   │   ├── storage/          # Local storage
│   │   ├── notifications/    # Push notifications
│   │   └── audio/            # Voice recording & playback
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript types
│   ├── assets/               # Images, fonts, etc.
│   ├── theme/                # Theme configuration
│   └── store/                # State management
```

## Key Features

- Voice input with real-time transcription
- Adaptive conversational interface
- Real-time sync between partners
- Push notifications
- End-to-end encryption

## Tech Stack

- React Native
- TypeScript
- React Navigation
- State Management (TBD: Redux/Zustand/Context)
- API Client (TBD: Axios/Fetch)
- Audio Recording (TBD: react-native-audio-recorder)
