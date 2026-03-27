import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SessionsService } from './sessions.service';
import { InterviewAIService } from './interview-ai.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitInterviewDto } from './dto/submit-interview.dto';
import { SaveDraftInterviewDto } from './dto/save-draft-interview.dto';
import { NextQuestionDto } from './dto/next-question.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SetUnpackingChoiceDto } from './dto/set-unpacking-choice.dto';
import { SubmitUnpackingFeedbackDto } from './dto/submit-unpacking-feedback.dto';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    private sessionsService: SessionsService,
    private interviewAI: InterviewAIService,
  ) {}

  @Post()
  startSession(@Request() req, @Body() dto: StartSessionDto) {
    return this.sessionsService.startSession(req.user.id, dto);
  }

  @Get()
  getAllSessions(@Request() req) {
    return this.sessionsService.getAllSessions(req.user.id);
  }

  @Get(':id')
  getSession(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.getSession(id, req.user.id);
  }

  @Post(':id/interview')
  async submitInterview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitInterviewDto,
  ) {
    const result = await this.sessionsService.submitInterview(
      id,
      req.user.id,
      dto,
    );
    return result.interview;
  }

  @Post(':id/interview/next-question')
  async getNextQuestion(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: NextQuestionDto,
  ) {
    const session = await this.sessionsService.getSession(id, req.user.id);
    const userGender: string | null = req.user.gender ?? null;

    // If user is Partner B and session has extraction data, use context-aware generation
    const isPartnerB = session.initiatedBy !== req.user.id;
    const extraction = session.partnerAExtraction as { issues?: string[]; needs?: string[]; emotions?: string[] } | null;

    let question: string;
    if (isPartnerB && extraction?.issues && extraction.issues.length > 0) {
      question = await this.interviewAI.generateNextQuestionWithContext(
        dto.conversationHistory,
        { issues: extraction.issues, needs: extraction.needs || [], emotions: extraction.emotions || [] },
        userGender,
      );
    } else {
      question = await this.interviewAI.generateNextQuestion(dto.conversationHistory, userGender);
    }

    return { question };
  }

  @Patch(':id/interview/draft')
  async saveDraftInterview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveDraftInterviewDto,
  ) {
    return this.sessionsService.saveDraftInterview(id, req.user.id, dto);
  }

  @Get(':id/interview')
  async getInterview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionsService.getInterview(id, req.user.id);
  }

  @Get(':id/status')
  getSessionStatus(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.getSessionStatus(id, req.user.id);
  }

  @Patch(':id/status')
  updateSessionStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.sessionsService.updateSessionStatus(id, req.user.id, dto.status);
  }

  @Get(':id/unpacking')
  getUnpacking(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.getUnpacking(id, req.user.id);
  }

  @Patch(':id/unpacking/choice')
  setUnpackingChoice(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUnpackingChoiceDto,
  ) {
    return this.sessionsService.setUnpackingChoice(id, req.user.id, dto);
  }

  @Post(':id/unpacking/unlock')
  unlockUnpacking(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.unlockUnpacking(id, req.user.id);
  }

  @Post(':id/unpacking/feedback')
  submitUnpackingFeedback(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitUnpackingFeedbackDto,
  ) {
    return this.sessionsService.submitUnpackingFeedback(id, req.user.id, dto);
  }

  @Get(':id/partner-b-context')
  getPartnerBContext(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.getPartnerBContext(id, req.user.id);
  }

  @Post(':id/snooze')
  snoozePartnerBInvite(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.snoozePartnerBInvite(id, req.user.id);
  }

  @Post(':id/remind-partner')
  remindPartner(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.remindPartnerToParticipate(id, req.user.id);
  }
}
