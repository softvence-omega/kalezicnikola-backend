import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
  IsBoolean,
} from 'class-validator';

export class ElevenLabsPostCallDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  event_timestamp?: number;

  @IsString()
  @IsOptional()
  agent_id?: string;

  @IsString()
  @IsOptional()
  conversation_id?: string;

  @IsString()
  @IsOptional()
  status?: string; // "completed"

  @IsObject()
  @IsOptional()
  transcript?: {
    role: string;
    message: string;
    time_in_call_secs: number;
  }[];

  @IsArray()
  @IsOptional()
  transcript_summary?: string;

  @IsObject()
  @IsOptional()
  analysis?: {
    evaluation_criteria_results?: any;
    transcript_summary?: string;
    data_collection_results?: any;
    call_successful?: boolean;
  };

  @IsString()
  @IsOptional()
  recording_url?: string;

  @IsNumber()
  @IsOptional()
  duration_seconds?: number;

  @IsObject()
  @IsOptional()
  metadata?: {
    duration_seconds?: number;
    [key: string]: any;
  };

  // SIP metadata from ElevenLabs (contains caller phone number)
  @IsObject()
  @IsOptional()
  sip_metadata?: {
    from_number?: string;
    to_number?: string;
    [key: string]: any;
  };

  // Catch-all for wrapped data
  @IsObject()
  @IsOptional()
  data?: any;

  @IsString()
  @IsOptional()
  doctor_id?: string;
}
