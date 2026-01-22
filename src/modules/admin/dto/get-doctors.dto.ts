import { IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Transform } from 'class-transformer';

export class GetDoctorsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  speciality?: string[];

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  last7Days?: boolean;
}
