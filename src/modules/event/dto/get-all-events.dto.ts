import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from 'generated/prisma';

export class GetAllEventsDto {
  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType;

  @IsDateString()
  @IsOptional()
  startDate?: string; // Filter events from this date

  @IsDateString()
  @IsOptional()
  endDate?: string; // Filter events until this date

  @IsString()
  @IsOptional()
  search?: string; // Search in title, description, location

  @IsEnum(['startDate', 'title', 'createdAt'])
  @IsOptional()
  sortBy?: string; // Field to sort by

  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC'; // Sort direction

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number; // Page number for pagination

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number; // Items per page
}
