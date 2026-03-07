import { INestApplication, InternalServerErrorException } from '@nestjs/common';
import * as request from 'supertest';
import {
  closePrismaConnections,
  createTestApp,
  registerUser,
} from './test-helpers';
import { resetTestDatabase } from './setup';
import { AiService } from '../src/modules/ai/ai.service';

describe('Transcription API (E2E)', () => {
  let app: INestApplication;
  let aiService: AiService;

  beforeAll(async () => {
    // Set dummy API key for tests
    process.env.OPENAI_API_KEY = 'sk-test-dummy-key-for-testing';

    app = await createTestApp();
    aiService = app.get<AiService>(AiService);
  });

  afterAll(async () => {
    await closePrismaConnections(app);
    await app.close();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('POST /api/transcribe', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/transcribe')
        .attach('audio', Buffer.from('fake audio'), 'test.mp3')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should transcribe audio file successfully', async () => {
      // Register and authenticate user
      const { token } = await registerUser(app, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      // Mock the transcription service
      const mockTranscription = 'This is a test transcription';
      jest
        .spyOn(aiService, 'transcribeAudio')
        .mockResolvedValueOnce(mockTranscription);

      // Create a small audio buffer (simulating an MP3 file)
      const audioBuffer = Buffer.from('fake audio data');

      const response = await request(app.getHttpServer())
        .post('/api/transcribe')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', audioBuffer, 'test.mp3')
        .expect(201);

      expect(response.body).toEqual({
        transcription: mockTranscription,
      });

      expect(aiService.transcribeAudio).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test.mp3',
        }),
      );
    });

    it('should return 400 if no audio file is provided', async () => {
      const { token } = await registerUser(app, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const response = await request(app.getHttpServer())
        .post('/api/transcribe')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toContain('audio');
    });

    it('should return 400 if file is too large', async () => {
      const { token } = await registerUser(app, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      // Create a buffer larger than 25MB
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB

      const response = await request(app.getHttpServer())
        .post('/api/transcribe')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', largeBuffer, 'large.mp3')
        .expect(413); // Payload Too Large

      // Multer will reject this before it reaches our validation
    });

    it('should return 400 for unsupported file format', async () => {
      const { token } = await registerUser(app, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      // Send a file with unsupported MIME type (text/plain)
      // Service validation will throw BadRequestException
      const textBuffer = Buffer.from('This is not an audio file');

      const response = await request(app.getHttpServer())
        .post('/api/transcribe')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', textBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      expect(response.body.message).toContain('Unsupported audio format');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const { token } = await registerUser(app, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      // Mock service-level OpenAI failure response
      jest
        .spyOn(aiService, 'transcribeAudio')
        .mockRejectedValueOnce(
          new InternalServerErrorException(
            'Failed to transcribe audio. Please try again.',
          ),
        );

      const audioBuffer = Buffer.from('fake audio data');

      const response = await request(app.getHttpServer())
        .post('/api/transcribe')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', audioBuffer, 'test.mp3')
        .expect(500);

      expect(response.body.message).toContain('Failed to transcribe');
    });
  });

  describe('Supported audio formats', () => {
    it('should accept MP3 files', async () => {
      const { token } = await registerUser(app, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      jest
        .spyOn(aiService, 'transcribeAudio')
        .mockResolvedValueOnce('Test transcription');

      await request(app.getHttpServer())
        .post('/api/transcribe')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', Buffer.from('fake'), {
          filename: 'test.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(201);
    });

    it('should accept WAV files', async () => {
      const { token } = await registerUser(app, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      jest
        .spyOn(aiService, 'transcribeAudio')
        .mockResolvedValueOnce('Test transcription');

      await request(app.getHttpServer())
        .post('/api/transcribe')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', Buffer.from('fake'), {
          filename: 'test.wav',
          contentType: 'audio/wav',
        })
        .expect(201);
    });

    it('should accept M4A files', async () => {
      const { token } = await registerUser(app, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      jest
        .spyOn(aiService, 'transcribeAudio')
        .mockResolvedValueOnce('Test transcription');

      await request(app.getHttpServer())
        .post('/api/transcribe')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', Buffer.from('fake'), {
          filename: 'test.m4a',
          contentType: 'audio/m4a',
        })
        .expect(201);
    });
  });
});
