import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a user, hashes password, and returns a token', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
      });

      const result = await service.register({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
        timezone: 'UTC',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          password: 'hashed-password',
          name: 'Test User',
          timezone: 'UTC',
        },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'user@example.com',
      });
      expect(result).toEqual({
        accessToken: 'signed-jwt',
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Test User',
        },
      });
    });

    it('throws when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        email: 'user@example.com',
      });

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'password123',
          name: 'Test User',
          timezone: 'UTC',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns token when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.login({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashed-password',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'user@example.com',
      });
      expect(result).toEqual({
        accessToken: 'signed-jwt',
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Test User',
        },
      });
    });

    it('throws when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when password is invalid', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('returns public user fields when user exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
      });

      const result = await service.validateUser('user-id');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(result).toEqual({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
      });
    });

    it('returns null when user is missing', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.validateUser('missing-id');

      expect(result).toBeNull();
    });
  });
});
