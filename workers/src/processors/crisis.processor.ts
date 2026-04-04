import { Worker, Job } from 'bullmq';
import { config } from '../config';
import { openAIService } from '../services/openai.service';
import { CrisisJobData, CrisisJobResult } from '../queues/crisis.queue';

export class CrisisProcessor {
  private worker: Worker<CrisisJobData, CrisisJobResult>;

  constructor() {
    this.worker = new Worker<CrisisJobData, CrisisJobResult>(
      config.queues.crisis,
      async (job) => this.processJob(job),
      {
        connection: config.redis,
        concurrency: 10, // High concurrency for time-sensitive crisis detection
      }
    );

    this.setupEventHandlers();
  }

  private async processJob(job: Job<CrisisJobData>): Promise<CrisisJobResult> {
    const { text, userId, sessionId } = job.data;

    console.log(`Processing crisis detection job ${job.id} for user ${userId}`);

    // Detect crisis language using OpenAI
    const detection = await openAIService.detectCrisisLanguage(text);

    // Determine if intervention is required
    const requiresIntervention = detection.isCrisis &&
      (detection.severity === 'high' || detection.severity === 'medium');

    if (requiresIntervention) {
      console.warn(`⚠️ CRISIS DETECTED - Session ${sessionId}, User ${userId}:`, {
        severity: detection.severity,
        concerns: detection.concerns,
      });

      // Structured log for monitoring (Sentry/DataDog picks this up in production)
      console.log('[CRISIS ALERT]', {
        sessionId,
        userId,
        severity: detection.severity,
        concerns: detection.concerns,
      });
    }

    return {
      ...detection,
      requiresIntervention,
    };
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job, result) => {
      if (result.isCrisis) {
        console.log(`⚠️ Crisis detection job ${job.id} completed - CRISIS DETECTED:`, {
          userId: job.data.userId,
          severity: result.severity,
        });
      } else {
        console.log(`✅ Crisis detection job ${job.id} completed - No crisis detected`);
      }
    });

    this.worker.on('failed', (job, error) => {
      console.error(`❌ Crisis detection job ${job?.id} failed:`, {
        userId: job?.data?.userId,
        error: error.message,
      });
    });

    this.worker.on('error', (error) => {
      console.error('Crisis detection worker error:', error);
    });
  }

  async close() {
    await this.worker.close();
  }
}
