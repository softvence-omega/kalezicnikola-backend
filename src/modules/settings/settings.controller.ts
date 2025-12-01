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
import { SettingsService } from './settings.service';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateRegionalSettingsDto } from './dto/update-regional-settings.dto';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto';

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

  // ----------------- UPDATE NOTIFICATION SETTINGS -------------------
  @Patch('doctor/notification-update')
  @UseGuards(DoctorGuard)
  async updateNotificationSettings(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
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

    const settings = await this.settingsService.updateNotificationSettings(
      session.doctorId,
      dto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Notification settings updated successfully',
      data: settings,
    };
  }

  // ----------------- UPDATE REGIONAL SETTINGS -------------------
  @Patch('doctor/regional-update')
  @UseGuards(DoctorGuard)
  async updateRegionalSettings(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdateRegionalSettingsDto,
  ) {
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

    const settings = await this.settingsService.updateRegionalSettings(
      session.doctorId,
      dto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Regional settings updated successfully',
      data: settings,
    };
  }

  // ----------------- UPDATE SECURITY SETTINGS -------------------
  @Patch('doctor/security-update')
  @UseGuards(DoctorGuard)
  async updateSecuritySettings(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdateSecuritySettingsDto,
  ) {
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

    const settings = await this.settingsService.updateSecuritySettings(
      session.doctorId,
      dto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Security settings updated successfully',
      data: settings,
    };
  }
}
