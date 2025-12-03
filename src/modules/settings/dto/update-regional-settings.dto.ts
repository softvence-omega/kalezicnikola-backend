import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import {
  Timezone,
  DateFormat,
  TimeFormat,
  Language,
  CalendarView,
  AppointmentDuration,
  ReminderTime,
  BufferTime,
} from 'generated/prisma';

export class UpdateRegionalSettingsDto {
  @IsOptional()
  @IsEnum(Timezone)
  timezone?: Timezone;

  @IsOptional()
  @IsEnum(DateFormat)
  dateFormat?: DateFormat;

  @IsOptional()
  @IsEnum(TimeFormat)
  timeFormat?: TimeFormat;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsEnum(CalendarView)
  defaultCalendarView?: CalendarView;

  @IsOptional()
  @IsEnum(AppointmentDuration)
  defaultAppointmentDuration?: AppointmentDuration;

  @IsOptional()
  @IsBoolean()
  allowOnlineBooking?: boolean;

  @IsOptional()
  @IsBoolean()
  requireApprovalForBooking?: boolean;

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
