import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Department, EmploymentType, StaffStatus, Gender } from 'generated/prisma';

export class GetAllStaffsDto extends PaginationDto {
  // Search across multiple fields
  @IsOptional()
  @IsString()
  search?: string;

  // Filter by department
  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  // Filter by position
  @IsOptional()
  @IsString()
  position?: string;

  // Filter by employment status
  @IsOptional()
  @IsEnum(StaffStatus)
  employmentStatus?: StaffStatus;

  // Filter by employment type
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  // Filter by gender
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  // Filter by join date range
  @IsOptional()
  @IsDateString()
  joinDateFrom?: string;

  @IsOptional()
  @IsDateString()
  joinDateTo?: string;
}
