import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit (OpenAI Whisper limit)
      },
    }),
  )
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ transcription: string }> {
    const transcription = await this.aiService.transcribeAudio(file);
    return { transcription };
  }
}
