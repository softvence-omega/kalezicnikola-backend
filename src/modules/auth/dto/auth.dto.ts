import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TLoginUserDto {

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
