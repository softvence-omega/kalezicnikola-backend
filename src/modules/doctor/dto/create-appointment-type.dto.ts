import { IsString, IsInt, Min } from 'class-validator';

export class CreateAppointmentTypeDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  duration: number; // in minutes
}
