import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitInterviewDto } from './dto/submit-interview.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Post()
  startSession(@Request() req, @Body() dto: StartSessionDto) {
    return this.sessionsService.startSession(req.user.id, dto);
  }

  @Get()
  getAllSessions(@Request() req) {
    return this.sessionsService.getAllSessions(req.user.id);
  }

  @Get(':id')
  getSession(@Request() req, @Param('id') id: string) {
    return this.sessionsService.getSession(id, req.user.id);
  }

  @Post(':id/interview')
  submitInterview(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SubmitInterviewDto,
  ) {
    return this.sessionsService.submitInterview(id, req.user.id, dto);
  }

  @Get(':id/status')
  getSessionStatus(@Request() req, @Param('id') id: string) {
    return this.sessionsService.getSessionStatus(id, req.user.id);
  }

  @Patch(':id/status')
  updateSessionStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.sessionsService.updateSessionStatus(id, req.user.id, dto.status);
  }
}
