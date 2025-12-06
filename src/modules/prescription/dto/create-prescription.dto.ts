import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrescriptionStatus } from 'generated/prisma';
import { PrescriptionItemDto } from './prescription-item.dto';

export class CreatePrescriptionDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsNotEmpty()
  @IsString()
  appointmentId: string;

  @IsOptional()
  @IsEnum(PrescriptionStatus, {
    message: 'Status must be either ACTIVE or CANCELLED',
  })
  status?: PrescriptionStatus;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
