import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RecordConsentDto } from './dto/record-consent.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req, @Body(ValidationPipe) dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('consent')
  async recordConsent(@Request() req, @Body(ValidationPipe) dto: RecordConsentDto) {
    return this.authService.recordConsent(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('consent-status')
  async getConsentStatus(@Request() req) {
    return this.authService.getConsentStatus(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ai-consent')
  @HttpCode(HttpStatus.OK)
  async recordAiConsent(@Request() req) {
    return this.authService.recordAiConsent(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(@Request() req, @Body() body: { reason?: string }) {
    return this.authService.deleteAccount(req.user.id, body.reason);
  }
}
