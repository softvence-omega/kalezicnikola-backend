import { IsString, IsOptional, IsArray, IsInt, IsBoolean } from 'class-validator';

export class CreateKbDto {
  @IsString()
  @IsOptional()
  category?: string; // FAQ, POLICY, TREATMENT, PRICING, OFFICE_HOURS, INSURANCE, GENERAL

  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];

  @IsInt()
  @IsOptional()
  priority?: number;
}
