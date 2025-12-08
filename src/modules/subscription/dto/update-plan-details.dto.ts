import { IsString, IsNumber, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanTypeEnum {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export class UpdatePlanDetailsDto {
//   @ApiProperty({
//     description: 'Plan type to update',
//     enum: PlanTypeEnum,
//     example: PlanTypeEnum.PROFESSIONAL,
//   })
//   @IsEnum(PlanTypeEnum)
//   planType: PlanTypeEnum;

  @ApiProperty({
    description: 'Plan display name',
    example: 'Professional Plan',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Plan price in euros',
    example: 899,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Stripe price ID',
    example: 'price_1SbCv9D60jTqpzFUYuH2aykt',
    required: false,
  })
  @IsString()
  @IsOptional()
  priceId?: string;

  @ApiProperty({
    description: 'Minutes allocated for this plan',
    example: 1000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  minutes?: number;

  @ApiProperty({
    description: 'List of plan features',
    example: ['Feature 1', 'Feature 2', 'Feature 3'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];
}
