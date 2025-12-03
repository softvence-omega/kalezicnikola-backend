import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationSettingsDto } from './dto/notification-settings.dto';
import { RegionalSettingsDto } from './dto/regional-settings.dto';
import { SecuritySettingsDto } from './dto/security-settings.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateRegionalSettingsDto } from './dto/update-regional-settings.dto';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto';

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

  // ----------------- UPDATE NOTIFICATION SETTINGS -------------------
  async updateNotificationSettings(
    doctorId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsDto> {
    // Check if settings exist
    const existingSettings = await this.prisma.doctorNotificationSettings.findUnique({
      where: { doctorId },
    });

    if (!existingSettings) {
      throw new NotFoundException('Notification settings not found for this doctor');
    }

    // Update settings
    const updatedSettings = await this.prisma.doctorNotificationSettings.update({
      where: { doctorId },
      data: dto,
    });

    return updatedSettings;
  }

  // ----------------- UPDATE REGIONAL SETTINGS -------------------
  async updateRegionalSettings(
    doctorId: string,
    dto: UpdateRegionalSettingsDto,
  ): Promise<RegionalSettingsDto> {
    // Check if settings exist
    const existingSettings = await this.prisma.doctorRegionalSettings.findUnique({
      where: { doctorId },
    });

    if (!existingSettings) {
      throw new NotFoundException('Regional settings not found for this doctor');
    }

    // Update settings
    const updatedSettings = await this.prisma.doctorRegionalSettings.update({
      where: { doctorId },
      data: dto,
    });

    return updatedSettings;
  }

  // ----------------- UPDATE SECURITY SETTINGS -------------------
  async updateSecuritySettings(
    doctorId: string,
    dto: UpdateSecuritySettingsDto,
  ): Promise<SecuritySettingsDto> {
    // Check if settings exist
    const existingSettings = await this.prisma.doctorSecuritySettings.findUnique({
      where: { doctorId },
    });

    if (!existingSettings) {
      throw new NotFoundException('Security settings not found for this doctor');
    }

    // Update settings
    const updatedSettings = await this.prisma.doctorSecuritySettings.update({
      where: { doctorId },
      data: dto,
    });

    return updatedSettings;
  }
}
