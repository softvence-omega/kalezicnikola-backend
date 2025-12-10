import { IsString, IsOptional, ValidateIf } from 'class-validator';

export class CancelBookingDto {
  @IsString()
  @IsOptional()
  booking_id?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsString()
  @IsOptional()
  appointment_date?: string;

  @ValidateIf((o) => !o.booking_id && !o.phone_number && !o.appointment_date)
  @IsString()
  _error?: string = 'At least one of booking_id, phone_number, or appointment_date must be provided';
}
