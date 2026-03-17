import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { randomUUID } from 'crypto';

const coupleInclude = {
  userA: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  userB: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class CouplesService {
  constructor(private prisma: PrismaService) {}

  private findCoupleByUser(userId: string) {
    return this.prisma.couple.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: coupleInclude,
    });
  }

  async createInvite(userId: string) {
    const existingCouple = await this.findCoupleByUser(userId);

    if (existingCouple) {
      if (existingCouple.userAId === userId && !existingCouple.userBId) {
        // TODO: NOTIFICATION - Send reminder to Partner B that Partner A is waiting
        // When reminders are implemented, trigger a gentle nudge here via push/email.
        return { couple: existingCouple, wasReminder: true };
      }

      throw new ConflictException('User is already part of a couple');
    }

    const inviteToken = randomUUID();

    const couple = await this.prisma.couple.create({
      data: {
        userAId: userId,
        inviteToken,
      },
      include: coupleInclude,
    });

    return { couple, wasReminder: false };
  }

  async acceptInvite(userId: string, inviteToken: string) {
    const invite = await this.prisma.couple.findUnique({
      where: { inviteToken },
      include: coupleInclude,
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or already used');
    }

    if (invite.userAId === userId) {
      throw new BadRequestException('You cannot accept your own invite');
    }

    if (invite.userBId && invite.userBId !== userId) {
      throw new ConflictException('Invite already accepted by another user');
    }

    const userCouple = await this.findCoupleByUser(userId);
    if (userCouple && userCouple.id !== invite.id) {
      throw new ConflictException('User is already part of another couple');
    }

    return this.prisma.couple.update({
      where: { id: invite.id },
      data: {
        userBId: userId,
        inviteToken: null,
      },
      include: coupleInclude,
    });
  }

  async getCoupleForUser(userId: string) {
    const couple = await this.findCoupleByUser(userId);
    if (!couple) {
      throw new NotFoundException('No couple found for this user');
    }
    return couple;
  }

  async signAgreement(userId: string) {
    const couple = await this.getCoupleForUser(userId);

    if (!couple.userBId) {
      throw new ConflictException('Your partner must join before signing');
    }

    // Determine which partner is signing
    const isUserA = couple.userAId === userId;
    const isUserB = couple.userBId === userId;

    // Check if this user already signed
    if (isUserA && couple.userASignedAt) {
      return couple;
    }
    if (isUserB && couple.userBSignedAt) {
      return couple;
    }

    // Update the appropriate signature field
    const updateData = isUserA
      ? { userASignedAt: new Date() }
      : { userBSignedAt: new Date() };

    return this.prisma.couple.update({
      where: { id: couple.id },
      data: updateData,
      include: coupleInclude,
    });
  }

  async submitOnboarding(userId: string, datingStartDate?: string, data?: Record<string, any>) {
    const couple = await this.getCoupleForUser(userId);

    const updateData: Record<string, any> = {};
    if (datingStartDate) updateData.datingStartDate = datingStartDate;

    // Merge new onboarding data with existing (each partner adds their own)
    const existing = (couple.onboardingData as Record<string, any>) || {};
    const isUserA = couple.userAId === userId;
    const key = isUserA ? 'userA' : 'userB';
    existing[key] = data || {};
    updateData.onboardingData = existing;

    return this.prisma.couple.update({
      where: { id: couple.id },
      data: updateData,
      include: coupleInclude,
    });
  }

  bothPartnersSignedAgreement(couple: any): boolean {
    return !!(couple.userASignedAt && couple.userBSignedAt);
  }
}
