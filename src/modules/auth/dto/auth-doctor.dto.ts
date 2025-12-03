import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class DoctorRegistrationDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  licenceNo?: string;
}
