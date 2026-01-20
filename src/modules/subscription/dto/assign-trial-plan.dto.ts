import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class AssignTrialPlanDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsEnum(['LIFETIME', 'SEVEN_DAYS'])
  trialType?: 'LIFETIME' | 'SEVEN_DAYS';

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
