import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class TranscriptionSaveDto {
  @IsString()
  doctor_id: string;

  @IsString()
  @IsOptional()
  patient_id?: string;

  @IsString()
  @IsOptional()
  call_sid?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  audio_url?: string;

  @IsString()
  @IsOptional()
  transcription?: string;

  @IsString()
  @IsOptional()
  intent?: string;

  @IsString()
  @IsOptional()
  sentiment?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  appointment_id?: string;

  @IsDateString()
  @IsOptional()
  call_started_at?: string;

  @IsDateString()
  @IsOptional()
  call_ended_at?: string;

  @IsString()
  @IsOptional()
  fallback_number?: string;

  @IsOptional()
  was_transferred?: boolean;
}
