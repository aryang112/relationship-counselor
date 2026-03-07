import { Injectable, Logger } from '@nestjs/common';
import { Queue, QueueOptions, Worker } from 'bullmq';
import { NotificationsService, NotificationPayload } from './notifications.service';

type NotificationJob = NotificationPayload;

@Injectable()
export class NotificationsQueueService {
  private readonly logger = new Logger(NotificationsQueueService.name);
  private queue?: Queue<NotificationJob>;
  private enabled: boolean;

  constructor(private readonly notificationsService: NotificationsService) {
    const options = this.buildQueueOptions();
    this.enabled = !!options;

    if (!options) {
      this.logger.log(
        'Notifications queue not configured (missing REDIS_URL or REDIS_HOST). Falling back to direct send.',
      );
      return;
    }

    this.queue = new Queue<NotificationJob>('notifications', options);

    // Start a lightweight worker in-process to handle queued notifications
    new Worker<NotificationJob>(
      'notifications',
      async (job) => {
        await this.notificationsService.send(job.data);
      },
      { connection: options.connection },
    ).on('failed', (job, err) => {
      this.logger.error(
        `Notification job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });
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
        removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
        removeOnFail: { age: 14 * 24 * 3600 },
      },
    };
  }

  async enqueue(payload: NotificationPayload, delayMs = 0) {
    if (!this.enabled || !this.queue) {
      return { enqueued: false, reason: 'queue_not_configured' as const };
    }

    await this.queue.add('notify', payload, { delay: delayMs });
    return { enqueued: true as const };
  }
}
