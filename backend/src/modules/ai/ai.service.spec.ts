import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeAll(() => {
    // Set dummy API key for tests
    process.env.OPENAI_API_KEY = 'sk-test-dummy-key-for-testing';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAudioFile', () => {
    it('should throw error if no file provided', () => {
      expect(() => {
        (service as any).validateAudioFile(null);
      }).toThrow(BadRequestException);
    });

    it('should throw error if file is too large', () => {
      const largeFile = {
        size: 26 * 1024 * 1024, // 26MB
        mimetype: 'audio/mpeg',
      } as Express.Multer.File;

      expect(() => {
        (service as any).validateAudioFile(largeFile);
      }).toThrow('too large');
    });

    it('should throw error for unsupported mime type', () => {
      const textFile = {
        size: 1024,
        mimetype: 'text/plain',
      } as Express.Multer.File;

      expect(() => {
        (service as any).validateAudioFile(textFile);
      }).toThrow('Unsupported audio format');
    });

    it('should accept MP3 files', () => {
      const mp3File = {
        size: 1024 * 1024, // 1MB
        mimetype: 'audio/mpeg',
      } as Express.Multer.File;

      expect(() => {
        (service as any).validateAudioFile(mp3File);
      }).not.toThrow();
    });

    it('should accept WAV files', () => {
      const wavFile = {
        size: 1024 * 1024,
        mimetype: 'audio/wav',
      } as Express.Multer.File;

      expect(() => {
        (service as any).validateAudioFile(wavFile);
      }).not.toThrow();
    });

    it('should accept M4A files', () => {
      const m4aFile = {
        size: 1024 * 1024,
        mimetype: 'audio/m4a',
      } as Express.Multer.File;

      expect(() => {
        (service as any).validateAudioFile(m4aFile);
      }).not.toThrow();
    });
  });

  describe('transcribeAudio', () => {
    it('should validate file before transcribing', async () => {
      const invalidFile = {
        size: 26 * 1024 * 1024,
        mimetype: 'audio/mpeg',
      } as Express.Multer.File;

      await expect(service.transcribeAudio(invalidFile)).rejects.toThrow(
        'too large',
      );
    });
  });
});
