import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { InterviewAIService } from './interview-ai.service';
import { PrismaService } from '../../prisma.service';
import { CouplesModule } from '../couples/couples.module';
import { UnpackingQueueService } from '../unpacking/unpacking-queue.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CouplesModule, NotificationsModule, ConfigModule],
  controllers: [SessionsController],
  providers: [SessionsService, InterviewAIService, PrismaService, UnpackingQueueService],
  exports: [SessionsService],
})
export class SessionsModule {}
