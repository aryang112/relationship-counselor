import { IsOptional, IsString, IsObject } from 'class-validator';

export class SubmitOnboardingDto {
  @IsOptional()
  @IsString()
  datingStartDate?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
