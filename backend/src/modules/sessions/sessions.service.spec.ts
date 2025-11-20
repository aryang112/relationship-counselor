import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../../prisma.service';
import { CouplesService } from '../couples/couples.service';
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
      findMany: jest.Mock;
    };
  };
  let couplesService: { getCoupleForUser: jest.Mock };

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
        findMany: jest.fn(),
      },
    };

    couplesService = {
      getCoupleForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CouplesService, useValue: couplesService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  describe('startSession', () => {
    it('creates a session when couple is ready', async () => {
      couplesService.getCoupleForUser.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        agreementSignedAt: new Date(),
      });
      prisma.session.findFirst.mockResolvedValueOnce(null);
      prisma.session.create.mockResolvedValueOnce({
        id: 'session-id',
        coupleId: 'couple-id',
        status: 'initiated',
        initiatedBy: 'user-a',
        interviews: [],
      });

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
    });

    it('throws when partner not joined', async () => {
      couplesService.getCoupleForUser.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: null,
        agreementSignedAt: new Date(),
      });

      await expect(
        service.startSession('user-a', { topic: 't' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws when agreement not signed', async () => {
      couplesService.getCoupleForUser.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        agreementSignedAt: null,
      });

      await expect(
        service.startSession('user-a', { topic: 't' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws when active session exists', async () => {
      couplesService.getCoupleForUser.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        agreementSignedAt: new Date(),
      });
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
      prisma.interview.create.mockResolvedValueOnce({
        id: 'interview-a',
        userId: 'user-a',
      });
      prisma.interview.findMany.mockResolvedValueOnce([
        { id: 'interview-a', userId: 'user-a' },
      ]);
      prisma.session.update.mockResolvedValueOnce({
        ...baseSession,
        status: 'in_progress',
        interviews: [{ id: 'interview-a', userId: 'user-a' }],
      });

      const result = await service.submitInterview('session-id', 'user-a', {
        responses: { q1: 'answer' },
      });

      expect(prisma.interview.create).toHaveBeenCalled();
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-id' },
        data: { status: 'in_progress' },
        include: { couple: true, interviews: true },
      });
      expect(result.session.status).toBe('in_progress');
    });

    it('updates interview when it exists and marks session unpacking_ready when both complete', async () => {
      const inProgressSession = { ...baseSession, status: 'in_progress' };

      prisma.session.findUnique.mockResolvedValueOnce(inProgressSession);
      prisma.interview.findFirst.mockResolvedValueOnce({
        id: 'interview-b',
        userId: 'user-b',
      });
      prisma.interview.update.mockResolvedValueOnce({
        id: 'interview-b',
        userId: 'user-b',
      });
      prisma.interview.findMany.mockResolvedValueOnce([
        { id: 'interview-a', userId: 'user-a' },
        { id: 'interview-b', userId: 'user-b' },
      ]);
      prisma.session.update.mockResolvedValueOnce({
        ...baseSession,
        status: 'unpacking_ready',
        interviews: [
          { id: 'interview-a', userId: 'user-a' },
          { id: 'interview-b', userId: 'user-b' },
        ],
      });

      const result = await service.submitInterview('session-id', 'user-b', {
        responses: { q1: 'b answer' },
      });

      expect(prisma.interview.update).toHaveBeenCalled();
      expect(result.session.status).toBe('unpacking_ready');
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
        { id: 'interview-a', userId: 'user-a' },
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
    it('returns all sessions for couple', async () => {
      couplesService.getCoupleForUser.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
      });
      prisma.session.findMany.mockResolvedValueOnce([
        { id: 'session-1', coupleId: 'couple-id', status: 'resolved' },
        { id: 'session-2', coupleId: 'couple-id', status: 'in_progress' },
      ]);

      const sessions = await service.getAllSessions('user-a');

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: { coupleId: 'couple-id' },
        include: { interviews: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(sessions).toHaveLength(2);
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
