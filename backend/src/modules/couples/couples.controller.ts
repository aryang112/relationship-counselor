import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
}
