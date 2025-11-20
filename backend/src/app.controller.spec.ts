import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe('healthCheck', () => {
    it('returns service status payload', () => {
      const response = appController.healthCheck();

      expect(response.status).toBe('ok');
      expect(response.service).toBe('relation-counselor-backend');
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('getProfile', () => {
    it('returns profile data when user is present on the request', () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
      };

      const response = appController.getProfile({ user: mockUser });

      expect(response).toEqual({
        message: 'This is a protected route',
        user: mockUser,
      });
    });
  });
});
