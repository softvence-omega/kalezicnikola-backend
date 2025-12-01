import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Gender } from 'generated/prisma';


export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  licenceNo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialities?: string[];

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  gender?: Gender;

  @IsOptional()
  @IsString()
  address?: string;
}
