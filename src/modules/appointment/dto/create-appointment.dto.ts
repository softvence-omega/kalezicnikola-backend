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
  AppointmentType,
  BloodGroup,
  Gender,
} from 'generated/prisma';

export class CreateAppointmentDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsUUID()
  scheduleSlotId: string;

  @IsDateString()
  appointmentDate: string; // ISO date string, e.g., "2025-12-10"

  @IsString()
  insuranceId: string;

  @IsOptional()
  @IsString()
  appointmentDetails?: string;

  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

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
