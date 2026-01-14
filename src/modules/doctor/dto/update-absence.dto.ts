import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateAbsenceDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
