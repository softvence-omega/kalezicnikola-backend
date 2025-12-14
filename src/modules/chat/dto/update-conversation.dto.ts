import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ConversationStatus } from '../../../../generated/prisma';

export class UpdateConversationDto {
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsString()
  @IsOptional()
  adminId?: string;
}
