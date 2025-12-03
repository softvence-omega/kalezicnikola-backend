import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsDateString,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { Gender, MaritalStatus } from 'generated/prisma';

export class CreatePatientDto {
  // Personal Details
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  alternativePhone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  insuranceId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsEnum(MaritalStatus, {
    message: 'Marital status must be either MARRIED or UNMARRIED',
  })
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(Gender, {
    message: 'Gender must be either MALE, FEMALE, or OTHERS',
  })
  gender?: Gender;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  // Medical Information
  @IsOptional()
  @IsString()
  conditionName?: string;

  @IsOptional()
  @IsDateString()
  diagnosedDate?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // Emergency Contact
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Emergency contact phone must be a valid international format',
  })
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;
}
