import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { CouplesModule } from './modules/couples/couples.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReconnectionModule } from './modules/reconnection/reconnection.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    CouplesModule,
    SessionsModule,
    AiModule,
    NotificationsModule,
    ReconnectionModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule implements NestModule {
  private readonly logger = new Logger('HTTP');

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
          const ms = Date.now() - start;
          this.logger.log(
            `${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`,
          );
        });
        next();
      })
      .forRoutes('*');
  }
}
