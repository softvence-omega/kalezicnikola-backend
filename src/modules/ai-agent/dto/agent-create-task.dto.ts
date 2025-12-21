import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AgentCreateTaskDto {
  @IsUUID()
  doctor_id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string; // This will hold the AI summary of the request

  @IsOptional()
  @IsString()
  phone_number?: string; // To link the task to a patient

  @IsOptional()
  @IsString()
  insurance_id?: string; // To identify patient's insurance

  @IsString()
  priority: string; // e.g., 'LOW', 'NORMAL', 'HIGH'

  @IsString()
  time: string; // e.g., '10:00 AM'

  @IsString()
  due_date: string; // e.g., '2025-12-21'
}
