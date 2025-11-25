import { Queue } from 'bullmq';
import { config } from '../config';

export interface InterviewJobData {
  interviewId: string;
  userId: string;
  sessionId: string;
  userResponse: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  mandatoryData: {
    hasTriggerEvent: boolean;
    hasEmotionalResponse: boolean;
    hasPartnerIntent: boolean;
    hasUnderlyingNeed: boolean;
    hasResolutionHope: boolean;
  };
}

export interface InterviewJobResult {
  nextQuestion: string;
  isComplete: boolean;
}

export const interviewQueue = new Queue<InterviewJobData, InterviewJobResult>(
  config.queues.interview,
  {
    connection: config.redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  }
);
