import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitInterviewDto {
  @IsNotEmpty()
  responses: any; // Can be array of Q&A objects or any JSON structure

  @IsOptional()
  @IsString()
  notes?: string;
}
