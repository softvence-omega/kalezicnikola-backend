import { IsEmail, IsNotEmpty, IsString, Length, IsEnum } from 'class-validator';

export class Verify2faOtpDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    otp: string;
}
