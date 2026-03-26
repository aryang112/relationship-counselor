/**
 * genderCopy.ts — Gender-aware UI copy for interview and session screens.
 *
 * Centralizes all gender-dependent text so individual screens
 * just call getGenderCopy(gender) and use the result.
 */

type GenderCategory = 'male' | 'female' | 'neutral';

function categorize(gender?: string | null): GenderCategory {
  if (!gender) return 'neutral';
  const g = gender.toLowerCase();
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  return 'neutral';
}

interface GenderCopy {
  loadingMessage: string;
  promptTitle: string;
  promptSub: string;
  promptItalic: string;
  inputPlaceholder: string;
  initialQuestion: string;
  completionMessage: string;
  resumeMessage: string;
  fallbackQuestion: string;
  affirmations: string[];
  preSessionHeadline: string;
}

const COPY: Record<GenderCategory, GenderCopy> = {
  male: {
    loadingMessage: 'Getting things set up for you...',
    promptTitle: "What's going on?",
    promptSub: "No filter needed.",
    promptItalic: "Take your time.",
    inputPlaceholder: "Just say it straight...",
    initialQuestion:
      "Let's get into it. In your own words, what's the situation you want to work through?",
    completionMessage:
      "Solid. You showed up and said what needed to be said. That takes guts. Your responses are locked in — we'll use them to help you both see things more clearly.",
    resumeMessage: "Welcome back. Ready to pick up where you left off?",
    fallbackQuestion: "Can you break that down a bit more for me?",
    affirmations: [
      'Showing up here takes real courage.',
      "Conflict isn't failure — avoidance is.",
      "You're doing the hard thing right now. Respect.",
      "Naming what's wrong is the first step to fixing it.",
      'This is what strength looks like.',
      'You care enough to be here. That matters.',
    ],
    preSessionHeadline: "Your space. Your words.",
  },
  female: {
    loadingMessage: 'Creating your safe space...',
    promptTitle: 'What happened?',
    promptSub: "There's no wrong answer.",
    promptItalic: "Take your time.",
    inputPlaceholder: "Start wherever feels right...",
    initialQuestion:
      "I'm here to listen. What's been weighing on you? Take as much time as you need.",
    completionMessage:
      "Thank you for being so open and honest. Your feelings matter, and everything you shared will help both of you understand each other more deeply.",
    resumeMessage: "Welcome back. I'm right here. Would you like to continue where we left off?",
    fallbackQuestion: "I can sense there's more there. How did that make you feel?",
    affirmations: [
      'The fact that you started this session means you care deeply.',
      'Your feelings are valid, always.',
      'Vulnerability is the birthplace of connection.',
      'You deserve to be heard completely.',
      "You're doing something brave by being here.",
      'Healing starts with the courage to show up.',
    ],
    preSessionHeadline: "This is your space.",
  },
  neutral: {
    loadingMessage: 'Preparing your safe space...',
    promptTitle: 'What happened?',
    promptSub: "There's no wrong answer.",
    promptItalic: "Take your time.",
    inputPlaceholder: "Start wherever feels right...",
    initialQuestion:
      "Let's start by understanding what's been on your mind. In your own words, what's the topic or situation you'd like to work through?",
    completionMessage:
      "Thank you for sharing so openly. Your responses have been recorded and will be used to generate insights for both of you.",
    resumeMessage: "Welcome back. Would you like to pick up where we left off?",
    fallbackQuestion: "Can you tell me a bit more about how that felt for you?",
    affirmations: [
      'The fact that you started this session means you care.',
      'Conflict is not the enemy. Disconnection is.',
      "You both love each other. That's why this hurts.",
      'Vulnerability is the birthplace of connection.',
      "You're doing something brave by being here.",
      'Healing starts with the courage to show up.',
    ],
    preSessionHeadline: "This is your space.",
  },
};

const INITIAL_QUESTIONS: Record<GenderCategory, (name: string) => string> = {
  male: (name) => `Hey ${name}, what's up? Something on your mind you want to work through?`,
  female: (name) => `Hey ${name}, I'm really glad you're here. What's been on your heart lately?`,
  neutral: (name) => `Hey ${name}, glad you're here. What's been on your mind that you'd like to talk through?`,
};

export function getGenderCopy(gender?: string | null, name?: string | null): GenderCopy {
  const category = categorize(gender);
  const copy = { ...COPY[category] };
  const firstName = name?.split(' ')[0] || '';
  if (firstName) {
    copy.initialQuestion = INITIAL_QUESTIONS[category](firstName);
  }
  return copy;
}
