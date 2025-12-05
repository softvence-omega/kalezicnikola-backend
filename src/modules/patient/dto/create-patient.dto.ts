import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsDateString,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import {
  BloodGroup,
  Gender,
  MaritalStatus,
  PatientStatus,
} from 'generated/prisma';

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
  @Matches(/^INS-\d+$/, {
    message: 'Insurance ID must start with INS- followed by digits',
  })
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
  @IsEnum(BloodGroup, {
    message:
      'Blood group must be one of: A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG',
  })
  bloodGroup?: BloodGroup;

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
  @IsEnum(PatientStatus, {
    message: 'Patient status must be either ACTIVE, INACTIVE, or DISCHARGED',
  })
  status?: PatientStatus;

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
