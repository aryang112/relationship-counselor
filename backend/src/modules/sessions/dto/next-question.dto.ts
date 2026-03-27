import { IsArray, ValidateNested, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class ConversationMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class NextQuestionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  conversationHistory: ConversationMessageDto[];
}
