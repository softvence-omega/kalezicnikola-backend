import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Flag } from 'generated/prisma';


export class LabResultDto {
  @IsNotEmpty()
  @IsString()
  testName: string;

  @IsNotEmpty()
  @IsString()
  result: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  normalMin?: number;

  @IsOptional()
  @IsNumber()
  normalMax?: number;

  @IsOptional()
  @IsEnum(Flag)
  flag?: Flag;
}
