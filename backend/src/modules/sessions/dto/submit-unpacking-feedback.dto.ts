import {
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export enum UnpackingFeedbackReason {
  MISSED_CORE_ISSUE = 'missed_core_issue',
  INACCURATE_PARTNER_PERSPECTIVE = 'inaccurate_partner_perspective',
  TOO_GENERIC = 'too_generic',
  OTHER = 'other',
}

export class SubmitUnpackingFeedbackDto {
  @IsEnum(UnpackingFeedbackReason)
  feedbackReason: UnpackingFeedbackReason;

  @ValidateIf((dto: SubmitUnpackingFeedbackDto) => dto.feedbackReason === UnpackingFeedbackReason.OTHER)
  @IsNotEmpty()
  @IsString()
  feedbackText?: string; // Required when feedbackReason is 'other'
}
