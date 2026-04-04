import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { openAIService } from '../services/openai.service';
import { UnpackingJobData, UnpackingJobResult, RegenerateUnpackingJobData } from '../queues/unpacking.queue';

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

  /**
   * Routes incoming jobs to the appropriate handler based on job name.
   * Supports 'generate-unpacking' (default) and 'regenerate-unpacking' job types.
   */
  private async processJob(job: Job<UnpackingJobData | RegenerateUnpackingJobData>): Promise<UnpackingJobResult> {
    if (job.name === 'regenerate-unpacking') {
      return this.processRegenerateJob(job as Job<RegenerateUnpackingJobData>);
    }
    return this.processGenerateJob(job as Job<UnpackingJobData>);
  }

  /**
   * Processes initial unpacking generation from both partners' interview responses.
   */
  private async processGenerateJob(job: Job<UnpackingJobData>): Promise<UnpackingJobResult> {
    const { sessionId, partnerAResponses, partnerBResponses, pastContext } = job.data;

    console.log(`Processing unpacking job ${job.id} for session ${sessionId}`);

    // Generate unpacking using OpenAI (with past session context if available)
    const unpacking = await openAIService.generateUnpacking(
      partnerAResponses,
      partnerBResponses,
      pastContext,
    );

    // Helper to convert array or string to string
    const toText = (value: any) => Array.isArray(value) ? value.join('\n') : (value || '');

    // Build partner experience fields with underlying needs appended
    const partnerAExp = `${unpacking.positiveIntents?.partnerA || ''}\n\nWhat you needed: ${unpacking.underlyingNeeds?.partnerA || ''}`;
    const partnerBExp = `${unpacking.positiveIntents?.partnerB || ''}\n\nWhat you needed: ${unpacking.underlyingNeeds?.partnerB || ''}`;

    // Persist unpacking into DB (upsert by sessionId)
    await this.prisma.unpacking.upsert({
      where: { sessionId },
      create: {
        sessionId,
        surfaceConflict: unpacking.summary ?? 'Pending unpacking',
        partnerAExperience: partnerAExp,
        partnerBExperience: partnerBExp,
        sharedTruths: unpacking.sharedTruths ?? [],
        deeperInsight: unpacking.breakthrough || toText(unpacking.recommendations),
        patternRecognition: toText(unpacking.patterns),
        tone: 'supportive',
      },
      update: {
        surfaceConflict: unpacking.summary ?? 'Pending unpacking',
        partnerAExperience: partnerAExp,
        partnerBExperience: partnerBExp,
        sharedTruths: unpacking.sharedTruths ?? [],
        deeperInsight: unpacking.breakthrough || toText(unpacking.recommendations),
        patternRecognition: toText(unpacking.patterns),
        tone: 'supportive',
      },
    });

    console.log(`Unpacking for session ${sessionId} generated and stored successfully`);

    return unpacking;
  }

  /**
   * Processes unpacking regeneration based on user feedback.
   * Calls the feedback-aware OpenAI prompt and upserts the DB with improved insights.
   */
  private async processRegenerateJob(job: Job<RegenerateUnpackingJobData>): Promise<UnpackingJobResult> {
    const {
      sessionId,
      unpackingId,
      feedbackReason,
      feedbackText,
      previousUnpacking,
      partnerAResponses,
      partnerBResponses,
    } = job.data;

    console.log(`Processing regenerate-unpacking job ${job.id} for session ${sessionId} (unpacking ${unpackingId}, reason: ${feedbackReason})`);

    // Regenerate unpacking using OpenAI with feedback context
    const unpacking = await openAIService.regenerateUnpacking(
      partnerAResponses,
      partnerBResponses,
      previousUnpacking,
      feedbackReason,
      feedbackText
    );

    // Helper to convert array or string to string
    const toText = (value: any) => Array.isArray(value) ? value.join('\n') : (value || '');

    // Build partner experience fields with underlying needs appended
    const partnerAExp = `${unpacking.positiveIntents?.partnerA || ''}\n\nWhat you needed: ${unpacking.underlyingNeeds?.partnerA || ''}`;
    const partnerBExp = `${unpacking.positiveIntents?.partnerB || ''}\n\nWhat you needed: ${unpacking.underlyingNeeds?.partnerB || ''}`;

    // Persist regenerated unpacking into DB (upsert by sessionId)
    await this.prisma.unpacking.upsert({
      where: { sessionId },
      create: {
        sessionId,
        surfaceConflict: unpacking.summary ?? 'Pending unpacking',
        partnerAExperience: partnerAExp,
        partnerBExperience: partnerBExp,
        sharedTruths: unpacking.sharedTruths ?? [],
        deeperInsight: unpacking.breakthrough || toText(unpacking.recommendations),
        patternRecognition: toText(unpacking.patterns),
        tone: 'supportive',
      },
      update: {
        surfaceConflict: unpacking.summary ?? 'Pending unpacking',
        partnerAExperience: partnerAExp,
        partnerBExperience: partnerBExp,
        sharedTruths: unpacking.sharedTruths ?? [],
        deeperInsight: unpacking.breakthrough || toText(unpacking.recommendations),
        patternRecognition: toText(unpacking.patterns),
        tone: 'supportive',
      },
    });

    console.log(`Regenerated unpacking for session ${sessionId} stored successfully (feedback: ${feedbackReason})`);

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
