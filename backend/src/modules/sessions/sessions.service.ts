import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma.service';
import { CouplesService } from '../couples/couples.service';
import { UnpackingQueueService } from '../unpacking/unpacking-queue.service';
import { NotificationsService, NotificationPayload } from '../notifications/notifications.service';
import { NotificationsQueueService } from '../notifications/notifications-queue.service';
import { InterviewAIService } from './interview-ai.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitInterviewDto } from './dto/submit-interview.dto';
import { SaveDraftInterviewDto } from './dto/save-draft-interview.dto';
import { SetUnpackingChoiceDto, UnpackingChoice } from './dto/set-unpacking-choice.dto';
import { SubmitUnpackingFeedbackDto } from './dto/submit-unpacking-feedback.dto';

const FINAL_SESSION_STATUSES = ['resolved', 'abandoned'];
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  initiated: ['in_progress', 'awaiting_partner_b', 'abandoned'],
  in_progress: ['awaiting_partner_b', 'unpacking_ready', 'abandoned'],
  awaiting_partner_b: ['in_progress', 'unpacking_ready', 'abandoned'],
  unpacking_ready: ['reconnection', 'abandoned'],
  reconnection: ['resolved', 'abandoned'],
  resolved: [],
  abandoned: [],
};

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private couplesService: CouplesService,
    private unpackingQueue: UnpackingQueueService,
    private notificationsService: NotificationsService,
    private notificationsQueue: NotificationsQueueService,
    private interviewAI: InterviewAIService,
    private configService: ConfigService,
  ) {}

  /**
   * Fetches summarized context from past sessions for this couple.
   * Used to give AI memory across sessions — references past patterns,
   * commitments, and conflict themes.
   */
  /** Fetch couple's onboarding data for AI context. */
  async getCoupleOnboardingData(coupleId: string): Promise<Record<string, any> | null> {
    const couple = await this.prisma.couple.findUnique({
      where: { id: coupleId },
      select: { onboardingData: true },
    });
    return (couple?.onboardingData as Record<string, any>) || null;
  }

  async getPastSessionContext(coupleId: string, excludeSessionId?: string): Promise<string | null> {
    const whereClause: any = {
      coupleId,
      status: 'resolved',
    };
    if (excludeSessionId) {
      whereClause.id = { not: excludeSessionId };
    }

    const pastSessions = await this.prisma.session.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        unpacking: true,
        commitment: true,
      },
    });

    // Filter to sessions that have meaningful unpacking data
    const sessionsWithUnpacking = pastSessions.filter(
      (s) => s.unpacking && s.unpacking.surfaceConflict !== 'Pending AI unpacking',
    );

    if (sessionsWithUnpacking.length === 0) {
      return null;
    }

    const lines: string[] = ['PAST SESSION HISTORY (most recent first):'];

    for (const s of sessionsWithUnpacking) {
      const dateStr = s.createdAt.toISOString().split('T')[0];
      const topic = s.topic || s.unpacking!.surfaceConflict || 'unspecified';
      const pattern = s.unpacking!.patternRecognition
        ? s.unpacking!.patternRecognition.substring(0, 100)
        : 'N/A';
      const commitmentText = s.commitment?.text || 'None';

      lines.push('');
      lines.push(`Session (${dateStr}) — Topic: "${topic}"`);
      lines.push(`Insight: ${s.unpacking!.surfaceConflict}`);
      lines.push(`Pattern: ${pattern}`);
      lines.push(`Commitment: ${commitmentText}`);
    }

    const result = lines.join('\n');

    // Cap output to ~600 words (roughly 3600 chars) to avoid ballooning token usage
    if (result.length > 3600) {
      return result.substring(0, 3600) + '\n...(earlier sessions omitted for brevity)';
    }

    return result;
  }

  async startSession(userId: string, dto: StartSessionDto) {
    // Check subscription: free tier limited to 2 resolved sessions
    const subUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, subscriptionExpiresAt: true, resolvedSessionCount: true },
    });

    const isPremium = subUser?.subscriptionTier === 'premium' &&
      (!subUser?.subscriptionExpiresAt || subUser.subscriptionExpiresAt > new Date());

    if (!isPremium && (subUser?.resolvedSessionCount ?? 0) >= 2) {
      throw new ForbiddenException({
        error: 'subscription_required',
        message: 'Free session limit reached. Please upgrade to continue.',
        freeSessionsUsed: subUser?.resolvedSessionCount ?? 0,
      });
    }

    const couple = await this.couplesService.getCoupleForUser(userId);

    if (!couple.userBId) {
      throw new ConflictException('Your partner must join before starting a session.');
    }

    if (!this.couplesService.bothPartnersSignedAgreement(couple)) {
      throw new ForbiddenException('Both partners must sign the shared agreement before starting a session.');
    }

    let session;
    try {
      session = await this.prisma.$transaction(
        async (tx) => {
          const existingSession = await tx.session.findFirst({
            where: {
              coupleId: couple.id,
              status: { notIn: FINAL_SESSION_STATUSES },
            },
            select: { id: true },
          });

          if (existingSession) {
            throw new ConflictException(
              'There is already an active session. Please resolve or abandon it before starting another.',
            );
          }

          return tx.session.create({
            data: {
              coupleId: couple.id,
              status: 'initiated',
              initiatedBy: userId,
              topic: dto.topic,
              context: dto.context,
            },
            include: {
              interviews: true,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'There is already an active session. Please resolve or abandon it before starting another.',
        );
      }
      throw error;
    }

    // Notify partner when session is initiated (per spec Flow 2)
    const partnerId = couple.userAId === userId ? couple.userBId : couple.userAId;
    const initiator = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (partnerId && initiator) {
      const partnerInfo = await this.getUserNotificationInfo(partnerId);
      await this.notificationsService.send({
        userId: partnerId,
        type: 'session_initiated',
        title: `${initiator.name} wants to work through something with you 💙`,
        body: 'Tap to participate',
        pushToken: partnerInfo.pushToken ?? undefined,
        email: partnerInfo.email ?? undefined,
        channels: ['push', 'email'],
        data: { sessionId: session.id },
      });
      await this.scheduleInterviewReminders(partnerId, initiator.name, session.id);
    }

    return session;
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    // Privacy protection: Only return interview metadata, not responses
    // Interview responses should only be accessible:
    // 1. To the author of the interview (via separate endpoint if needed)
    // 2. During the unpacking phase when both partners have completed
    const sanitizedInterviews = session.interviews.map((interview) => ({
      id: interview.id,
      userId: interview.userId,
      sessionId: interview.sessionId,
      completedAt: interview.completedAt,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
      // Omit: responses, notes (private until unpacking)
    }));

    return {
      ...session,
      interviews: sanitizedInterviews,
    };
  }

  async saveDraftInterview(
    sessionId: string,
    userId: string,
    dto: SaveDraftInterviewDto,
  ) {
    await this.ensureSessionAccess(sessionId, userId);

    // Upsert: create if doesn't exist, update if exists (but not completed)
    const existingInterview = await this.prisma.interview.findFirst({
      where: { sessionId, userId },
    });

    if (existingInterview?.completedAt) {
      throw new ConflictException('Cannot save draft - interview already completed.');
    }

    const result = await this.prisma.interview.upsert({
      where: {
        sessionId_userId: { sessionId, userId },
      },
      create: {
        sessionId,
        userId,
        responses: dto.responses,
        notes: dto.notes,
        completedAt: null, // Draft - not complete
      },
      update: {
        responses: dto.responses,
        notes: dto.notes,
        // Keep completedAt: null (still a draft)
      },
    });

    // If this is a NEW interview (not updating existing), notify Partner A that B started
    if (!existingInterview) {
      try {
        const session = await this.prisma.session.findUnique({
          where: { id: sessionId },
          include: { couple: true },
        });
        if (session && session.status === 'awaiting_partner_b') {
          const initiatorId = session.initiatedBy;
          const partner = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
          if (initiatorId !== userId && partner) {
            await this.notifyPartnerAStarted(initiatorId, partner.name, sessionId);
          }
        }
      } catch {
        // Silent fail for notification
      }
    }

    return result;
  }

  async getInterview(sessionId: string, userId: string) {
    await this.ensureSessionAccess(sessionId, userId);

    const interview = await this.prisma.interview.findFirst({
      where: { sessionId, userId },
    });

    if (!interview) {
      throw new NotFoundException('No interview found for this session');
    }

    return interview;
  }

  async submitInterview(
    sessionId: string,
    userId: string,
    dto: SubmitInterviewDto,
  ) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    // Check if interview already exists
    const existingInterview = await this.prisma.interview.findFirst({
      where: { sessionId, userId },
    });

    // If already completed, reject
    if (existingInterview?.completedAt) {
      throw new ConflictException('You have already completed this interview.');
    }

    // Upsert with completedAt set (finalizes the interview)
    const interview = await this.prisma.interview.upsert({
      where: {
        sessionId_userId: { sessionId, userId },
      },
      create: {
        sessionId,
        userId,
        responses: dto.responses,
        notes: dto.notes,
        completedAt: new Date(),
      },
      update: {
        responses: dto.responses,
        notes: dto.notes,
        completedAt: new Date(), // Finalize draft
      },
    });

    const interviews = await this.prisma.interview.findMany({
      where: { sessionId },
    });

    const nextStatus = this.calculateSessionStatus(
      session,
      interviews,
    );

    let latestSession;
    if (nextStatus !== session.status) {
      const updateData: Prisma.SessionUpdateInput = { status: nextStatus };

      // When both interviews are complete, mark when unpacking became ready and reset lock state
      if (nextStatus === 'unpacking_ready') {
        updateData.unpackingReadyAt = session.unpackingReadyAt ?? new Date();
        updateData.unpackingAutoUnlockAt = null;
        updateData.unpackingWaitUserA = false;
        updateData.unpackingWaitUserB = false;
      }

      latestSession = await this.prisma.session.update({
        where: { id: session.id },
        data: updateData,
        include: {
          couple: true,
          interviews: true,
        },
      });
    } else {
      latestSession = await this.prisma.session.findUnique({
        where: { id: session.id },
        include: {
          couple: true,
          interviews: true,
        },
      });
    }

    if (nextStatus === 'awaiting_partner_b') {
      // Extract context from Partner A's responses
      try {
        const extraction = await this.interviewAI.extractPartnerAContext(dto.responses);
        await this.prisma.session.update({
          where: { id: session.id },
          data: {
            topicTag: extraction.topicTag,
            topicTagGeneratedAt: new Date(),
            partnerAExtraction: extraction as any,
          },
        });
        // Notify Partner B
        const partnerId = session.couple.userAId === userId ? session.couple.userBId : session.couple.userAId;
        const initiator = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        if (partnerId && initiator) {
          await this.notifyPartnerBInvite(partnerId, initiator.name, session.id, extraction.topicTag);
          await this.schedulePartnerBReminders(partnerId, initiator.name, session.id, extraction.topicTag);
        }
      } catch (err) {
        // Log but don't fail the submission
        console.error('Failed to extract Partner A context:', err);
      }
    }

    if (nextStatus === 'unpacking_ready') {
      await this.ensureUnpackingExists(latestSession);
      await this.enqueueUnpackingJob(latestSession);
      await this.notifyUnpackingReady(latestSession);
    }

    // ── Inline crisis detection (fire-and-forget email, sync flag) ──
    let crisisDetected = false;
    try {
      crisisDetected = await this.detectCrisisInline(dto.responses, userId, sessionId);
    } catch (err) {
      // Log but never block the submission
      console.error('Crisis detection failed (non-blocking):', err);
    }

    return {
      interview,
      session: latestSession,
      crisisDetected,
    };
  }

  /**
   * Inline crisis detection — replicates the worker prompt for use
   * when responses are submitted. Returns true if high-severity crisis detected.
   * Sends a fire-and-forget email with crisis resources when triggered.
   */
  private async detectCrisisInline(
    responses: any[],
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    // Concatenate all user answers into a single text block
    const text = responses
      .map((r: any) => r.answer || r.text || '')
      .filter(Boolean)
      .join('\n');

    if (!text.trim()) return false;

    const client = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
    const model = this.configService.get('OPENAI_MODEL_FAST') || 'gpt-4o-mini';

    const systemPrompt = `You are a crisis detection system for relationship counseling.
Detect concerning language including:
- Threats of self-harm or harm to others
- Extreme emotional distress
- Mentions of violence or abuse
- Suicidal ideation
- Signs of immediate danger

Respond with JSON containing: isCrisis (boolean), severity (low/medium/high), concerns (array), recommendation (string)`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this text for crisis indicators: "${text}"` },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    const result = content
      ? JSON.parse(content)
      : { isCrisis: false, severity: 'low', concerns: [], recommendation: '' };

    const isCrisis = result.isCrisis === true && (result.severity === 'high' || result.severity === 'medium');

    if (isCrisis) {
      console.warn('[CRISIS DETECTED]', { sessionId, userId, severity: result.severity, concerns: result.concerns });

      // Fire-and-forget email with crisis resources
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        this.notificationsService.send({
          userId,
          type: 'crisis_resources',
          title: 'Resources for you',
          body: [
            'We noticed you might be going through something really difficult. Here are resources that can help right now:',
            '',
            '- National Suicide Prevention Lifeline: 988',
            '- Crisis Text Line: Text HOME to 741741',
            '- National Domestic Violence Hotline: 1-800-799-7233',
            '- SAMHSA Mental Health Helpline: 1-800-662-4357',
            '',
            'You are not alone. Please reach out to any of these services if you need support.',
            '',
            '— The Relate Team',
          ].join('\n'),
          email: user.email,
          channels: ['email'],
        }).catch(() => {
          // Fire-and-forget — don't block on email failure
        });
      }
    }

    return isCrisis;
  }

  async getSessionStatus(sessionId: string, userId: string) {
    const session = await this.ensureSessionAccess(sessionId, userId);
    const interviews = await this.prisma.interview.findMany({
      where: { sessionId },
    });

    // Only count COMPLETED interviews (not drafts)
    const completedInterviews = interviews.filter(
      (interview) => interview.completedAt !== null,
    );

    const userAId = session.couple.userAId;
    const userBId = session.couple.userBId;

    const hasUserA =
      !!userAId && completedInterviews.some((interview) => interview.userId === userAId);
    const hasUserB =
      !!userBId && completedInterviews.some((interview) => interview.userId === userBId);

    return {
      sessionId,
      status: session.status,
      partnerStatus: {
        userAId,
        userBId,
        userAComplete: hasUserA,
        userBComplete: hasUserB,
      },
    };
  }

  async remindPartnerToParticipate(sessionId: string, userId: string) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    if (FINAL_SESSION_STATUSES.includes(session.status)) {
      throw new ConflictException('Cannot remind for a completed session.');
    }

    const isUserA = session.couple.userAId === userId;
    const partnerId = isUserA ? session.couple.userBId : session.couple.userAId;

    if (!partnerId) {
      throw new ConflictException('Your partner has not joined yet.');
    }

    const partnerInterview = session.interviews.find(
      (i) => i.userId === partnerId && i.completedAt,
    );
    const requesterInterview = session.interviews.find(
      (i) => i.userId === userId && i.completedAt,
    );

    if (partnerInterview && requesterInterview) {
      throw new ForbiddenException('Both partners have completed their interviews.');
    }

    const twelveHoursMs = 12 * 60 * 60 * 1000;
    if (session.manualReminderSentAt) {
      const elapsed = Date.now() - session.manualReminderSentAt.getTime();
      if (elapsed < twelveHoursMs) {
        const hoursRemaining = Math.ceil((twelveHoursMs - elapsed) / (60 * 60 * 1000));
        throw new HttpException(
          `You can send a reminder only once every 12 hours. Try again in ${hoursRemaining} hour(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const partnerInfo = await this.getUserNotificationInfo(partnerId);
    await this.notificationsService.send({
      userId: partnerId,
      type: 'manual_interview_reminder',
      title: `${requester?.name ?? 'Your partner'} is waiting to hear your perspective 💭`,
      body: 'Tap to share your side of the story.',
      pushToken: partnerInfo.pushToken ?? undefined,
      email: partnerInfo.email ?? undefined,
      channels: ['push', 'email'],
      data: { sessionId },
    });

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { manualReminderSentAt: new Date() },
    });

    return { message: 'Reminder sent to your partner.' };
  }

  async getAllSessions(userId: string) {
    const couple = await this.couplesService.getCoupleForUser(userId);

    const sessions = await this.prisma.session.findMany({
      where: { coupleId: couple.id },
      include: {
        interviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Privacy protection: Sanitize interview responses in list view
    return sessions.map((session) => ({
      ...session,
      interviews: (session.interviews ?? []).map((interview) => ({
        id: interview.id,
        userId: interview.userId,
        sessionId: interview.sessionId,
        completedAt: interview.completedAt,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
        // Omit: responses, notes (private until unpacking)
      })),
    }));
  }

  async updateSessionStatus(sessionId: string, userId: string, newStatus: string) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    // Validate status transitions
    const validStatuses = ['initiated', 'in_progress', 'awaiting_partner_b', 'unpacking_ready', 'reconnection', 'resolved', 'abandoned'];
    if (!validStatuses.includes(newStatus)) {
      throw new ConflictException(`Invalid status: ${newStatus}`);
    }

    // Prevent reverting from final statuses
    if (FINAL_SESSION_STATUSES.includes(session.status) && newStatus !== session.status) {
      throw new ConflictException('Cannot update status of a completed session.');
    }

    const allowedNextStatuses = ALLOWED_TRANSITIONS[session.status] || [];
    if (!allowedNextStatuses.includes(newStatus) && newStatus !== session.status) {
      throw new ConflictException(
        `Cannot transition from ${session.status} to ${newStatus}`,
      );
    }

    const updateData: Prisma.SessionUpdateInput = { status: newStatus };

    if (newStatus === 'unpacking_ready') {
      updateData.unpackingReadyAt = session.unpackingReadyAt ?? new Date();
      updateData.unpackingAutoUnlockAt = null;
      updateData.unpackingWaitUserA = false;
      updateData.unpackingWaitUserB = false;
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        couple: true,
        interviews: true,
      },
    });

    if (newStatus === 'resolved') {
      // Increment resolved session count for the initiator (used for paywall gating)
      await this.prisma.user.update({
        where: { id: updated.initiatedBy },
        data: { resolvedSessionCount: { increment: 1 } },
      });
      await this.schedulePostResolutionCheckIn(updated);
    }

    if (newStatus === 'unpacking_ready') {
      await this.ensureUnpackingExists(updated);
      await this.enqueueUnpackingJob(updated);
      await this.notifyUnpackingReady(updated);
    }

    return updated;
  }

  async getUnpacking(sessionId: string, userId: string) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    // Verify session is in unpacking_ready status
    if (session.status !== 'unpacking_ready' && session.status !== 'reconnection' && session.status !== 'resolved') {
      throw new ConflictException('Unpacking is not yet available for this session.');
    }

    const unpacking = await this.ensureUnpackingExists(session);

    const isUserA = session.couple.userAId === userId;
    const isUserB = session.couple.userBId === userId;

    // Check lock status
    const userWantsToWait = isUserA ? session.unpackingWaitUserA : session.unpackingWaitUserB;
    const partnerWantsToWait = isUserA ? session.unpackingWaitUserB : session.unpackingWaitUserA;

    // If user chose "wait" and hasn't been unlocked yet
    if (userWantsToWait) {
      // Check if both chose to wait
      if (partnerWantsToWait) {
        return {
          locked: true,
          lockType: 'both_waiting',
          message: "You're both waiting to view this together! Ready to unlock it now?",
          canUnlock: true,
        };
      }

      // Check if 24h has elapsed since auto-unlock was set
      const now = new Date();
      const autoUnlockAt = session.unpackingAutoUnlockAt;

      if (autoUnlockAt && now >= autoUnlockAt) {
        // Auto-unlock has passed, show the unpacking
        return {
          locked: false,
          unpacking,
          autoUnlocked: true,
          message: 'Your partner viewed this 24 hours ago. Here are the insights:',
        };
      }

      // Still waiting for partner
      return {
        locked: true,
        lockType: 'waiting_for_partner',
        message: `Waiting for your partner to view this with you...`,
        canUnlock: false,
        autoUnlockAt,
      };
    }

    // User chose "view now" or hasn't chosen yet - return unpacking
    return {
      locked: false,
      unpacking,
    };
  }

  async setUnpackingChoice(sessionId: string, userId: string, dto: SetUnpackingChoiceDto) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    // Verify session is in unpacking_ready status
    if (session.status !== 'unpacking_ready') {
      throw new ConflictException('Unpacking is not yet available for this session.');
    }

    const isUserA = session.couple.userAId === userId;
    const isUserB = session.couple.userBId === userId;

    if (dto.choice === UnpackingChoice.WAIT) {
      // User chose to wait for partner
      const updateData: Prisma.SessionUpdateInput = {};

      if (isUserA) {
        updateData.unpackingWaitUserA = true;
      } else if (isUserB) {
        updateData.unpackingWaitUserB = true;
      }

      // Check if partner already chose "view now" - if so, set 24h auto-unlock
      const partnerChoseView = isUserA
        ? !session.unpackingWaitUserB && session.unpackingReadyAt
        : !session.unpackingWaitUserA && session.unpackingReadyAt;

      if (partnerChoseView && !session.unpackingAutoUnlockAt) {
        // Partner viewed it, set auto-unlock for 24h from now
        const autoUnlockTime = new Date();
        autoUnlockTime.setHours(autoUnlockTime.getHours() + 24);
        updateData.unpackingAutoUnlockAt = autoUnlockTime;

        // Notify waiting user that partner is ready and they'll auto-unlock in 24h
        const userInfo = await this.getUserNotificationInfo(userId);
        await this.notificationsService.send({
          userId,
          type: 'partner_viewed_unpacking',
          title: 'Your partner viewed the insights',
          body: "They're waiting for you. This will auto-unlock in 24 hours.",
          pushToken: userInfo.pushToken ?? undefined,
          email: userInfo.email ?? undefined,
          channels: ['push'],
          data: { sessionId: session.id, autoUnlockAt: autoUnlockTime.toISOString() },
        });
      }

      await this.prisma.session.update({
        where: { id: sessionId },
        data: updateData,
      });

      return { choice: 'wait', message: 'Waiting for your partner to join you...' };
    } else {
      // User chose to view now
      const updateData: Prisma.SessionUpdateInput = {};

      if (isUserA) {
        updateData.unpackingWaitUserA = false;
      } else if (isUserB) {
        updateData.unpackingWaitUserB = false;
      }

      // Check if partner is waiting - if so, set 24h auto-unlock
      const partnerIsWaiting = isUserA ? session.unpackingWaitUserB : session.unpackingWaitUserA;

      if (partnerIsWaiting && !session.unpackingAutoUnlockAt) {
        const autoUnlockTime = new Date();
        autoUnlockTime.setHours(autoUnlockTime.getHours() + 24);
        updateData.unpackingAutoUnlockAt = autoUnlockTime;

        // Notify waiting partner
        const partnerId = isUserA ? session.couple.userBId : session.couple.userAId;
        if (partnerId) {
          const partnerNotifInfo = await this.getUserNotificationInfo(partnerId);
          await this.notificationsService.send({
            userId: partnerId,
            type: 'partner_viewed_unpacking',
            title: 'Your partner viewed the insights',
            body: "They're waiting for you. This will auto-unlock in 24 hours.",
            pushToken: partnerNotifInfo.pushToken ?? undefined,
            email: partnerNotifInfo.email ?? undefined,
            channels: ['push'],
            data: { sessionId: session.id, autoUnlockAt: autoUnlockTime.toISOString() },
          });
        }
      }

      await this.prisma.session.update({
        where: { id: sessionId },
        data: updateData,
      });

      return { choice: 'view', message: 'Showing insights now' };
    }
  }

  async unlockUnpacking(sessionId: string, userId: string) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    // Verify session is in unpacking_ready status
    if (session.status !== 'unpacking_ready') {
      throw new ConflictException('Unpacking is not yet available for this session.');
    }

    const isUserA = session.couple.userAId === userId;

    // Scenario: Both chose to wait, one partner comes back and clicks "unlock now"
    // Unlock for both immediately
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        unpackingWaitUserA: false,
        unpackingWaitUserB: false,
        unpackingAutoUnlockAt: null,
      },
    });

    // Notify the other partner that unpacking was unlocked
    const partnerId = isUserA ? session.couple.userBId : session.couple.userAId;
    if (partnerId) {
      const partnerInfo = await this.getUserNotificationInfo(partnerId);
      await this.notificationsService.send({
        userId: partnerId,
        type: 'unpacking_unlocked',
        title: 'Your partner is ready to view the insights with you',
        body: 'The unpacking is now available',
        pushToken: partnerInfo.pushToken ?? undefined,
        email: partnerInfo.email ?? undefined,
        channels: ['push'],
        data: { sessionId: session.id },
      });
    }

    return { unlocked: true, message: 'Unpacking unlocked for both partners' };
  }

  async submitUnpackingFeedback(sessionId: string, userId: string, dto: SubmitUnpackingFeedbackDto) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    // Verify unpacking exists
    const unpacking = await this.prisma.unpacking.findUnique({
      where: { sessionId },
    });

    if (!unpacking) {
      throw new NotFoundException('Unpacking not found for this session.');
    }

    if (
      dto.feedbackReason === 'other' &&
      (!dto.feedbackText || dto.feedbackText.trim().length === 0)
    ) {
      throw new BadRequestException(
        'feedbackText is required when feedbackReason is "other".',
      );
    }

    // Update feedback count and reason
    const updatedUnpacking = await this.prisma.unpacking.update({
      where: { id: unpacking.id },
      data: {
        feedbackCount: unpacking.feedbackCount + 1,
        lastFeedbackReason: dto.feedbackText || dto.feedbackReason,
      },
    });

    // Enqueue regeneration job with feedback context
    const interviews = await this.prisma.interview.findMany({
      where: { sessionId },
    });

    const partnerAInterview = interviews.find((i) => i.userId === session.couple.userAId);
    const partnerBInterview = interviews.find((i) => i.userId === session.couple.userBId);

    if (partnerAInterview && partnerBInterview) {
      const enqueueResult = await this.unpackingQueue.enqueueRegenerateUnpacking({
        sessionId: session.id,
        unpackingId: unpacking.id,
        feedbackReason: dto.feedbackReason,
        feedbackText: dto.feedbackText,
        previousUnpacking: {
          surfaceConflict: unpacking.surfaceConflict,
          partnerAExperience: unpacking.partnerAExperience,
          partnerBExperience: unpacking.partnerBExperience,
          sharedTruths: unpacking.sharedTruths,
          deeperInsight: unpacking.deeperInsight,
          patternRecognition: unpacking.patternRecognition,
        },
        partnerAResponses: partnerAInterview.responses,
        partnerBResponses: partnerBInterview.responses,
      });

      if (!enqueueResult.enqueued) {
        // No Redis/worker available — regenerate unpacking inline (fire-and-forget)
        this.regenerateUnpackingInline(session.id, dto.feedbackReason, dto.feedbackText).catch((err) => {
          console.error(`[UNPACKING] Inline regeneration failed for session ${session.id}:`, err);
        });
      }
    }

    return {
      message: 'Feedback submitted. Regenerating unpacking with your input...',
      feedbackCount: updatedUnpacking.feedbackCount,
    };
  }

  private calculateSessionStatus(session, interviews) {
    // Only count COMPLETED interviews (not drafts)
    const completedInterviews = interviews.filter(
      (interview) => interview.completedAt !== null,
    );

    const hasUserA =
      !!session.couple.userAId &&
      completedInterviews.some((interview) => interview.userId === session.couple.userAId);
    const hasUserB =
      !!session.couple.userBId &&
      completedInterviews.some((interview) => interview.userId === session.couple.userBId);

    if (hasUserA && hasUserB) {
      return 'unpacking_ready';
    }

    if (hasUserA || hasUserB) {
      // If the initiator completed their interview but partner hasn't yet
      const initiatorCompleted = completedInterviews.some(
        (interview) => interview.userId === session.initiatedBy,
      );
      if (initiatorCompleted) {
        return 'awaiting_partner_b';
      }
      return 'in_progress';
    }

    return session.status;
  }

  private async getUserNotificationInfo(userId: string): Promise<{ pushToken: string | null; email: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true, email: true },
    });
    return { pushToken: user?.pushToken || null, email: user?.email || null };
  }

  private async ensureSessionAccess(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        couple: true,
        interviews: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const { userAId, userBId } = session.couple;
    if (userId !== userAId && userId !== userBId) {
      throw new ForbiddenException('You are not part of this session');
    }

    return session;
  }

  private async ensureUnpackingExists(session) {
    const existing = await this.prisma.unpacking.findUnique({
      where: { sessionId: session.id },
    });

    if (existing) {
      return existing;
    }

    const placeholder = {
      surfaceConflict: 'Pending AI unpacking',
      partnerAExperience: 'Pending AI unpacking',
      partnerBExperience: 'Pending AI unpacking',
      sharedTruths: [],
      deeperInsight: 'Pending AI unpacking',
      patternRecognition: null,
      tone: 'neutral',
    };

    return this.prisma.unpacking.create({
      data: {
        sessionId: session.id,
        ...placeholder,
      },
    });
  }

  private async enqueueUnpackingJob(session) {
    const { couple, interviews } = session;
    if (!couple?.userAId || !couple?.userBId) {
      return;
    }

    const completedA = interviews.find(
      (interview) =>
        interview.userId === couple.userAId && interview.completedAt !== null,
    );
    const completedB = interviews.find(
      (interview) =>
        interview.userId === couple.userBId && interview.completedAt !== null,
    );

    if (!completedA || !completedB) {
      return;
    }

    // Fetch past session context to pass to worker
    const pastContext = await this.getPastSessionContext(session.coupleId, session.id);

    const result = await this.unpackingQueue.enqueueGenerateUnpacking({
      sessionId: session.id,
      coupleId: session.coupleId,
      partnerAInterviewId: completedA.id,
      partnerBInterviewId: completedB.id,
      partnerAResponses: completedA.responses,
      partnerBResponses: completedB.responses,
      pastContext: pastContext ?? undefined,
    });

    if (!result.enqueued) {
      // No Redis/worker available — generate unpacking inline (fire-and-forget)
      // Small delay to ensure DB transaction is committed before re-querying
      setTimeout(() => {
        this.generateUnpackingInline(session.id).catch((err) => {
          console.error(`[UNPACKING] Inline generation failed for session ${session.id}:`, err);
        });
      }, 1000);
    }
  }

  /**
   * Generates unpacking content inline using OpenAI when Redis/BullMQ
   * worker is unavailable. Uses the same prompt structure as the worker's
   * OpenAIService.generateUnpacking() to produce identical output.
   */
  private async generateUnpackingInline(sessionId: string): Promise<void> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          interviews: { include: { user: true } },
          couple: { include: { userA: true, userB: true } },
        },
      });
      if (!session) return;

      const interviews = session.interviews.filter((i) => i.completedAt);
      if (interviews.length < 2) return;

      const partnerAInterview = interviews.find(
        (i) => i.userId === session.couple.userAId,
      );
      const partnerBInterview = interviews.find(
        (i) => i.userId === session.couple.userBId,
      );
      if (!partnerAInterview || !partnerBInterview) return;

      const partnerAName = session.couple.userA?.name || 'Partner A';
      const partnerBName = session.couple.userB?.name || 'Partner B';

      const partnerAResponses = (partnerAInterview.responses as any) || [];
      const partnerBResponses = (partnerBInterview.responses as any) || [];

      // Fetch past session context for AI memory
      const pastContext = await this.getPastSessionContext(session.coupleId, sessionId);

      // Fetch couple's onboarding profile for deeper insight
      const coupleOnboarding = (session.couple.onboardingData as Record<string, any>) || null;

      // Use the same prompt as workers/src/services/openai.service.ts
      let systemPrompt = `You are writing insight cards for a couple who just shared their perspectives on a conflict. Think Spotify Wrapped energy meets relationship wisdom — personal, direct, surprising, warm.

VOICE: Direct second-person address ("You both..." / "When [Name] said X, what they were really saying was..."). Warm but not clinical. Like a wise friend who sees the bigger picture.

TONE RULES:
- Write like you're talking TO them, not ABOUT them
- Short, punchy sentences. No therapy jargon.
- Each insight should feel like a gentle truth-bomb — specific enough that they think "wow, that's exactly right"
- Frame conflicts as shared problems, never one person's fault
- Find the surprising reframe: the thing neither of them saw

OUTPUT (JSON):
- "summary": 1-2 sentences describing what happened, written directly to them using "you both" (NOT third person like "Partner A and Partner B are experiencing..."). Be specific — reference the actual topic.
- "sharedTruths": Array of 3-4 statements both partners would nod at. Use "you both" voice: "You both want to feel prioritized" not "Both partners desire prioritization."
- "positiveIntents": { partnerA: string, partnerB: string } — Reframe each person's behavior generously and specifically. Not "was trying to communicate" but explain the love/fear underneath their behavior in 2-3 sentences.
- "underlyingNeeds": { partnerA: string, partnerB: string } — What each partner actually needed underneath the surface conflict. Written as "What you really needed was..." 2-3 sentences each.
- "breakthrough": The specific miscommunication or mismatch between their needs. This is the "aha moment." Written directly to them, not generic advice. Reference their specific situation.
- "patterns": Array of 2-3 observations about their dynamic. Be specific to THEIR situation.
- "recommendations": Array of 2-3 concrete, doable micro-actions they can do TOMORROW. Not "improve communication" but specific steps referencing their situation.

CRITICAL:
- Never use passive voice or hedge language ("it seems," "perhaps")
- Every recommendation must be specific enough to actually DO
- If past context is provided, reference it: "This is something that's come up before..."`;

      // Inject couple's relationship profile from onboarding
      // Uses the shared profile builder from interview-ai.service.ts for consistency.
      // Supports both new behavioral profile fields and legacy fields.
      if (coupleOnboarding) {
        const a = coupleOnboarding.userA || {};
        const b = coupleOnboarding.userB || {};
        const profileLines: string[] = ['\nCOUPLE RELATIONSHIP PROFILE (use to deepen your analysis — never reference onboarding directly):'];

        // Helper to map a field through a lookup table
        const mapField = (val: string | undefined, map: Record<string, string>): string | null => val && map[val] ? map[val] : null;

        // New behavioral profile field mappings
        const CONFLICT_BEHAVIOR: Record<string, string> = {
          get_louder: 'Criticism/defensiveness when upset',
          go_silent: 'Stonewalling — goes quiet and shuts down',
          say_something_mean: 'Contempt/criticism under stress',
          cry_or_fall_apart: 'Emotional flooding (expressive)',
          go_numb: 'Emotional flooding (shutdown)',
        };
        const CORE_EMOTION: Record<string, string> = {
          scared: 'Fear of abandonment', hurt: 'Feeling inadequate/unworthy',
          alone: 'Emotional isolation', overwhelmed: 'Flooding/dysregulation',
          embarrassed: 'Shame response',
        };
        const PURSUE_WITHDRAW: Record<string, string> = {
          push_harder: 'Pursuer — pushes harder', pull_back: 'Withdrawer — pulls away', depends: 'Situational',
        };
        const FLOODING: Record<string, string> = {
          immediately: 'High flood risk', builds: 'Medium flood risk', stay_level: 'Low flood risk',
        };
        const CORE_FEAR: Record<string, string> = {
          abandonment: 'Fear of being left', inadequacy: 'Fear of not being enough',
          invisibility: 'Fear of being unseen', engulfment: 'Fear of losing autonomy',
          hopelessness: 'Fear it will never change',
        };
        const REPAIR: Record<string, string> = {
          real_apology: 'Words of acknowledgment', physical_closeness: 'Physical touch/proximity',
          time_apart: 'De-escalation then repair', show_it: 'Acts of service/behavior change',
          move_forward: 'Move forward without postmortem', humor: 'Levity as repair',
        };
        const THEME: Record<string, string> = {
          not_priority: 'Attention/affection deficit', no_space: 'Autonomy/control conflict',
          emotional_labor: 'Emotional labor imbalance', only_explodes: 'Conflict avoidance pattern',
          too_much: 'Emotional invalidation', uncertain: 'Commitment uncertainty',
          different_every_time: 'No persistent pattern',
        };
        const MEDIUM: Record<string, string> = {
          text: 'Fights via text — HIGH misread-tone risk', call: 'Fights via calls — tone present, expression absent',
          in_person: 'Fights in person — full signal', sit_on_it: 'Sits on it — delayed explosion risk',
        };

        const hasNewFields = (d: Record<string, any>) => !!(d.conflictBehavior || d.coreEmotion || d.pursueWithdraw || d.floodingThreshold || d.coreFear || d.repairStyle || d.recurringTheme || d.communicationMedium);

        const appendNewFields = (d: Record<string, any>, name: string) => {
          const push = (v: string | null) => { if (v) profileLines.push(`- ${name}: ${v}`); };
          push(mapField(d.conflictBehavior, CONFLICT_BEHAVIOR));
          push(mapField(d.coreEmotion, CORE_EMOTION));
          push(mapField(d.pursueWithdraw, PURSUE_WITHDRAW));
          push(mapField(d.floodingThreshold, FLOODING));
          push(mapField(d.coreFear, CORE_FEAR));
          push(mapField(d.repairStyle, REPAIR));
          push(mapField(d.recurringTheme, THEME));
          push(mapField(d.communicationMedium, MEDIUM));
        };

        const appendLegacyFields = (d: Record<string, any>, name: string) => {
          if (d.communicationStyles?.length) profileLines.push(`- ${name}'s conflict style: ${d.communicationStyles.join(', ')}`);
          if (d.conflictFeelings?.length) profileLines.push(`- What conflict triggers in ${name}: feelings of being ${d.conflictFeelings.join(', ')}`);
          if (d.attachmentStyle) profileLines.push(`- ${name}'s attachment tendency: ${d.attachmentStyle}`);
          if (d.pastConflictPatterns?.length) profileLines.push(`- ${name}'s recurring patterns: ${d.pastConflictPatterns.join(', ')}`);
        };

        // Partner A profile
        if (hasNewFields(a)) {
          appendNewFields(a, partnerAName);
        } else {
          appendLegacyFields(a, partnerAName);
        }

        // Partner B profile
        if (hasNewFields(b)) {
          appendNewFields(b, partnerBName);
        } else {
          appendLegacyFields(b, partnerBName);
        }

        profileLines.push('');
        profileLines.push('USE THIS TO:');
        profileLines.push('- Use flooding threshold to pace the unpacking — gentler framing for high-flood-risk partners');
        profileLines.push('- Use conflict behavior to understand what they SHOW vs what they FEEL (core emotion)');
        profileLines.push('- Use pursue/withdraw role to explain each partner\'s behavior to the other without taking sides');
        profileLines.push('- Use core fear to frame insights protectively — approach the wound, don\'t poke it');
        profileLines.push('- Use repair style for concrete reconnection recommendations that match what actually helps them');
        profileLines.push('- Use recurring theme to flag if this conflict is a variation of a perpetual pattern');
        profileLines.push('- Use communication medium to note tone-reading risks (especially text-based fights)');
        profileLines.push('- Make recommendations that account for each person\'s style (don\'t ask a withdrawer to "talk more" — ask them to signal they\'re coming back)');
        if (profileLines.length > 2) systemPrompt += profileLines.join('\n');
      }

      // Inject past session context if available
      if (pastContext) {
        systemPrompt += `\n\nYou have context from this couple's previous sessions. Reference recurring patterns and past commitments when relevant. Build on previous insights — don't repeat them.\n\n${pastContext}`;
      }

      const userPrompt = `Partner A (${partnerAName})'s perspective:
${JSON.stringify(partnerAResponses, null, 2)}

Partner B (${partnerBName})'s perspective:
${JSON.stringify(partnerBResponses, null, 2)}

Please analyze this conflict and provide your response in this exact JSON format:
{
  "summary": "1-2 sentences written directly to the couple using 'you both'",
  "sharedTruths": ["statement using 'you both' voice", "another shared truth"],
  "positiveIntents": {
    "partnerA": "2-3 sentences reframing their behavior generously",
    "partnerB": "2-3 sentences reframing their behavior generously"
  },
  "underlyingNeeds": {
    "partnerA": "What you really needed was... (2-3 sentences)",
    "partnerB": "What you really needed was... (2-3 sentences)"
  },
  "breakthrough": "The aha moment — the specific miscommunication or mismatch",
  "patterns": ["specific observation about their dynamic"],
  "recommendations": ["concrete micro-action they can do tomorrow"]
}`;

      const client = new OpenAI({
        apiKey: this.configService.get('OPENAI_API_KEY'),
      });
      const model = this.configService.get('OPENAI_MODEL') || 'gpt-4o-mini';

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);

      // Helper matching the worker's toText conversion
      const toText = (value: any) =>
        Array.isArray(value) ? value.join('\n') : value || '';

      // Build partner experience fields with underlying needs appended
      const partnerAExp = `${parsed.positiveIntents?.partnerA || ''}\n\nWhat you needed: ${parsed.underlyingNeeds?.partnerA || ''}`;
      const partnerBExp = `${parsed.positiveIntents?.partnerB || ''}\n\nWhat you needed: ${parsed.underlyingNeeds?.partnerB || ''}`;

      // Upsert with real content (mirrors unpacking.processor.ts upsert)
      await this.prisma.unpacking.upsert({
        where: { sessionId },
        create: {
          sessionId,
          surfaceConflict: parsed.summary ?? 'Pending unpacking',
          partnerAExperience: partnerAExp,
          partnerBExperience: partnerBExp,
          sharedTruths: parsed.sharedTruths ?? [],
          deeperInsight: parsed.breakthrough || toText(parsed.recommendations),
          patternRecognition: toText(parsed.patterns),
          tone: 'supportive',
        },
        update: {
          surfaceConflict: parsed.summary ?? 'Pending unpacking',
          partnerAExperience: partnerAExp,
          partnerBExperience: partnerBExp,
          sharedTruths: parsed.sharedTruths ?? [],
          deeperInsight: parsed.breakthrough || toText(parsed.recommendations),
          patternRecognition: toText(parsed.patterns),
          tone: 'supportive',
        },
      });

      console.log(`[UNPACKING] Inline generation complete for session ${sessionId}`);
    } catch (err) {
      console.error(`[UNPACKING] Inline generation failed for session ${sessionId}:`, err);
    }
  }

  /**
   * Regenerates unpacking content inline using OpenAI when Redis/BullMQ
   * worker is unavailable. Incorporates user feedback to produce improved
   * insights. Mirrors the prompt structure of generateUnpackingInline()
   * but includes the previous output and feedback context.
   */
  private async regenerateUnpackingInline(
    sessionId: string,
    feedbackReason: string,
    feedbackText?: string,
  ): Promise<void> {
    try {
      const existingUnpacking = await this.prisma.unpacking.findUnique({
        where: { sessionId },
      });
      if (!existingUnpacking) return;

      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          interviews: { include: { user: true } },
          couple: { include: { userA: true, userB: true } },
        },
      });
      if (!session) return;

      const interviews = session.interviews.filter((i) => i.completedAt);
      if (interviews.length < 2) return;

      const partnerAInterview = interviews.find(
        (i) => i.userId === session.couple.userAId,
      );
      const partnerBInterview = interviews.find(
        (i) => i.userId === session.couple.userBId,
      );
      if (!partnerAInterview || !partnerBInterview) return;

      const partnerAName = session.couple.userA?.name || 'Partner A';
      const partnerBName = session.couple.userB?.name || 'Partner B';

      const partnerAResponses = (partnerAInterview.responses as any) || [];
      const partnerBResponses = (partnerBInterview.responses as any) || [];

      // Map feedback reason to human-readable text
      const feedbackReasonMap: Record<string, string> = {
        missed_core_issue: 'The user felt the analysis missed the core issue',
        inaccurate_partner_perspective: "The user felt a partner's perspective was inaccurately represented",
        too_generic: 'The user felt the insights were too generic',
        other: feedbackText || 'The user provided additional feedback',
      };
      const readableFeedback = feedbackReasonMap[feedbackReason] || feedbackReasonMap['other'];

      // Same system prompt as generateUnpackingInline() with feedback context
      const systemPrompt = `You are writing insight cards for a couple who just shared their perspectives on a conflict. Think Spotify Wrapped energy meets relationship wisdom — personal, direct, surprising, warm.

VOICE: Direct second-person address ("You both..." / "When [Name] said X, what they were really saying was..."). Warm but not clinical. Like a wise friend who sees the bigger picture.

TONE RULES:
- Write like you're talking TO them, not ABOUT them
- Short, punchy sentences. No therapy jargon.
- Each insight should feel like a gentle truth-bomb — specific enough that they think "wow, that's exactly right"
- Frame conflicts as shared problems, never one person's fault
- Find the surprising reframe: the thing neither of them saw

You previously generated an analysis for this couple, but one of the partners provided feedback.
They ${readableFeedback}.${feedbackText && feedbackReason !== 'other' ? `\n\nTheir additional feedback: "${feedbackText}"` : ''}

Please regenerate your analysis with improved accuracy and specificity based on this feedback.

OUTPUT (JSON):
- "summary": 1-2 sentences describing what happened, written directly to them using "you both". Be specific.
- "sharedTruths": Array of 3-4 statements both partners would nod at. Use "you both" voice.
- "positiveIntents": { partnerA: string, partnerB: string } — Reframe each person's behavior generously in 2-3 sentences.
- "underlyingNeeds": { partnerA: string, partnerB: string } — What each partner actually needed. Written as "What you really needed was..." 2-3 sentences each.
- "breakthrough": The specific miscommunication or mismatch. The "aha moment." Written directly to them.
- "patterns": Array of 2-3 observations about their dynamic. Be specific to THEIR situation.
- "recommendations": Array of 2-3 concrete, doable micro-actions they can do TOMORROW.

CRITICAL:
- Never use passive voice or hedge language ("it seems," "perhaps")
- Every recommendation must be specific enough to actually DO`;

      const userPrompt = `Partner A (${partnerAName})'s perspective:
${JSON.stringify(partnerAResponses, null, 2)}

Partner B (${partnerBName})'s perspective:
${JSON.stringify(partnerBResponses, null, 2)}

Your previous analysis was:
${JSON.stringify({
  summary: existingUnpacking.surfaceConflict,
  positiveIntents: {
    partnerA: existingUnpacking.partnerAExperience,
    partnerB: existingUnpacking.partnerBExperience,
  },
  sharedTruths: existingUnpacking.sharedTruths,
  patterns: existingUnpacking.patternRecognition,
  recommendations: existingUnpacking.deeperInsight,
}, null, 2)}

Feedback from the user: ${readableFeedback}${feedbackText && feedbackReason !== 'other' ? ` — Additional details: "${feedbackText}"` : ''}

Please regenerate your analysis, addressing the feedback. Provide your response in this exact JSON format:
{
  "summary": "1-2 sentences written directly to the couple using 'you both'",
  "sharedTruths": ["statement using 'you both' voice", "another shared truth"],
  "positiveIntents": {
    "partnerA": "2-3 sentences reframing their behavior generously",
    "partnerB": "2-3 sentences reframing their behavior generously"
  },
  "underlyingNeeds": {
    "partnerA": "What you really needed was... (2-3 sentences)",
    "partnerB": "What you really needed was... (2-3 sentences)"
  },
  "breakthrough": "The aha moment — the specific miscommunication or mismatch",
  "patterns": ["specific observation about their dynamic"],
  "recommendations": ["concrete micro-action they can do tomorrow"]
}`;

      const client = new OpenAI({
        apiKey: this.configService.get('OPENAI_API_KEY'),
      });
      const model = this.configService.get('OPENAI_MODEL') || 'gpt-4o-mini';

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);

      // Helper matching the worker's toText conversion
      const toText = (value: any) =>
        Array.isArray(value) ? value.join('\n') : value || '';

      // Build partner experience fields with underlying needs appended
      const partnerAExp = `${parsed.positiveIntents?.partnerA || ''}\n\nWhat you needed: ${parsed.underlyingNeeds?.partnerA || ''}`;
      const partnerBExp = `${parsed.positiveIntents?.partnerB || ''}\n\nWhat you needed: ${parsed.underlyingNeeds?.partnerB || ''}`;

      // Upsert with regenerated content (mirrors unpacking.processor.ts upsert)
      await this.prisma.unpacking.upsert({
        where: { sessionId },
        create: {
          sessionId,
          surfaceConflict: parsed.summary ?? 'Pending unpacking',
          partnerAExperience: partnerAExp,
          partnerBExperience: partnerBExp,
          sharedTruths: parsed.sharedTruths ?? [],
          deeperInsight: parsed.breakthrough || toText(parsed.recommendations),
          patternRecognition: toText(parsed.patterns),
          tone: 'supportive',
        },
        update: {
          surfaceConflict: parsed.summary ?? 'Pending unpacking',
          partnerAExperience: partnerAExp,
          partnerBExperience: partnerBExp,
          sharedTruths: parsed.sharedTruths ?? [],
          deeperInsight: parsed.breakthrough || toText(parsed.recommendations),
          patternRecognition: toText(parsed.patterns),
          tone: 'supportive',
        },
      });

      console.log(`[UNPACKING] Inline regeneration complete for session ${sessionId}`);
    } catch (err) {
      console.error(`[UNPACKING] Inline regeneration failed for session ${sessionId}:`, err);
    }
  }

  private async notifyUnpackingReady(session) {
    const { couple } = session;
    if (!couple?.userAId || !couple?.userBId) {
      return;
    }

    const [userAInfo, userBInfo] = await Promise.all([
      this.getUserNotificationInfo(couple.userAId),
      this.getUserNotificationInfo(couple.userBId),
    ]);

    await Promise.all([
      this.notificationsService.send({
        userId: couple.userAId,
        type: 'unpacking_ready',
        title: 'Your unpacking is ready! 💙',
        body: 'See insights together',
        pushToken: userAInfo.pushToken ?? undefined,
        email: userAInfo.email ?? undefined,
        channels: ['push', 'email'],
        data: { sessionId: session.id },
      }),
      this.notificationsService.send({
        userId: couple.userBId,
        type: 'unpacking_ready',
        title: 'Your unpacking is ready! 💙',
        body: 'See insights together',
        pushToken: userBInfo.pushToken ?? undefined,
        email: userBInfo.email ?? undefined,
        channels: ['push', 'email'],
        data: { sessionId: session.id },
      }),
    ]);
  }

  private async schedulePostResolutionCheckIn(session) {
    const { couple } = session;
    if (!couple?.userAId || !couple?.userBId) {
      return;
    }

    const immediate = process.env.NOTIFICATIONS_SEND_REMINDERS_IMMEDIATELY === 'true';
    const hasQueue =
      this.notificationsQueue && (this.notificationsQueue as any)['enabled'] !== false;

    const [userAInfo, userBInfo] = await Promise.all([
      this.getUserNotificationInfo(couple.userAId),
      this.getUserNotificationInfo(couple.userBId),
    ]);

    const checkinA: NotificationPayload = {
      userId: couple.userAId,
      type: 'post_resolution_checkin',
      title: 'How have things been since your last mediation?',
      body: "Let us know how you're feeling after resolving your session.",
      pushToken: userAInfo.pushToken ?? undefined,
      email: userAInfo.email ?? undefined,
      channels: ['push'],
      data: { sessionId: session.id },
    };
    const checkinB: NotificationPayload = { ...checkinA, userId: couple.userBId, pushToken: userBInfo.pushToken ?? undefined, email: userBInfo.email ?? undefined };

    const delayMs = 3 * 24 * 60 * 60 * 1000; // 3 days

    if (hasQueue) {
      await this.notificationsQueue.enqueue(checkinA, delayMs);
      await this.notificationsQueue.enqueue(checkinB, delayMs);
    } else if (immediate) {
      await this.notificationsService.send(checkinA);
      await this.notificationsService.send(checkinB);
    }
  }

  // Hook to remind partner if no interview within 24h/48h (stub; schedule via cron/worker in future)
  async sendInterviewReminder(userId: string, partnerName: string, hours: number, sessionId: string) {
    const userInfo = await this.getUserNotificationInfo(userId);
    await this.notificationsService.send({
      userId,
      type: 'interview_reminder',
      title: `${partnerName} is waiting to hear your perspective 💭`,
      body: `It's been ${hours} hours since the session was started.`,
      pushToken: userInfo.pushToken ?? undefined,
      email: userInfo.email ?? undefined,
      channels: ['push', 'email'],
      data: { sessionId },
    });
  }

  private async scheduleInterviewReminders(partnerId: string, initiatorName: string, sessionId: string) {
    const immediate = process.env.NOTIFICATIONS_SEND_REMINDERS_IMMEDIATELY === 'true';
    const hasQueue =
      this.notificationsQueue && (this.notificationsQueue as any)['enabled'] !== false;

    const partnerInfo = await this.getUserNotificationInfo(partnerId);

    const reminder24: NotificationPayload = {
      userId: partnerId,
      type: 'interview_reminder_24h',
      title: `${initiatorName} is waiting to hear your perspective 💭`,
      body: "It's been 24 hours since the session was started.",
      pushToken: partnerInfo.pushToken ?? undefined,
      email: partnerInfo.email ?? undefined,
      channels: ['push', 'email'],
      data: { sessionId },
    };

    const reminder48: NotificationPayload = {
      userId: partnerId,
      type: 'interview_reminder_48h',
      title: 'Last reminder - mediation session waiting for you',
      body: 'It has been 48 hours. You can respond now or request more time.',
      pushToken: partnerInfo.pushToken ?? undefined,
      email: partnerInfo.email ?? undefined,
      channels: ['push', 'email'],
      data: { sessionId },
    };

    if (hasQueue) {
      await this.notificationsQueue.enqueue(reminder24, 24 * 60 * 60 * 1000);
      await this.notificationsQueue.enqueue(reminder48, 48 * 60 * 60 * 1000);
    } else if (immediate) {
      await this.notificationsService.send(reminder24);
      await this.notificationsService.send(reminder48);
    }
  }

  private async notifyPartnerBInvite(partnerId: string, initiatorName: string, sessionId: string, topicTag: string) {
    const partnerInfo = await this.getUserNotificationInfo(partnerId);
    await this.notificationsService.send({
      userId: partnerId,
      type: 'partner_b_invite',
      title: `${initiatorName} asked me to reach out to you.`,
      body: `Topic: ${topicTag} — I'd love to hear your side.`,
      pushToken: partnerInfo.pushToken ?? undefined,
      email: partnerInfo.email ?? undefined,
      channels: ['push', 'email'],
      data: { sessionId, topicTag },
    });
  }

  private async schedulePartnerBReminders(partnerId: string, initiatorName: string, sessionId: string, topicTag: string) {
    const immediate = process.env.NOTIFICATIONS_SEND_REMINDERS_IMMEDIATELY === 'true';
    const hasQueue = this.notificationsQueue && (this.notificationsQueue as any)['enabled'] !== false;

    const partnerInfo = await this.getUserNotificationInfo(partnerId);

    const reminder4h: NotificationPayload = {
      userId: partnerId,
      type: 'partner_b_reminder_4h',
      title: `${initiatorName} is waiting to hear your perspective`,
      body: `Topic: ${topicTag} — Your side of the story matters.`,
      pushToken: partnerInfo.pushToken ?? undefined,
      email: partnerInfo.email ?? undefined,
      channels: ['push'],
      data: { sessionId, topicTag },
    };

    const reminder24h: NotificationPayload = {
      userId: partnerId,
      type: 'partner_b_reminder_24h',
      title: `${initiatorName} shared something important`,
      body: `Topic: ${topicTag} — Sharing your perspective helps you both.`,
      pushToken: partnerInfo.pushToken ?? undefined,
      email: partnerInfo.email ?? undefined,
      channels: ['push', 'email'],
      data: { sessionId, topicTag },
    };

    const reminder72h: NotificationPayload = {
      userId: partnerId,
      type: 'partner_b_reminder_72h',
      title: 'Last reminder — mediation session waiting for you',
      body: `${initiatorName} shared their side 3 days ago. Your perspective matters too.`,
      pushToken: partnerInfo.pushToken ?? undefined,
      email: partnerInfo.email ?? undefined,
      channels: ['push', 'email'],
      data: { sessionId, topicTag },
    };

    if (hasQueue) {
      await this.notificationsQueue.enqueue(reminder4h, 4 * 60 * 60 * 1000);
      await this.notificationsQueue.enqueue(reminder24h, 24 * 60 * 60 * 1000);
      await this.notificationsQueue.enqueue(reminder72h, 72 * 60 * 60 * 1000);
    } else if (immediate) {
      await this.notificationsService.send(reminder4h);
      await this.notificationsService.send(reminder24h);
      await this.notificationsService.send(reminder72h);
    }
  }

  private async notifyPartnerAStarted(initiatorId: string, partnerName: string, sessionId: string) {
    const initiatorInfo = await this.getUserNotificationInfo(initiatorId);
    await this.notificationsService.send({
      userId: initiatorId,
      type: 'partner_b_started',
      title: `${partnerName} just started sharing their side`,
      body: 'The mediation process is moving forward.',
      pushToken: initiatorInfo.pushToken ?? undefined,
      email: initiatorInfo.email ?? undefined,
      channels: ['push'],
      data: { sessionId },
    });
  }

  async getPartnerBContext(sessionId: string, userId: string) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    if (session.initiatedBy === userId) {
      throw new ForbiddenException('Partner A cannot access this endpoint.');
    }

    const initiator = await this.prisma.user.findUnique({
      where: { id: session.initiatedBy },
      select: { name: true },
    });

    const extraction = session.partnerAExtraction as { topicTag?: string; issues?: string[]; needs?: string[]; emotions?: string[] } | null;

    // Check if Partner B has a draft
    const existingInterview = await this.prisma.interview.findFirst({
      where: { sessionId, userId },
    });

    const firstName = initiator?.name?.split(' ')[0] || 'Your partner';

    return {
      topicTag: session.topicTag || 'Something on their mind',
      initiatorName: firstName,
      openingMessage: `${firstName} shared something they've been thinking about — "${session.topicTag || 'a situation between you'}." I'd love to hear your perspective too. What's been on your mind about this?`,
      contextForAI: {
        issues: extraction?.issues || [],
        needs: extraction?.needs || [],
        emotions: extraction?.emotions || [],
      },
      hasDraft: !!existingInterview && !existingInterview.completedAt,
    };
  }

  async snoozePartnerBInvite(sessionId: string, userId: string) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    if (session.initiatedBy === userId) {
      throw new ForbiddenException('Only Partner B can snooze the invite.');
    }

    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + 2);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { partnerBSnoozedUntil: snoozedUntil },
    });

    // Schedule a reminder after snooze period
    const initiator = await this.prisma.user.findUnique({
      where: { id: session.initiatedBy },
      select: { name: true },
    });

    const immediate = process.env.NOTIFICATIONS_SEND_REMINDERS_IMMEDIATELY === 'true';
    const hasQueue = this.notificationsQueue && (this.notificationsQueue as any)['enabled'] !== false;

    const userInfo = await this.getUserNotificationInfo(userId);
    const reminder: NotificationPayload = {
      userId,
      type: 'partner_b_snooze_reminder',
      title: `Ready to share your perspective?`,
      body: `${initiator?.name || 'Your partner'} is still waiting to hear your side.`,
      pushToken: userInfo.pushToken ?? undefined,
      email: userInfo.email ?? undefined,
      channels: ['push'],
      data: { sessionId },
    };

    if (hasQueue) {
      await this.notificationsQueue.enqueue(reminder, 2 * 60 * 60 * 1000);
    } else if (immediate) {
      await this.notificationsService.send(reminder);
    }

    return { snoozedUntil: snoozedUntil.toISOString(), message: "We'll remind you in 2 hours." };
  }
}
