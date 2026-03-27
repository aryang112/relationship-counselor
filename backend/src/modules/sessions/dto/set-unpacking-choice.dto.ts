import { IsEnum } from 'class-validator';

export enum UnpackingChoice {
  WAIT = 'wait',
  VIEW = 'view',
}

export class SetUnpackingChoiceDto {
  @IsEnum(UnpackingChoice)
  choice: UnpackingChoice;
}
