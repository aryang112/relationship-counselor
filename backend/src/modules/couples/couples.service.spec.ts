import { Test, TestingModule } from '@nestjs/testing';
import { CouplesService } from './couples.service';
import { PrismaService } from '../../prisma.service';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';

describe('CouplesService', () => {
  let service: CouplesService;
  let prisma: {
    couple: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('11111111-1111-1111-1111-111111111111');

    prisma = {
      couple: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouplesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CouplesService>(CouplesService);
  });

  describe('createInvite', () => {
    it('creates a new couple invite when user has no couple', async () => {
      prisma.couple.findFirst.mockResolvedValueOnce(null);
      prisma.couple.create.mockResolvedValueOnce({
        id: 'couple-id',
        inviteToken: '11111111-1111-1111-1111-111111111111',
      });

      const result = await service.createInvite('user-a');

      expect(prisma.couple.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userAId: 'user-a',
            inviteToken: '11111111-1111-1111-1111-111111111111',
          },
        }),
      );
      expect(result).toEqual({
        couple: {
          id: 'couple-id',
          inviteToken: '11111111-1111-1111-1111-111111111111',
        },
        wasReminder: false,
      });
    });

    it('returns existing invite when partner has not joined yet', async () => {
      const existingCouple = {
        id: 'couple-id',
        userAId: 'user-a',
        userBId: null,
        inviteToken: 'existing-token',
      };
      prisma.couple.findFirst.mockResolvedValueOnce(existingCouple);

      const result = await service.createInvite('user-a');

      expect(prisma.couple.create).not.toHaveBeenCalled();
      expect(result).toEqual({ couple: existingCouple, wasReminder: true });
    });

    it('throws when user already in couple', async () => {
      prisma.couple.findFirst.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'another-user',
        userBId: 'user-a',
      });

      await expect(service.createInvite('user-a')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.couple.create).not.toHaveBeenCalled();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('acceptInvite', () => {
    it('updates couple when invite is valid', async () => {
      prisma.couple.findUnique.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: null,
      });
      prisma.couple.findFirst.mockResolvedValueOnce(null);
      prisma.couple.update.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
      });

      const result = await service.acceptInvite('user-b', 'invite-token');

      expect(prisma.couple.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'couple-id' },
          data: { userBId: 'user-b', inviteToken: null },
        }),
      );
      expect(result.userBId).toBe('user-b');
    });

    it('throws when invite not found', async () => {
      prisma.couple.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.acceptInvite('user-b', 'missing-token'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when user already paired elsewhere', async () => {
      prisma.couple.findUnique.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: null,
      });
      prisma.couple.findFirst.mockResolvedValueOnce({
        id: 'other-couple',
        userAId: 'user-b',
      });

      await expect(
        service.acceptInvite('user-b', 'invite-token'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.couple.update).not.toHaveBeenCalled();
    });
  });

  describe('getCoupleForUser', () => {
    it('returns couple when found', async () => {
      prisma.couple.findFirst.mockResolvedValueOnce({
        id: 'couple-id',
      });

      const couple = await service.getCoupleForUser('user-a');
      expect(couple.id).toBe('couple-id');
    });

    it('throws when couple missing', async () => {
      prisma.couple.findFirst.mockResolvedValueOnce(null);

      await expect(service.getCoupleForUser('user-a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('signAgreement', () => {
    it('updates userASignedAt when user A signs', async () => {
      prisma.couple.findFirst.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: null,
        userBSignedAt: null,
      });
      prisma.couple.update.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: new Date(),
        userBSignedAt: null,
      });

      await service.signAgreement('user-a');

      expect(prisma.couple.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'couple-id' },
          data: { userASignedAt: expect.any(Date) },
        }),
      );
    });

    it('updates userBSignedAt when user B signs', async () => {
      prisma.couple.findFirst.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: null,
        userBSignedAt: null,
      });
      prisma.couple.update.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: null,
        userBSignedAt: new Date(),
      });

      await service.signAgreement('user-b');

      expect(prisma.couple.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'couple-id' },
          data: { userBSignedAt: expect.any(Date) },
        }),
      );
    });

    it('returns existing couple if user already signed', async () => {
      const alreadySignedCouple = {
        id: 'couple-id',
        userAId: 'user-a',
        userBId: 'user-b',
        userASignedAt: new Date(),
        userBSignedAt: null,
      };
      prisma.couple.findFirst.mockResolvedValueOnce(alreadySignedCouple);

      const result = await service.signAgreement('user-a');

      expect(prisma.couple.update).not.toHaveBeenCalled();
      expect(result).toEqual(alreadySignedCouple);
    });

    it('throws when partner not joined yet', async () => {
      prisma.couple.findFirst.mockResolvedValueOnce({
        id: 'couple-id',
        userAId: 'user-a',
        userBId: null,
      });

      await expect(service.signAgreement('user-a')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('bothPartnersSignedAgreement', () => {
    it('returns true when both partners have signed', () => {
      const couple = {
        userASignedAt: new Date(),
        userBSignedAt: new Date(),
      };

      expect(service.bothPartnersSignedAgreement(couple)).toBe(true);
    });

    it('returns false when only user A signed', () => {
      const couple = {
        userASignedAt: new Date(),
        userBSignedAt: null,
      };

      expect(service.bothPartnersSignedAgreement(couple)).toBe(false);
    });

    it('returns false when only user B signed', () => {
      const couple = {
        userASignedAt: null,
        userBSignedAt: new Date(),
      };

      expect(service.bothPartnersSignedAgreement(couple)).toBe(false);
    });

    it('returns false when neither has signed', () => {
      const couple = {
        userASignedAt: null,
        userBSignedAt: null,
      };

      expect(service.bothPartnersSignedAgreement(couple)).toBe(false);
    });
  });
});
