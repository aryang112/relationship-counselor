import { Module } from '@nestjs/common';
import { CouplesService } from './couples.service';
import { CouplesController } from './couples.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [CouplesController],
  providers: [CouplesService, PrismaService],
  exports: [CouplesService],
})
export class CouplesModule {}
