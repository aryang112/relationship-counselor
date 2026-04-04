import { Queue } from 'bullmq';
import { config } from '../config';

export interface UnpackingJobData {
  sessionId: string;
  coupleId: string;
  partnerAInterviewId: string;
  partnerBInterviewId: string;
  partnerAResponses: Record<string, any>;
  partnerBResponses: Record<string, any>;
  pastContext?: string;
}

/**
 * Job data for regenerating unpacking insights based on user feedback.
 * Sent by the backend when a user submits feedback on an existing unpacking.
 */
export interface RegenerateUnpackingJobData {
  sessionId: string;
  unpackingId: string;
  feedbackReason: 'missed_core_issue' | 'inaccurate_partner_perspective' | 'too_generic' | 'other';
  feedbackText: string | undefined;
  previousUnpacking: {
    surfaceConflict: string;
    partnerAExperience: string;
    partnerBExperience: string;
    sharedTruths: any;
    deeperInsight: string;
    patternRecognition: string | null;
  };
  partnerAResponses: Record<string, any>;
  partnerBResponses: Record<string, any>;
}

export interface UnpackingJobResult {
  summary: string;
  sharedTruths: string[];
  positiveIntents: {
    partnerA: string;
    partnerB: string;
  };
  underlyingNeeds: {
    partnerA: string;
    partnerB: string;
  };
  breakthrough: string;
  patterns: string[];
  recommendations: string[];
}

export const unpackingQueue = new Queue<UnpackingJobData, UnpackingJobResult>(
  config.queues.unpacking,
  {
    connection: config.redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep completed jobs for 7 days
        count: 500,
      },
      removeOnFail: {
        age: 14 * 24 * 3600, // Keep failed jobs for 14 days
      },
    },
  }
);
