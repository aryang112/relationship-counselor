/**
 * Notifications controller — handles push token registration and unregistration.
 * POST /notifications/register — saves the Expo push token for the authenticated user.
 * DELETE /notifications/register — clears the push token (e.g., on logout).
 */
import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(
    @Req() req,
    @Body(new ValidationPipe({ whitelist: true })) body: RegisterPushTokenDto,
  ) {
    await this.prisma.user.update({
      where: { id: req.user.id },
      data: { pushToken: body.pushToken },
    });
    return { success: true };
  }

  @Delete('register')
  @UseGuards(JwtAuthGuard)
  async unregister(@Req() req) {
    await this.prisma.user.update({
      where: { id: req.user.id },
      data: { pushToken: null },
    });
    return { success: true };
  }
}
