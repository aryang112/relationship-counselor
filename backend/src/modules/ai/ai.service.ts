import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import OpenAI, { toFile } from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not set - transcription will fail in runtime',
      );
    }
    this.openai = new OpenAI({ apiKey });
  }

  async transcribeAudio(file: Express.Multer.File): Promise<string> {
    // Validate file
    this.validateAudioFile(file);

    try {
      // Use toFile to properly wrap buffer with filename for format detection
      // Whisper API uses the file extension to determine audio format
      const audioFile = await toFile(file.buffer, file.originalname, {
        type: file.mimetype,
      });

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
      });

      return transcription.text;
    } catch (error) {
      this.logger.error('Transcription failed', error.stack);

      if (error.response?.status === 413) {
        throw new BadRequestException('Audio file is too large (max 25MB)');
      }

      if (error.response?.status === 400) {
        throw new BadRequestException('Invalid audio file format');
      }

      throw new InternalServerErrorException(
        'Failed to transcribe audio. Please try again.',
      );
    }
  }

  private validateAudioFile(file: Express.Multer.File): void {
    // Check if file exists
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }

    // Check file size (25MB limit from OpenAI)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (file.size > maxSize) {
      throw new BadRequestException(
        'Audio file is too large. Maximum size is 25MB.',
      );
    }

    // Check file type - OpenAI supports many audio formats
    const supportedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/m4a',
      'audio/wav',
      'audio/wave',
      'audio/webm',
      'audio/ogg',
      'audio/flac',
      'audio/x-m4a',
      'audio/x-wav',
    ];

    if (!supportedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported audio format: ${file.mimetype}. Supported formats: MP3, MP4, M4A, WAV, WEBM, OGG, FLAC`,
      );
    }
  }
}
