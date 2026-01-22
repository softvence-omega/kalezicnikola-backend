import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Transform } from 'class-transformer';

export class GetUsersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'DOCTOR'])
  role?: 'ADMIN' | 'DOCTOR';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  emailVerified?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  twoFactorEnabled?: boolean;
}