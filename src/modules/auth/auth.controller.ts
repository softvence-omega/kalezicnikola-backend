import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { AdminRegistrationDto } from './dto/auth-admin.dto';
import { DoctorRegistrationDto } from './dto/auth-doctor.dto';
import { UserLoginDto } from './dto/login.dto';
import { AuthService } from './auth.services';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ----------------- ADMIN REGISTER -------------------
  @Post('admin/register')
  async registerAdmin(@Body() dto: AdminRegistrationDto) {
    const result = await this.authService.registerAdmin(dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Admin registered successfully',
      data: result,
    };
  }

  // ----------------- DOCTOR REGISTER ------------------
  @Post('doctor/register')
  async registerDoctor(@Body() dto: DoctorRegistrationDto) {
    const result = await this.authService.registerDoctor(dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Doctor registered successfully',
      data: result,
    };
  }

  
}
