import { IsString, IsOptional, IsArray, IsInt, IsBoolean } from 'class-validator';

export class UpdateKbDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  answer?: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
