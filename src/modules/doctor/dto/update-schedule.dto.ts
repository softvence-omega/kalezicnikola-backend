import {
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class SlotDto {
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (e.g., 09:00)',
  })
  startTime: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format (e.g., 17:00)',
  })
  endTime: string;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots?: SlotDto[];
}
