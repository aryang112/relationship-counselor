import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AcceptInviteDto {
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  inviteToken: string;
}
