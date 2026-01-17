import { IsString, IsNotEmpty } from 'class-validator';

export class CancelTrialPlanDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
