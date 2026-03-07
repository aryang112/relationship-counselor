import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveDraftInterviewDto {
  @IsNotEmpty()
  responses: any; // Partial or complete conversation history (JSON)

  @IsOptional()
  @IsString()
  notes?: string;
}
