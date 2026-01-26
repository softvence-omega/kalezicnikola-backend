import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import {
  CalendarView,
  AppointmentDuration,
  ReminderTime,
  BufferTime,
} from 'generated/prisma';

export class UpdateRegionalSettingsDto {
  @IsOptional()
  @IsEnum(CalendarView)
  defaultCalendarView?: CalendarView;

  @IsOptional()
  @IsEnum(AppointmentDuration)
  defaultAppointmentDuration?: AppointmentDuration;

  @IsOptional()
  @IsBoolean()
  sendAppointmentReminders?: boolean;

  @IsOptional()
  @IsEnum(ReminderTime)
  reminderTime?: ReminderTime;

  @IsOptional()
  @IsEnum(BufferTime)
  bufferTimeBetween?: BufferTime;
}
