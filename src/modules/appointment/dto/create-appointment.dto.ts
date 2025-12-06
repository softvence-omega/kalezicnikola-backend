import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AppointmentStatus, AppointmentType } from 'generated/prisma';

export class CreateAppointmentDto {
  @IsUUID()
  patientId: string;

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
}
