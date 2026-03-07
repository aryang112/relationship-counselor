import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { openAIService } from '../services/openai.service';
import { UnpackingJobData, UnpackingJobResult } from '../queues/unpacking.queue';

export class UnpackingProcessor {
  private worker: Worker<UnpackingJobData, UnpackingJobResult>;
  private prisma = new PrismaClient();

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

    // Helper to convert array or string to string
    const toText = (value: any) => Array.isArray(value) ? value.join('\n') : (value || '');

    // Persist unpacking into DB (upsert by sessionId)
    await this.prisma.unpacking.upsert({
      where: { sessionId },
      create: {
        sessionId,
        surfaceConflict: unpacking.summary ?? 'Pending unpacking',
        partnerAExperience: unpacking.positiveIntents?.partnerA ?? '',
        partnerBExperience: unpacking.positiveIntents?.partnerB ?? '',
        sharedTruths: unpacking.sharedTruths ?? [],
        deeperInsight: toText(unpacking.recommendations),
        patternRecognition: toText(unpacking.patterns),
        tone: 'supportive',
      },
      update: {
        surfaceConflict: unpacking.summary ?? 'Pending unpacking',
        partnerAExperience: unpacking.positiveIntents?.partnerA ?? '',
        partnerBExperience: unpacking.positiveIntents?.partnerB ?? '',
        sharedTruths: unpacking.sharedTruths ?? [],
        deeperInsight: toText(unpacking.recommendations),
        patternRecognition: toText(unpacking.patterns),
        tone: 'supportive',
      },
    });

    console.log(`Unpacking for session ${sessionId} generated and stored successfully`);

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
    await this.prisma.$disconnect();
  }
}
