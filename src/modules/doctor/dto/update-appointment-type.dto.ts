import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class UpdateAppointmentTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number; // in minutes
}
