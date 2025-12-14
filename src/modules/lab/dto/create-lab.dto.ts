import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { LabResultDto } from './lab-result.dto';

export class CreateLabDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsNotEmpty()
  @IsInt()
  appointmentId: number;

  @IsOptional()
  @IsDateString()
  testDate?: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultDto)
  results: LabResultDto[];
}
