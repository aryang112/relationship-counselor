import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../../prisma.service';
import { CouplesService } from '../couples/couples.service';
import { UnpackingQueueService } from '../unpacking/unpacking-queue.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsQueueService } from '../notifications/notifications-queue.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: {
    session: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    interview: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    unpacking: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let couplesService: {
    getCoupleForUser: jest.Mock;
    bothPartnersSignedAgreement: jest.Mock;
  };
  let unpackingQueue: { enqueueGenerateUnpacking: jest.Mock };
  let notificationsService: { send: jest.Mock };
  let notificationsQueue: { enqueue: jest.Mock };

  beforeEach(async () => {
    prisma = {
      session: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      interview: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      unpacking: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    couplesService = {
      getCoupleForUser: jest.fn(),
      bothPartnersSignedAgreement: jest.fn(),
    };

    unpackingQueue = {
      enqueueGenerateUnpacking: jest.fn(),
    };

    notificationsService = {
      send: jest.fn(),
    };

    notificationsQueue = {
      enqueue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CouplesService, useValue: couplesService },
        { provide: UnpackingQueueService, useValue: unpackingQueue },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: NotificationsQueueService, useValue: notificationsQueue },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  describe('startSession', () => {
    it('creates a session when couple is ready', async () => {
      const couple = {
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: new Date(),
        userBSignedAt: new Date(),
      };
      couplesService.getCoupleForUser.mockResolvedValueOnce(couple);
      couplesService.bothPartnersSignedAgreement.mockReturnValueOnce(true);
      prisma.session.findFirst.mockResolvedValueOnce(null);
      prisma.session.create.mockResolvedValueOnce({
        id: 'session-id',
        coupleId: 'couple-id',
        status: 'initiated',
        initiatedBy: 'user-a',
        interviews: [],
      });
      prisma.user.findUnique.mockResolvedValueOnce({ name: 'User A' });

      const result = await service.startSession('user-a', {
        topic: 'topic',
        context: 'context',
      });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          coupleId: 'couple-id',
          status: 'initiated',
          initiatedBy: 'user-a',
          topic: 'topic',
          context: 'context',
        },
        include: { interviews: true },
      });
      expect(result.id).toBe('session-id');
      expect(notificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-b',
          type: 'session_initiated',
        }),
      );
    });

    it('throws when partner not joined', async () => {
      couplesService.getCoupleForUser.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: null,
        userASignedAt: new Date(),
        userBSignedAt: null,
      });

      await expect(
        service.startSession('user-a', { topic: 't' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws when agreement not signed by both', async () => {
      const couple = {
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: new Date(),
        userBSignedAt: null, // Only one partner signed
      };
      couplesService.getCoupleForUser.mockResolvedValueOnce(couple);
      couplesService.bothPartnersSignedAgreement.mockReturnValueOnce(false);

      await expect(
        service.startSession('user-a', { topic: 't' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when neither partner signed agreement', async () => {
      const couple = {
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: null,
        userBSignedAt: null,
      };
      couplesService.getCoupleForUser.mockResolvedValueOnce(couple);
      couplesService.bothPartnersSignedAgreement.mockReturnValueOnce(false);

      await expect(
        service.startSession('user-a', { topic: 't' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when active session exists', async () => {
      const couple = {
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: new Date(),
        userBSignedAt: new Date(),
      };
      couplesService.getCoupleForUser.mockResolvedValueOnce(couple);
      couplesService.bothPartnersSignedAgreement.mockReturnValueOnce(true);
      prisma.session.findFirst.mockResolvedValueOnce({
        id: 'session-id',
        status: 'initiated',
      });

      await expect(
        service.startSession('user-a', { topic: 't' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('submitInterview', () => {
    const baseSession = {
      id: 'session-id',
      status: 'initiated',
      couple: {
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
      },
      interviews: [],
    };

    it('creates interview and updates status to in_progress', async () => {
      prisma.session.findUnique.mockResolvedValueOnce(baseSession);
      prisma.interview.findFirst.mockResolvedValueOnce(null);

      const completedInterview = {
        id: 'interview-a',
        userId: 'user-a',
        completedAt: new Date(),
      };

      // Mock upsert behavior - returns created interview
      prisma.interview.upsert = jest.fn().mockResolvedValueOnce(completedInterview);

      prisma.interview.findMany.mockResolvedValueOnce([completedInterview]);
      prisma.session.update.mockResolvedValueOnce({
        ...baseSession,
        status: 'in_progress',
        interviews: [completedInterview],
      });

      const result = await service.submitInterview('session-id', 'user-a', {
        responses: { q1: 'answer' },
      });

      expect(prisma.interview.upsert).toHaveBeenCalled();
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: { status: 'in_progress' },
        include: { couple: true, interviews: true },
      });
      expect(result.session.status).toBe('in_progress');
    });

    it('throws conflict when same user resubmits completed interview', async () => {
      prisma.session.findUnique.mockResolvedValueOnce(baseSession);
      prisma.interview.findFirst.mockResolvedValueOnce({
        id: 'interview-a',
        userId: 'user-a',
        completedAt: new Date(), // Already completed
      });

      await expect(
        service.submitInterview('session-id', 'user-a', {
          responses: { q1: 'answer' },
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.interview.upsert).not.toHaveBeenCalled();
    });

    it('enqueues unpacking job when both interviews complete', async () => {
      const sessionWithOneComplete = {
        ...baseSession,
        couple: { ...baseSession.couple },
        interviews: [],
      };

      prisma.session.findUnique.mockResolvedValueOnce(sessionWithOneComplete);
      prisma.interview.findFirst.mockResolvedValueOnce(null); // user-b hasn't submitted yet

      const interviewA = {
        id: 'interview-a',
        userId: 'user-a',
        completedAt: new Date(),
        responses: { a: 1 },
      };
      const interviewB = {
        id: 'interview-b',
        userId: 'user-b',
        completedAt: new Date(),
        responses: { b: 2 },
      };

      prisma.interview.upsert.mockResolvedValueOnce(interviewB);
      prisma.interview.findMany.mockResolvedValueOnce([interviewA, interviewB]);
      prisma.session.update.mockResolvedValueOnce({
        ...sessionWithOneComplete,
        coupleId: baseSession.couple.id,
        status: 'unpacking_ready',
        interviews: [interviewA, interviewB],
      });

      // Mock unpacking creation
      prisma.unpacking.findUnique.mockResolvedValueOnce(null); // No existing unpacking
      prisma.unpacking.create.mockResolvedValueOnce({
        id: 'unpacking-id',
        sessionId: 'session-id',
        surfaceConflict: 'Pending AI unpacking',
        partnerAExperience: 'Pending AI unpacking',
        partnerBExperience: 'Pending AI unpacking',
        sharedTruths: [],
        deeperInsight: 'Pending AI unpacking',
        patternRecognition: null,
        tone: 'neutral',
        feedbackCount: 0,
        lastFeedbackReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.submitInterview('session-id', 'user-b', {
        responses: { q1: 'answer' },
      });

      expect(unpackingQueue.enqueueGenerateUnpacking).toHaveBeenCalledWith({
        sessionId: 'session-id',
        coupleId: baseSession.couple.id,
        partnerAInterviewId: interviewA.id,
        partnerBInterviewId: interviewB.id,
        partnerAResponses: interviewA.responses,
        partnerBResponses: interviewB.responses,
      });
      expect(notificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-a', type: 'unpacking_ready' }),
      );
      expect(notificationsService.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-b', type: 'unpacking_ready' }),
      );
    });
  });

  describe('getSession', () => {
    it('throws when session missing', async () => {
      prisma.session.findUnique.mockResolvedValueOnce(null);

      await expect(service.getSession('missing', 'user-a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws when user not part of couple', async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: 'session-id',
        couple: { userAId: 'user-a', userBId: 'user-b' },
        interviews: [],
      });

      await expect(service.getSession('session-id', 'user-c')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns session when user is member', async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: 'session-id',
        couple: { userAId: 'user-a', userBId: 'user-b' },
        interviews: [],
      });

      const session = await service.getSession('session-id', 'user-a');

      expect(session.id).toBe('session-id');
    });
  });

  describe('getSessionStatus', () => {
    it('returns partner completion status', async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: 'session-id',
        status: 'in_progress',
        couple: { userAId: 'user-a', userBId: 'user-b' },
        interviews: [],
      });
      prisma.interview.findMany.mockResolvedValueOnce([
        { id: 'interview-a', userId: 'user-a', completedAt: new Date() },
      ]);

      const status = await service.getSessionStatus('session-id', 'user-a');

      expect(status.partnerStatus).toEqual({
        userAId: 'user-a',
        userBId: 'user-b',
        userAComplete: true,
        userBComplete: false,
      });
    });
  });

  describe('getAllSessions', () => {
    it('returns all sessions for couple with sanitized interviews', async () => {
      couplesService.getCoupleForUser.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
      });
      prisma.session.findMany.mockResolvedValueOnce([
        {
          id: 'session-1',
          coupleId: 'couple-id',
          status: 'resolved',
          interviews: [
            {
              id: 'interview-1',
              userId: 'user-a',
              sessionId: 'session-1',
              responses: [{ question: 'Q1', answer: 'A1' }],
              notes: 'private',
              completedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ]);

      const sessions = await service.getAllSessions('user-a');

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: { coupleId: 'couple-id' },
        include: { interviews: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].interviews[0]).toEqual(
        expect.objectContaining({
          id: 'interview-1',
          userId: 'user-a',
          sessionId: 'session-1',
        }),
      );
      expect(sessions[0].interviews[0]).not.toHaveProperty('responses');
      expect(sessions[0].interviews[0]).not.toHaveProperty('notes');
    });
  });

  describe('updateSessionStatus', () => {
    it('updates session status when valid', async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: 'session-id',
        status: 'unpacking_ready',
        couple: { userAId: 'user-a', userBId: 'user-b' },
        interviews: [],
      });
      prisma.session.update.mockResolvedValueOnce({
        id: 'session-id',
        status: 'reconnection',
        couple: { userAId: 'user-a', userBId: 'user-b' },
        interviews: [],
      });

      const result = await service.updateSessionStatus('session-id', 'user-a', 'reconnection');

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: { status: 'reconnection' },
        include: { couple: true, interviews: true },
      });
      expect(result.status).toBe('reconnection');
    });

    it('throws when status is invalid', async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: 'session-id',
        status: 'in_progress',
        couple: { userAId: 'user-a', userBId: 'user-b' },
        interviews: [],
      });

      await expect(
        service.updateSessionStatus('session-id', 'user-a', 'invalid_status'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws when trying to update resolved session', async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: 'session-id',
        status: 'resolved',
        couple: { userAId: 'user-a', userBId: 'user-b' },
        interviews: [],
      });

      await expect(
        service.updateSessionStatus('session-id', 'user-a', 'in_progress'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
