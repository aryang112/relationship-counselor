import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;
}
