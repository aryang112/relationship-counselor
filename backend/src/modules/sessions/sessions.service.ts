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

  async startSession(userId: string, dto: StartSessionDto) {
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

    return {
      interview,
      session: latestSession,
    };
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
      await this.unpackingQueue.enqueueRegenerateUnpacking({
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
      // TODO: NOTIFICATION - Send notifications when unpacking is ready
      // When both partners complete interviews, both should receive:
      // - Push notification: "Your unpacking is ready! 💙"
      // - Email notification with [View insights] link
      // Implementation:
      //   await this.notificationsService.sendToCouple(session.couple.id, {
      //     type: 'unpacking_ready',
      //     title: 'Your unpacking is ready! 💙',
      //     body: 'See insights together',
      //     channels: ['push', 'email'],
      //     data: { sessionId: session.id }
      //   });
      // See spec: relationship-app-detailed-design-spec.md - Flow 4: AI Unpacking Generation & Viewing

      // TODO: WORKER - Queue unpacking generation job
      // When both interviews are complete, trigger AI unpacking generation:
      //   await this.unpackingQueue.add('generate-unpacking', {
      //     sessionId: session.id,
      //     interviewA: interviews.find(i => i.userId === session.couple.userAId),
      //     interviewB: interviews.find(i => i.userId === session.couple.userBId)
      //   });
      // Worker will generate insights using OpenAI and store in unpacking table

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

    const result = await this.unpackingQueue.enqueueGenerateUnpacking({
      sessionId: session.id,
      coupleId: session.coupleId,
      partnerAInterviewId: completedA.id,
      partnerBInterviewId: completedB.id,
      partnerAResponses: completedA.responses,
      partnerBResponses: completedB.responses,
    });

    if (!result.enqueued) {
      // No Redis/worker available — generate unpacking inline (fire-and-forget)
      this.generateUnpackingInline(session.id).catch(() => {});
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

      // Use the same prompt as workers/src/services/openai.service.ts
      const systemPrompt = `You are a neutral, emotionally safe mediator for romantic partners.
Tone: slow, warm, grounded, gentle, deeply validating. Use soft, simple sentences and short lines.
Always create safety, validate both partners, slow the moment down, and make the situation feel workable.
Focus on needs, vulnerability, and misunderstandings; guide them toward feeling on the same team.
Never blame, escalate, pressure, diagnose, moralize, or suggest breaking up.
Goal: emotional safety → clarity → understanding → reconnection.

Return ONLY JSON with keys: summary, sharedTruths, positiveIntents, patterns, recommendations.
- summary: a short neutral recount of the conflict (1–2 sentences, gentle tone)
- sharedTruths: array of validating statements both might agree with
- positiveIntents: { partnerA: string, partnerB: string } reframing each partner generously
- patterns: array of gentle observations about dynamics
- recommendations: array of short, calming next steps (no blame, no ultimatums).`;

      const userPrompt = `Partner A (${partnerAName})'s perspective:
${JSON.stringify(partnerAResponses, null, 2)}

Partner B (${partnerBName})'s perspective:
${JSON.stringify(partnerBResponses, null, 2)}

Please analyze this conflict and provide your response in this exact JSON format:
{
  "summary": "A single string summarizing the conflict from both perspectives",
  "sharedTruths": ["array", "of", "strings"],
  "positiveIntents": {
    "partnerA": "positive reframing of Partner A's behavior as a string",
    "partnerB": "positive reframing of Partner B's behavior as a string"
  },
  "patterns": ["array", "of", "pattern", "strings"],
  "recommendations": ["array", "of", "recommendation", "strings"]
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

      // Upsert with real content (mirrors unpacking.processor.ts upsert)
      await this.prisma.unpacking.upsert({
        where: { sessionId },
        create: {
          sessionId,
          surfaceConflict: parsed.summary ?? 'Pending unpacking',
          partnerAExperience: parsed.positiveIntents?.partnerA ?? '',
          partnerBExperience: parsed.positiveIntents?.partnerB ?? '',
          sharedTruths: parsed.sharedTruths ?? [],
          deeperInsight: toText(parsed.recommendations),
          patternRecognition: toText(parsed.patterns),
          tone: 'supportive',
        },
        update: {
          surfaceConflict: parsed.summary ?? 'Pending unpacking',
          partnerAExperience: parsed.positiveIntents?.partnerA ?? '',
          partnerBExperience: parsed.positiveIntents?.partnerB ?? '',
          sharedTruths: parsed.sharedTruths ?? [],
          deeperInsight: toText(parsed.recommendations),
          patternRecognition: toText(parsed.patterns),
          tone: 'supportive',
        },
      });

      console.log(`[UNPACKING] Inline generation complete for session ${sessionId}`);
    } catch (err) {
      console.error(`[UNPACKING] Inline generation failed for session ${sessionId}:`, err);
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
