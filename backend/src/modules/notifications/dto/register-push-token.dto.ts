/**
 * DTO for registering a push notification token.
 * Validates that the pushToken is a non-empty string.
 */
import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  pushToken: string;
}
