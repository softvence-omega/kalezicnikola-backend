import { IsString, IsNotEmpty } from 'class-validator';

export class AssignTrialPlanDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
