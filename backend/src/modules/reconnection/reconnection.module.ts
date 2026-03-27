/**
 * ReconnectionModule — Provides the reconnection chat feature
 * including async turn-based messaging and commitment generation.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReconnectionController } from './reconnection.controller';
import { ReconnectionService } from './reconnection.service';
import { PrismaService } from '../../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, NotificationsModule],
  controllers: [ReconnectionController],
  providers: [ReconnectionService, PrismaService],
  exports: [ReconnectionService],
})
export class ReconnectionModule {}
