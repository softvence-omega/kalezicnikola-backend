import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAbsenceDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
