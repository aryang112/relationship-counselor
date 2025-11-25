import { Queue } from 'bullmq';
import { config } from '../config';

export interface CrisisJobData {
  interviewId: string;
  userId: string;
  sessionId: string;
  text: string;
  timestamp: Date;
}

export interface CrisisJobResult {
  isCrisis: boolean;
  severity: 'low' | 'medium' | 'high';
  concerns: string[];
  recommendation: string;
  requiresIntervention: boolean;
}

export const crisisQueue = new Queue<CrisisJobData, CrisisJobResult>(
  config.queues.crisis,
  {
    connection: config.redis,
    defaultJobOptions: {
      attempts: 2, // Fewer retries for time-sensitive crisis detection
      backoff: {
        type: 'fixed',
        delay: 1000,
      },
      priority: 1, // High priority for crisis detection
      removeOnComplete: {
        age: 30 * 24 * 3600, // Keep completed jobs for 30 days (compliance)
        count: 10000,
      },
      removeOnFail: {
        age: 90 * 24 * 3600, // Keep failed jobs for 90 days (compliance)
      },
    },
  }
);
