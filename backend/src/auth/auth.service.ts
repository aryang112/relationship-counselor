import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RecordConsentDto } from './dto/record-consent.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          name: registerDto.name,
          timezone: registerDto.timezone || 'UTC',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }

    // Generate JWT
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        gender: user.gender,
      },
    };
  }

  async login(loginDto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        gender: user.gender,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, string> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return { id: user.id, email: user.email, name: user.name, gender: user.gender };
  }

  async recordConsent(userId: string, dto: RecordConsentDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          tosVersionAgreed: dto.tosVersion,
          privacyVersionAgreed: dto.privacyVersion,
          consentAgreedAt: new Date(),
          dateOfBirthConfirmed: true,
        },
      });

      await tx.consentLog.create({
        data: {
          userId,
          tosVersion: dto.tosVersion,
          privacyVersion: dto.privacyVersion,
          appVersion: dto.appVersion,
          platform: dto.platform,
        },
      });

      return user;
    });

    return {
      message: 'Consent recorded successfully',
      consentAgreedAt: result.consentAgreedAt?.toISOString(),
    };
  }

  async getConsentStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tosVersionAgreed: true,
        privacyVersionAgreed: true,
        consentAgreedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Current versions — keep in sync with /legal/versions.json
    const CURRENT_TOS = '1.0.0';
    const CURRENT_PRIVACY = '1.0.0';

    const hasConsented = !!(user.tosVersionAgreed && user.privacyVersionAgreed && user.consentAgreedAt);
    const needsReconsent = hasConsented && (
      user.tosVersionAgreed !== CURRENT_TOS ||
      user.privacyVersionAgreed !== CURRENT_PRIVACY
    );

    return {
      hasConsented,
      tosVersionAgreed: user.tosVersionAgreed,
      privacyVersionAgreed: user.privacyVersionAgreed,
      consentAgreedAt: user.consentAgreedAt?.toISOString() ?? null,
      needsReconsent,
    };
  }

  async recordAiConsent(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { aiConsentAgreedAt: new Date() },
    });

    return {
      message: 'AI consent recorded',
      aiConsentAgreedAt: user.aiConsentAgreedAt?.toISOString(),
    };
  }

  async deleteAccount(userId: string, reason?: string) {
    await this.prisma.$transaction(async (tx) => {
      // Delete interviews by user
      await tx.interview.deleteMany({ where: { userId } });

      // Find all couples this user belongs to
      const couplesA = await tx.couple.findMany({ where: { userAId: userId } });
      const couplesB = await tx.couple.findMany({ where: { userBId: userId } });
      const allCoupleIds = [
        ...couplesA.map((c) => c.id),
        ...couplesB.map((c) => c.id),
      ];

      if (allCoupleIds.length > 0) {
        // Delete unpacking records linked to sessions in these couples
        const sessions = await tx.session.findMany({
          where: { coupleId: { in: allCoupleIds } },
          select: { id: true },
        });
        const sessionIds = sessions.map((s) => s.id);

        if (sessionIds.length > 0) {
          await tx.unpacking.deleteMany({ where: { sessionId: { in: sessionIds } } });
          await tx.interview.deleteMany({ where: { sessionId: { in: sessionIds } } });
          await tx.session.deleteMany({ where: { id: { in: sessionIds } } });
        }

        await tx.couple.deleteMany({ where: { id: { in: allCoupleIds } } });
      }

      // Delete consent logs
      await tx.consentLog.deleteMany({ where: { userId } });

      // Soft-delete the user: overwrite PII, set deletedAt
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted_${userId}@deleted.relate.app`,
          password: 'DELETED',
          name: 'Deleted User',
          gender: null,
          onboardingData: null,
        },
      });
    });

    return {
      message: 'Account scheduled for deletion. Your data will be permanently removed within 30 days.',
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      gender: user.gender,
    };
  }
}
