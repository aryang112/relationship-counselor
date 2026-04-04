import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CouplesService } from './couples.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { SignAgreementDto } from './dto/sign-agreement.dto';
import { SubmitOnboardingDto } from './dto/submit-onboarding.dto';
import { Response } from 'express';

@Controller('couples')
export class CouplesController {
  constructor(private couplesService: CouplesService) {}

  /**
   * PUBLIC endpoint — validates an invite token without requiring authentication.
   * Used by Partner B before they have an account. The invite token itself
   * is proof of authorization (cryptographic UUID shared by Partner A).
   */
  @Post('validate-invite')
  @HttpCode(HttpStatus.OK)
  async validateInvite(@Body() dto: AcceptInviteDto) {
    return this.couplesService.validateInvite(dto.inviteToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invite')
  async createInvite(@Request() req, @Res({ passthrough: true }) res: Response) {
    const { couple, wasReminder } = await this.couplesService.createInvite(req.user.id);

    if (wasReminder) {
      res.status(HttpStatus.OK);
      return {
        message: 'Reminder sent to your partner',
        couple,
        inviteToken: couple.inviteToken,
      };
    }

    res.status(HttpStatus.CREATED);
    return {
      message: 'Invite generated',
      couple,
      inviteToken: couple.inviteToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Request() req, @Body() dto: AcceptInviteDto) {
    return this.couplesService.acceptInvite(req.user.id, dto.inviteToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyCouple(@Request() req) {
    return this.couplesService.getCoupleForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  async submitOnboarding(@Request() req, @Body() dto: SubmitOnboardingDto) {
    return this.couplesService.submitOnboarding(req.user.id, dto.datingStartDate, dto.data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('agreement')
  @HttpCode(HttpStatus.OK)
  async signAgreement(@Request() req, @Body() dto: SignAgreementDto) {
    if (!dto.confirm) {
      throw new BadRequestException('You must confirm agreement to sign');
    }

    return this.couplesService.signAgreement(req.user.id);
  }

  // ─── Love Bank ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('love-bank')
  async getLoveBank(@Request() req) {
    return this.couplesService.getLoveBank(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('love-bank')
  @HttpCode(HttpStatus.CREATED)
  async addLoveBankEntry(@Request() req, @Body() body: { text: string }) {
    if (!body.text?.trim()) {
      throw new BadRequestException('Text is required');
    }
    return this.couplesService.addLoveBankEntry(req.user.id, body.text.trim());
  }

  @UseGuards(JwtAuthGuard)
  @Delete('love-bank/:entryId')
  async deleteLoveBankEntry(
    @Request() req,
    @Param('entryId') entryId: string,
  ) {
    return this.couplesService.deleteLoveBankEntry(req.user.id, entryId);
  }

  // ─── Couple Stats ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getCoupleStats(@Request() req) {
    return this.couplesService.getCoupleStats(req.user.id);
  }

  // ─── Learnings / Commitments ─────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('learnings')
  async getLearnings(@Request() req) {
    return this.couplesService.getLearnings(req.user.id);
  }
}
