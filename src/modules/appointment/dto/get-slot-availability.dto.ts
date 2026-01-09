import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GetSlotAvailabilityDto {
  @IsDateString()
  date: string; // The date to check availability for

  @IsOptional()
  @IsUUID()
  appointmentTypeId?: string; // Optional: check availability for a specific type
}
