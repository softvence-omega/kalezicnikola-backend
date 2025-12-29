import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  Matches,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { EventType, EventLocationType } from 'generated/prisma';

export class CreateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType;

  @IsDateString()
  @IsOptional()
  startDate?: string; // ISO date string (e.g., "2025-12-31")

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime?: string; // HH:mm format (e.g., "14:00")

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime?: string; // HH:mm format (e.g., "15:30")

  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @IsEnum(EventLocationType)
  @IsOptional()
  locationType?: EventLocationType;

  @IsString()
  @IsOptional()
  location?: string; // Physical address or general location

  @IsString()
  @IsOptional()
  @IsUrl()
  meetingLink?: string; // Google Meet, Zoom, or other meeting links

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  guestEmails?: string[]; // Array of guest email addresses

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentLinks?: string[]; // Array of URLs for attachments
}
