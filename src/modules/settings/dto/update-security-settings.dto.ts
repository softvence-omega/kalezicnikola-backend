import { IsBoolean, IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateSecuritySettingsDto {
  @IsOptional()
  @IsBoolean()
  enforceTwoFA?: boolean;

  @IsOptional()
  @IsInt()
  sessionTimeoutMinutes?: number;

  @IsOptional()
  @IsInt()
  maxLoginAttempts?: number;

  @IsOptional()
  @IsBoolean()
  encryptSensitiveData?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAuditLogs?: boolean;
}
