import { Controller, Post, Body, HttpStatus, Headers, Get, UnauthorizedException } from '@nestjs/common';
import { AdminRegistrationDto } from './dto/auth-admin.dto';
import { DoctorRegistrationDto } from './dto/auth-doctor.dto';
import { UserLoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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

  // ----------------- ADMIN LOGIN -------------------
  @Post('admin/login')
  async loginAdmin(@Body() dto: UserLoginDto) {
    const result = await this.authService.loginAdmin(dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Admin logged in successfully',
      data: result,
    };
  }

  // ----------------- DOCTOR LOGIN -------------------
  @Post('doctor/login')
  async loginDoctor(@Body() dto: UserLoginDto) {
    const result = await this.authService.loginDoctor(dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor logged in successfully',
      data: result,
    };
  }

  // ----------------- LOGOUT -------------------
  @Post('logout')
  async logout(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.authService.logout(token);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  // ----------------- REFRESH TOKEN -------------------
  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto.refreshToken);

    return {
      statusCode: HttpStatus.OK,
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  // ----------------- VERIFY TOKEN -------------------
  @Get('verify')
  async verifyToken(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.authService.validateSession(token);

    return {
      statusCode: HttpStatus.OK,
      message: 'Token is valid',
      data: {
        user: result.user,
        role: result.role,
      },
    };
  }
}
