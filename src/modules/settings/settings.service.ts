import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationSettingsDto } from './dto/notification-settings.dto';
import { RegionalSettingsDto } from './dto/regional-settings.dto';
import { SecuritySettingsDto } from './dto/security-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ----------------- GET NOTIFICATION SETTINGS -------------------
  async getNotificationSettings(doctorId: string): Promise<NotificationSettingsDto> {
    const settings = await this.prisma.doctorNotificationSettings.findUnique({
      where: { doctorId },
    });

    if (!settings) {
      throw new NotFoundException('Notification settings not found for this doctor');
    }

    return settings;
  }

  // ----------------- GET REGIONAL SETTINGS -------------------
  async getRegionalSettings(doctorId: string): Promise<RegionalSettingsDto> {
    const settings = await this.prisma.doctorRegionalSettings.findUnique({
      where: { doctorId },
    });

    if (!settings) {
      throw new NotFoundException('Regional settings not found for this doctor');
    }

    return settings;
  }

  // ----------------- GET SECURITY SETTINGS -------------------
  async getSecuritySettings(doctorId: string): Promise<SecuritySettingsDto> {
    const settings = await this.prisma.doctorSecuritySettings.findUnique({
      where: { doctorId },
    });

    if (!settings) {
      throw new NotFoundException('Security settings not found for this doctor');
    }

    return settings;
  }
}
