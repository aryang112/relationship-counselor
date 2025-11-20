import { IsNotEmptyObject, IsOptional, IsString } from 'class-validator';

export class SubmitInterviewDto {
  @IsNotEmptyObject()
  responses: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}
