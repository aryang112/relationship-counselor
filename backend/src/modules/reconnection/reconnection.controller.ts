/**
 * ReconnectionController — Handles reconnection chat endpoints
 * for async turn-based conversation between partners with AI mediation.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ReconnectionService } from './reconnection.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class ReconnectionController {
  constructor(private reconnectionService: ReconnectionService) {}

  @Get(':id/reconnection')
  async getMessages(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: any,
  ) {
    return this.reconnectionService.getMessages(sessionId, req.user.id);
  }

  @Post(':id/reconnection')
  async sendMessage(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() body: { text: string },
    @Req() req: any,
  ) {
    return this.reconnectionService.sendMessage(
      sessionId,
      req.user.id,
      body.text,
    );
  }

  @Post(':id/reconnection/commitment')
  async generateCommitment(
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    return this.reconnectionService.generateCommitment(sessionId);
  }

  @Patch(':id/reconnection/commitment')
  async agreeToCommitment(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: any,
  ) {
    return this.reconnectionService.agreeToCommitment(sessionId, req.user.id);
  }
}
