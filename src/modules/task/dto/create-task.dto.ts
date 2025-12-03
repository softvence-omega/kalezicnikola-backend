import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Priority, TaskStatus } from 'generated/prisma';

export class CreateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus, {
    message: 'Status must be TODO, IN_PROGRESS, or DONE',
  })
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority, {
    message: 'Priority must be LOW, MEDIUM, or HIGH',
  })
  priority?: Priority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;
}
