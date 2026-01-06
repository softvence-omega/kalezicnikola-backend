import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class GetDoctorSubscriptionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'Active', 'Inactive'])
  status?: string;
}
