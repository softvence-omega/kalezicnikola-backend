import { IsOptional, IsString, IsArray } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

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
}
