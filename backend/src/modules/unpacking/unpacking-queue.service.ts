import { Injectable, Logger } from '@nestjs/common';
import { Queue, QueueOptions } from 'bullmq';

type UnpackingJobData = {
  sessionId: string;
  coupleId: string;
  partnerAInterviewId: string;
  partnerBInterviewId: string;
  partnerAResponses: Record<string, any>;
  partnerBResponses: Record<string, any>;
};

@Injectable()
export class UnpackingQueueService {
  private readonly logger = new Logger(UnpackingQueueService.name);
  private queue?: Queue<any>;
  private readonly enabled: boolean;

  constructor() {
    const options = this.buildQueueOptions();
    this.enabled = !!options;

    if (!options) {
      this.logger.log(
        'Unpacking queue not configured (missing REDIS_URL or REDIS_HOST). Skipping queue initialization.',
      );
      return;
    }

    this.queue = new Queue<any>('unpacking', options);
  }

  private buildQueueOptions(): QueueOptions | null {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      return null;
    }

    const connection = redisUrl
      ? { url: redisUrl }
      : {
          host: redisHost,
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD,
        };

    return {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 500, age: 7 * 24 * 3600 },
        removeOnFail: { age: 14 * 24 * 3600 },
      },
    };
  }

  async enqueueGenerateUnpacking(data: UnpackingJobData) {
    if (!this.enabled || !this.queue) {
      this.logger.log(
        'Skipping unpacking enqueue (queue not configured). Set REDIS_URL or REDIS_HOST to enable.',
      );
      return { enqueued: false, reason: 'queue_not_configured' as const };
    }

    try {
      await this.queue.add('generate-unpacking', data);
      return { enqueued: true as const };
    } catch (error) {
      this.logger.error('Failed to enqueue unpacking job', error as any);
      return { enqueued: false as const, reason: 'enqueue_error' as const };
    }
  }

  // Placeholder for future regeneration; currently mirrors generate behavior
  async enqueueRegenerateUnpacking(data: Record<string, any>) {
    if (!this.enabled || !this.queue) {
      this.logger.log(
        'Skipping unpacking regenerate enqueue (queue not configured). Set REDIS_URL or REDIS_HOST to enable.',
      );
      return { enqueued: false, reason: 'queue_not_configured' as const };
    }

    try {
      await this.queue.add('regenerate-unpacking', data);
      return { enqueued: true as const };
    } catch (error) {
      this.logger.error('Failed to enqueue unpacking regenerate job', error as any);
      return { enqueued: false as const, reason: 'enqueue_error' as const };
    }
  }
}
