import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class SlotQueryDto {
  @IsString()
  doctor_id: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  scheduleSlotId?: string; // Legacy

  @IsUUID()
  @IsOptional()
  appointment_type_id?: string;

  @IsString()
  @IsOptional()
  requested_slot?: string;
}
