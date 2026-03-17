import { type UserSummary } from './user';

export type SessionStatus =
  | 'initiated'
  | 'in_progress'
  | 'unpacking_ready'
  | 'reconnection'
  | 'resolved'
  | 'abandoned';

export interface Couple {
  id: string;
  userAId: string;
  userBId: string | null;
  inviteToken: string | null;
  datingStartDate: string | null;
  userASignedAt: string | null;
  userBSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userA: UserSummary;
  userB: UserSummary | null;
}

export interface Session {
  id: string;
  coupleId: string;
  status: SessionStatus;
  initiatedBy: string;
  topic: string | null;
  context: string | null;
  unpackingReadyAt: string | null;
  unpackingAutoUnlockAt: string | null;
  unpackingWaitUserA: boolean;
  unpackingWaitUserB: boolean;
  createdAt: string;
  updatedAt: string;
  interviews?: Interview[];
  unpacking?: Unpacking | null;
}

export interface Interview {
  id: string;
  sessionId: string;
  userId: string;
  responses: InterviewResponse[];
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewResponse {
  question: string;
  answer: string;
  timestamp?: string;
}

export interface Unpacking {
  id: string;
  sessionId: string;
  surfaceConflict: string;
  partnerAExperience: string;
  partnerBExperience: string;
  sharedTruths: string[];
  deeperInsight: string;
  patternRecognition: string | null;
  tone: string;
  feedbackCount: number;
  lastFeedbackReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartSessionRequest {
  topic?: string;
  context?: string;
}

export interface SubmitInterviewRequest {
  responses: InterviewResponse[];
  notes?: string;
}

export interface SaveDraftRequest {
  responses: InterviewResponse[];
  notes?: string;
}

export type UnpackingChoice = 'wait' | 'view';

export type UnpackingFeedbackReason =
  | 'missed_core_issue'
  | 'inaccurate_partner_perspective'
  | 'too_generic'
  | 'other';

export interface SubmitFeedbackRequest {
  feedbackReason: UnpackingFeedbackReason;
  feedbackText?: string;
}
