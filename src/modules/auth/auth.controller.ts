import {
  Body,
  Controller,
  Post,
  Headers,
  UseGuards,
  Req,
  Get,
  HttpStatus,
} from '@nestjs/common';
import { UserRegistrationDto } from './dto/auth.dto';
import { AuthService } from './auth.services';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() userRegistrationDto: UserRegistrationDto) {
    try {
      const result = await this.authService.register(userRegistrationDto);

      return {
        statusCode: HttpStatus.CREATED,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      throw error;
    }
  }
}
