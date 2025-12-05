import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AppointmentStatus } from 'generated/prisma';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  scheduleSlotId?: string;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

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
}
