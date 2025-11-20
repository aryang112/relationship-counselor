import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CouplesService } from './couples.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { SignAgreementDto } from './dto/sign-agreement.dto';

@UseGuards(JwtAuthGuard)
@Controller('couples')
export class CouplesController {
  constructor(private couplesService: CouplesService) {}

  @Post('invite')
  async createInvite(@Request() req) {
    const couple = await this.couplesService.createInvite(req.user.id);
    return {
      message: 'Invite generated',
      couple,
      inviteToken: couple.inviteToken,
    };
  }

  @Post('accept')
  async acceptInvite(@Request() req, @Body() dto: AcceptInviteDto) {
    const couple = await this.couplesService.acceptInvite(
      req.user.id,
      dto.inviteToken,
    );
    return {
      message: 'Invite accepted',
      couple,
    };
  }

  @Get('me')
  async getMyCouple(@Request() req) {
    const couple = await this.couplesService.getCoupleForUser(req.user.id);
    return { couple };
  }

  @Post('agreement')
  async signAgreement(@Request() req, @Body() dto: SignAgreementDto) {
    if (!dto.confirm) {
      throw new BadRequestException('You must confirm agreement to sign');
    }

    const couple = await this.couplesService.signAgreement(req.user.id);
    return {
      message: 'Agreement signed',
      couple,
    };
  }
}
