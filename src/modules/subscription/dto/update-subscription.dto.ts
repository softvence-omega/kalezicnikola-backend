import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanType {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export class UpdateSubscriptionDto {
  @ApiProperty({
    description: 'New plan type to switch to (BASIC, PROFESSIONAL, or ENTERPRISE)',
    enum: PlanType,
    example: PlanType.PROFESSIONAL,
    required: true,
  })
  @IsEnum(PlanType)
  @IsNotEmpty()
  newPlanType: PlanType;
}
