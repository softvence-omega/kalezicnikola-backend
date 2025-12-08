import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class PrescriptionItemDto {
  @IsOptional()
  @IsString()
  medicineName?: string;

  @IsOptional()
  @IsString()
  medicineInstructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  morningDosage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  afternoonDosage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nightDosage?: number;
}
