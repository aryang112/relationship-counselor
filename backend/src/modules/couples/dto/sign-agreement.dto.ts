import { IsBoolean } from 'class-validator';

export class SignAgreementDto {
  @IsBoolean()
  confirm: boolean;
}
