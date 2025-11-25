import { Worker, Job } from 'bullmq';
import { config } from '../config';
import { openAIService } from '../services/openai.service';
import { UnpackingJobData, UnpackingJobResult } from '../queues/unpacking.queue';

export class UnpackingProcessor {
  private worker: Worker<UnpackingJobData, UnpackingJobResult>;

  constructor() {
    this.worker = new Worker<UnpackingJobData, UnpackingJobResult>(
      config.queues.unpacking,
      async (job) => this.processJob(job),
      {
        connection: config.redis,
        concurrency: 3, // Process up to 3 unpackings concurrently (more resource-intensive)
      }
    );

    this.setupEventHandlers();
  }

  private async processJob(job: Job<UnpackingJobData>): Promise<UnpackingJobResult> {
    const { sessionId, partnerAResponses, partnerBResponses } = job.data;

    console.log(`Processing unpacking job ${job.id} for session ${sessionId}`);

    // Generate unpacking using OpenAI
    const unpacking = await openAIService.generateUnpacking(
      partnerAResponses,
      partnerBResponses
    );

    console.log(`Unpacking for session ${sessionId} generated successfully`);

    return unpacking;
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job, result) => {
      console.log(`✅ Unpacking job ${job.id} completed:`, {
        sessionId: job.data.sessionId,
        sharedTruthsCount: result.sharedTruths.length,
        patternsCount: result.patterns.length,
      });
    });

    this.worker.on('failed', (job, error) => {
      console.error(`❌ Unpacking job ${job?.id} failed:`, {
        sessionId: job?.data?.sessionId,
        error: error.message,
      });
    });

    this.worker.on('error', (error) => {
      console.error('Unpacking worker error:', error);
    });
  }

  async close() {
    await this.worker.close();
  }
}
