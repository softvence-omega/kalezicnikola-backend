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



export class CreateStaffDto {
  // Employment ID (Optional - will be auto-generated if not provided)
  @IsOptional()
  @IsString()
  @Matches(/^STF-\d+$/, {
    message: 'Employment ID must start with STF- followed by digits',
  })
  employmentId?: string;

  // Personal Details
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsDateString()
  dob: string;

  @IsNotEmpty()
  gender: Gender;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone: string;

  @IsNotEmpty()
  @IsString()
  presentAddress: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  maritalStatus?: MaritalStatus;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @IsNotEmpty()
  @IsString()
  country: string;

  @IsNotEmpty()
  @IsString()
  nationality: string;

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
