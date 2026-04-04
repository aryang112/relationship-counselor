import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { randomUUID } from 'crypto';

/** Shape of a single love bank entry stored in the JSON array. */
export interface LoveBankEntry {
  id: string;
  text: string;
  createdAt: string;
}

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

    // Generate a 6-digit numeric invite code (human-friendly, easy to share verbally)
    const inviteToken = await this.generateUniqueInviteCode();

    const couple = await this.prisma.couple.create({
      data: {
        userAId: userId,
        inviteToken,
      },
      include: coupleInclude,
    });

    return { couple, wasReminder: false };
  }

  /**
   * Validates an invite token without accepting it.
   * Used by unauthenticated users (Partner B) to verify the token
   * before they go through onboarding and registration.
   */
  async validateInvite(inviteToken: string) {
    const invite = await this.prisma.couple.findUnique({
      where: { inviteToken },
      include: coupleInclude,
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or already used');
    }

    if (invite.userBId) {
      throw new NotFoundException('Invite has already been accepted');
    }

    return {
      valid: true,
      inviterName: invite.userA?.name || 'Your partner',
      coupleId: invite.id,
    };
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

  /** Generate a unique 6-digit numeric invite code. Retries on collision. */
  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const existing = await this.prisma.couple.findUnique({ where: { inviteToken: code } });
      if (!existing) return code;
    }
    // Extremely unlikely fallback — 8 digits
    return String(Math.floor(10000000 + Math.random() * 90000000));
  }

  // ─── Love Bank CRUD ────────────────────────────────────────────────

  /** Returns the love bank entries array for the user's couple. */
  async getLoveBank(userId: string): Promise<LoveBankEntry[]> {
    const couple = await this.getCoupleForUser(userId);
    return ((couple.loveBankEntries as unknown) as LoveBankEntry[] | null) ?? [];
  }

  /** Appends a new entry to the love bank JSON array. Returns the new entry. */
  async addLoveBankEntry(userId: string, text: string): Promise<LoveBankEntry> {
    const couple = await this.getCoupleForUser(userId);
    const entries: LoveBankEntry[] =
      ((couple.loveBankEntries as unknown) as LoveBankEntry[] | null) ?? [];

    const newEntry: LoveBankEntry = {
      id: randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    };

    entries.unshift(newEntry);

    await this.prisma.couple.update({
      where: { id: couple.id },
      data: { loveBankEntries: entries as any },
    });

    return newEntry;
  }

  /** Removes an entry from the love bank by id. */
  async deleteLoveBankEntry(
    userId: string,
    entryId: string,
  ): Promise<{ success: boolean }> {
    const couple = await this.getCoupleForUser(userId);
    const entries: LoveBankEntry[] =
      ((couple.loveBankEntries as unknown) as LoveBankEntry[] | null) ?? [];

    const filtered = entries.filter((e) => e.id !== entryId);

    if (filtered.length === entries.length) {
      throw new NotFoundException('Love bank entry not found');
    }

    await this.prisma.couple.update({
      where: { id: couple.id },
      data: { loveBankEntries: filtered as any },
    });

    return { success: true };
  }

  // ─── Couple Stats ──────────────────────────────────────────────────

  /** Aggregated relationship stats for the couple. */
  async getCoupleStats(userId: string) {
    const couple = await this.getCoupleForUser(userId);

    // Count resolved sessions
    const sessionsCompleted = await this.prisma.session.count({
      where: { coupleId: couple.id, status: 'resolved' },
    });

    // Count commitments where both partners agreed
    const commitmentsKept = await this.prisma.commitment.count({
      where: {
        session: { coupleId: couple.id },
        userAAgreed: true,
        userBAgreed: true,
      },
    });

    // Most recent session
    const latestSession = await this.prisma.session.findFirst({
      where: { coupleId: couple.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const daysSinceLastSession = latestSession
      ? Math.floor(
          (Date.now() - latestSession.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    // Together since
    let togetherSinceDays: number | null = null;
    if (couple.datingStartDate) {
      const parsed = new Date(couple.datingStartDate);
      if (!isNaN(parsed.getTime())) {
        togetherSinceDays = Math.max(
          0,
          Math.floor(
            (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
      }
    }

    return {
      sessionsCompleted,
      commitmentsKept,
      daysSinceLastSession,
      togetherSinceDays,
    };
  }

  // ─── Learnings / Commitments ───────────────────────────────────────

  /** Returns all commitments for the couple's sessions. */
  async getLearnings(userId: string) {
    const couple = await this.getCoupleForUser(userId);

    const commitments = await this.prisma.commitment.findMany({
      where: { session: { coupleId: couple.id } },
      include: { session: { select: { createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return commitments.map((c) => ({
      id: c.id,
      text: c.text,
      sessionDate: c.session.createdAt.toISOString(),
      userAAgreed: c.userAAgreed,
      userBAgreed: c.userBAgreed,
      createdAt: c.createdAt.toISOString(),
    }));
  }
}
