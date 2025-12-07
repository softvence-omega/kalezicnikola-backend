import { IsString, IsOptional, IsDateString } from 'class-validator';

export class SlotQueryDto {
  @IsString()
  doctor_id: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  scheduleSlotId?: string;

  @IsString()
  @IsOptional()
  requested_slot?: string;
}
