import {
  Controller,
  Get,
  Patch,
  Body,
  HttpStatus,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { UpdateDoctorProfileDto } from './dto/update-profile.dto';

@Controller('doctor')
export class DoctorController {
  constructor(private doctorService: DoctorService) {}

  // ----------------- GET MY PROFILE -------------------
  @Get('my-profile')
  @UseGuards(DoctorGuard)
  async getMyProfile(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.getMyProfile(token);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: result,
    };
  }

  // ----------------- UPDATE MY PROFILE -------------------
  @Patch('update-my-profile')
  @UseGuards(DoctorGuard)
  async updateMyProfile(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.updateMyProfile(token, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: result,
    };
  }
}
