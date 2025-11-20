import { IsIn, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsIn(['initiated', 'in_progress', 'unpacking_ready', 'reconnection', 'resolved', 'abandoned'])
  status: string;
}
