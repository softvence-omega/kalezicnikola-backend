import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanType {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'The subscription plan type',
    enum: PlanType,
    example: PlanType.PROFESSIONAL,
  })
  @IsEnum(PlanType)
  @IsNotEmpty()
  planType: PlanType;

  @ApiProperty({
    description: 'Payment method ID from Stripe',
    example: 'pm_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
