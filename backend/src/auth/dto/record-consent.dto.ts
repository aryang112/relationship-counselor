import { IsString, IsOptional, IsIn } from 'class-validator';

export class RecordConsentDto {
  @IsString()
  tosVersion: string;

  @IsString()
  privacyVersion: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsIn(['ios', 'android'])
  platform?: string;
}
