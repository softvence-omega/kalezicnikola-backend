import { IsString, IsOptional, IsDateString, IsObject, IsInt, ValidateIf } from 'class-validator';

export class WebhookPayloadDto {
  @IsString()
  doctor_id: string;

  @IsString()
  @IsOptional()
  patient_id?: string;

  @IsString()
  intent: string; // "book_appointment", "check_availability", "reschedule", "cancel", "inquiry", "general"

  @IsString()
  @IsOptional()
  requested_time?: string;

  @IsString()
  @IsOptional()
  requested_date?: string;

  @IsString()
  @IsOptional()
  transcription?: string;

  @IsString()
  @IsOptional()
  query?: string;

  @IsString()
  @IsOptional()
  call_sid?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsObject()
  @IsOptional()
  patient_info?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    dob?: string;
    gender?: string;
    insuranceId?: string;
  };

  @IsString()
  @IsOptional()
  slot_id?: string;

  @IsString()
  @IsOptional()
  appointment_date?: string;

  @IsString()
  @IsOptional()
  booking_id?: string;

  @IsOptional()
  agent_busy?: boolean | string; // Accept both boolean and string from ElevenLabs
}
