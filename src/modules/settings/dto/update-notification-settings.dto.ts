import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  appointmentReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  patientUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  callLogs?: boolean;

  @IsOptional()
  @IsBoolean()
  taskDeadlines?: boolean;

  @IsOptional()
  @IsBoolean()
  securityAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
