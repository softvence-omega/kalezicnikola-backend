import {
  Controller,
  Get,
  HttpStatus,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
    private prisma: PrismaService,
  ) {}

  // ----------------- GET NOTIFICATION SETTINGS -------------------
  @Get('doctor/notification')
  @UseGuards(DoctorGuard)
  async getNotificationSettings(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    // Get doctor ID from session
    const session = await this.prisma.session.findUnique({
      where: { accessToken: token },
    });

    if (!session || !session.doctorId) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const settings = await this.settingsService.getNotificationSettings(session.doctorId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Notification settings retrieved successfully',
      data: settings,
    };
  }

  // ----------------- GET REGIONAL SETTINGS -------------------
  @Get('doctor/regional')
  @UseGuards(DoctorGuard)
  async getRegionalSettings(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    // Get doctor ID from session
    const session = await this.prisma.session.findUnique({
      where: { accessToken: token },
    });

    if (!session || !session.doctorId) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const settings = await this.settingsService.getRegionalSettings(session.doctorId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Regional settings retrieved successfully',
      data: settings,
    };
  }

  // ----------------- GET SECURITY SETTINGS -------------------
  @Get('doctor/security')
  @UseGuards(DoctorGuard)
  async getSecuritySettings(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    // Get doctor ID from session
    const session = await this.prisma.session.findUnique({
      where: { accessToken: token },
    });

    if (!session || !session.doctorId) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const settings = await this.settingsService.getSecuritySettings(session.doctorId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Security settings retrieved successfully',
      data: settings,
    };
  }
}
