import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsEnum,
  IsEmail,
  Matches,
} from 'class-validator';
import {
  AppointmentStatus,
  BloodGroup,
  Gender,
} from 'generated/prisma';

export class CreateAppointmentDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  scheduleSlotId?: string;

  @IsUUID()
  appointmentTypeId: string;

  @IsDateString()
  appointmentDate: string; // ISO date string, e.g., "2025-12-10"

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (e.g., 08:00)',
  })
  startTime: string;

  @IsOptional()
  @IsString()
  insuranceId?: string;

  @IsOptional()
  @IsString()
  appointmentDetails?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  // Patient Info (Required if patient does not exist with insuranceId)
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;
}
