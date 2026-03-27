import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsQueueService } from './notifications-queue.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsQueueService, PrismaService],
  exports: [NotificationsService, NotificationsQueueService],
})
export class NotificationsModule {}
