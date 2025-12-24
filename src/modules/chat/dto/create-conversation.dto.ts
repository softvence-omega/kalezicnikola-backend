import { IsString, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../../../../generated/prisma';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEnum(UserRole)
  @IsOptional()
  userRole?: UserRole;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  doctorId?: string; // Doctor ID - required for one-conversation-per-doctor model

  @IsString()
  @IsOptional()
  adminId?: string | null; // Deprecated - kept for backward compatibility
}
