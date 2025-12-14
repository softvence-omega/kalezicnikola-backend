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
  adminId?: string;
}
