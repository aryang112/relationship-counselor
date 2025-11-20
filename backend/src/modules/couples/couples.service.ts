import {
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
    const inviteToken = randomUUID();

    if (existingCouple) {
      // Allow regenerating invite if partner hasn't joined yet
      if (existingCouple.userAId === userId && !existingCouple.userBId) {
        return this.prisma.couple.update({
          where: { id: existingCouple.id },
          data: { inviteToken },
          include: coupleInclude,
        });
      }

      throw new ConflictException('User is already part of a couple');
    }

    return this.prisma.couple.create({
      data: {
        userAId: userId,
        inviteToken,
      },
      include: coupleInclude,
    });
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
      throw new ConflictException('You cannot accept your own invite');
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

    if (couple.agreementSignedAt) {
      return couple;
    }

    return this.prisma.couple.update({
      where: { id: couple.id },
      data: {
        agreementSignedAt: new Date(),
      },
      include: coupleInclude,
    });
  }
}
