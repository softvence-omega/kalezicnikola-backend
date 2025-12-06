import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GetSlotAvailabilityDto {
  @IsDateString()
  date: string; // The date to check availability for

  @IsOptional()
  @IsUUID()
  scheduleSlotId?: string; // Optional: check specific slot, otherwise check all slots
}
