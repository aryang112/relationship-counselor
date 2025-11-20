import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CouplesService } from '../couples/couples.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitInterviewDto } from './dto/submit-interview.dto';

const FINAL_SESSION_STATUSES = ['resolved', 'abandoned'];

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
      throw new ConflictException('Both partners must sign the agreement before starting a session.');
    }

    const existingSession = await this.prisma.session.findFirst({
      where: {
        coupleId: couple.id,
        status: { notIn: FINAL_SESSION_STATUSES },
      },
    });

    if (existingSession) {
      throw new ConflictException('There is already an active session.');
    }

    return this.prisma.session.create({
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
  }

  async getSession(sessionId: string, userId: string) {
    return this.ensureSessionAccess(sessionId, userId);
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

    const interview = existingInterview
      ? await this.prisma.interview.update({
          where: { id: existingInterview.id },
          data: {
            responses: dto.responses,
            notes: dto.notes,
            completedAt: new Date(),
          },
        })
      : await this.prisma.interview.create({
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

    return this.prisma.session.findMany({
      where: { coupleId: couple.id },
      include: {
        interviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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
