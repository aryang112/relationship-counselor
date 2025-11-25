import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { CouplesService } from '../couples/couples.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitInterviewDto } from './dto/submit-interview.dto';

const FINAL_SESSION_STATUSES = ['resolved', 'abandoned'];
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  initiated: ['in_progress', 'abandoned'],
  in_progress: ['unpacking_ready', 'abandoned'],
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
  ) {}

  async startSession(userId: string, dto: StartSessionDto) {
    const couple = await this.couplesService.getCoupleForUser(userId);

    if (!couple.userBId) {
      throw new ConflictException('Your partner must join before starting a session.');
    }

    if (!couple.agreementSignedAt) {
      throw new ForbiddenException('Both partners must sign the agreement before starting a session. Please complete the agreement first.');
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

    // TODO: NOTIFICATION - Send notification to partner when session is initiated
    // When Partner A starts a session, Partner B should receive:
    // - Push notification: "{Partner A name} wants to work through something with you 💙"
    // - Email notification with same message and [Join the session] link
    // Implementation:
    //   const partnerId = couple.userAId === userId ? couple.userBId : couple.userAId;
    //   const initiator = await this.prisma.user.findUnique({ where: { id: userId } });
    //   await this.notificationsService.send({
    //     userId: partnerId,
    //     type: 'session_initiated',
    //     title: `${initiator.name} wants to work through something with you 💙`,
    //     body: 'Tap to participate',
    //     channels: ['push', 'email'],
    //     data: { sessionId: session.id }
    //   });
    // See spec: relationship-app-detailed-design-spec.md - Flow 2: Starting a Mediation Session

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

  async submitInterview(
    sessionId: string,
    userId: string,
    dto: SubmitInterviewDto,
  ) {
    const session = await this.ensureSessionAccess(sessionId, userId);

    const existingInterview = await this.prisma.interview.findFirst({
      where: { sessionId, userId },
    });

    if (existingInterview) {
      throw new ConflictException('You have already completed this interview.');
    }

    const interview = await this.prisma.interview.create({
        data: {
          sessionId,
          userId,
          responses: dto.responses,
          notes: dto.notes,
            completedAt: new Date(),
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
      latestSession = await this.prisma.session.update({
        where: { id: session.id },
        data: { status: nextStatus },
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

    const userAId = session.couple.userAId;
    const userBId = session.couple.userBId;

    const hasUserA =
      !!userAId && interviews.some((interview) => interview.userId === userAId);
    const hasUserB =
      !!userBId && interviews.some((interview) => interview.userId === userBId);

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
    const validStatuses = ['initiated', 'in_progress', 'unpacking_ready', 'reconnection', 'resolved', 'abandoned'];
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

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: newStatus },
      include: {
        couple: true,
        interviews: true,
      },
    });
  }

  private calculateSessionStatus(session, interviews) {
    const hasUserA =
      !!session.couple.userAId &&
      interviews.some((interview) => interview.userId === session.couple.userAId);
    const hasUserB =
      !!session.couple.userBId &&
      interviews.some((interview) => interview.userId === session.couple.userBId);

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
      return 'in_progress';
    }

    return session.status;
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
}
