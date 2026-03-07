// Re-export interview-related types from session module
// These types are defined in session.ts alongside their parent entities
export type {
  Interview,
  InterviewResponse,
  SubmitInterviewRequest,
  SaveDraftRequest,
} from './session';
