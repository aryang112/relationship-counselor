import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../../prisma.service';
import { CouplesModule } from '../couples/couples.module';
import { UnpackingQueueService } from '../unpacking/unpacking-queue.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CouplesModule, NotificationsModule],
  controllers: [SessionsController],
  providers: [SessionsService, PrismaService, UnpackingQueueService],
  exports: [SessionsService],
})
export class SessionsModule {}
