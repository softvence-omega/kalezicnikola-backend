import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { Department, EmploymentType, Gender, MaritalStatus, StaffStatus } from 'generated/prisma';

export class UpdateStaffDto {
  // Employment ID (Optional - can be updated if provided)
  @IsOptional()
  @IsString()
  @Matches(/^STF-\d+$/, {
    message: 'Employment ID must start with STF- followed by digits',
  })
  employmentId?: string;

  // Personal Details
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  gender?: Gender;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  presentAddress?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  nationalIdNumber?: string;

  // Employment Details
  @IsOptional()
  department?: Department;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  workSchedule?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  weeklyHours?: number;

  @IsOptional()
  employmentStatus?: StaffStatus;
}
