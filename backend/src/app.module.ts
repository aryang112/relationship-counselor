import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { CouplesModule } from './modules/couples/couples.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    CouplesModule,
    SessionsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
