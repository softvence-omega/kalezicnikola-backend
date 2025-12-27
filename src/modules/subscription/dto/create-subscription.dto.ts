import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanType {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'The subscription plan type',
    enum: PlanType,
    example: PlanType.STANDARD,
  })
  @IsEnum(PlanType)
  @IsNotEmpty()
  planType: PlanType;

  @ApiProperty({
    description: 'The billing cycle',
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
  })
  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billingCycle: BillingCycle;

  @ApiProperty({
    description: 'Payment method ID from Stripe',
    example: 'pm_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
