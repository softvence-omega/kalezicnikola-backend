import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  AppointmentDuration,
  BufferTime,
  CalendarView,
  DateFormat,
  Language,
  ReminderTime,
  TimeFormat,
  Timezone,
} from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Starting settings seeding process...');
    await this.seedDoctorSettings();
    this.logger.log('Settings seeding process completed');
  }

  private async seedDoctorSettings() {
    try {
      // Get all doctors
      const doctors = await this.prisma.doctor.findMany({
        select: { id: true, email: true },
      });

      if (doctors.length === 0) {
        this.logger.log('No doctors found in database. Skipping seeding.');
        return;
      }

      this.logger.log(
        `Found ${doctors.length} doctor(s). Checking settings...`,
      );

      let notificationCreated = 0;
      let notificationSkipped = 0;
      let regionalCreated = 0;
      let regionalSkipped = 0;
      let securityCreated = 0;
      let securitySkipped = 0;

      for (const doctor of doctors) {
        // Seed Notification Settings
        const existingNotification =
          await this.prisma.doctorNotificationSettings.findUnique({
            where: { doctorId: doctor.id },
          });

        if (!existingNotification) {
          await this.prisma.doctorNotificationSettings.create({
            data: {
              doctorId: doctor.id,
              appointmentReminders: true,
              patientUpdates: false,
              callLogs: true,
              taskDeadlines: false,
              securityAlerts: true,
              emailNotifications: true,
            },
          });
          notificationCreated++;
          this.logger.log(
            `Created notification settings for doctor: ${doctor.email}`,
          );
        } else {
          notificationSkipped++;
        }

        // Seed Regional Settings
        const existingRegional =
          await this.prisma.doctorRegionalSettings.findUnique({
            where: { doctorId: doctor.id },
          });

        if (!existingRegional) {
          await this.prisma.doctorRegionalSettings.create({
            data: {
              doctorId: doctor.id,
              timezone: Timezone.Asia_Dhaka,
              dateFormat: DateFormat.DD_MM_YYYY,
              timeFormat: TimeFormat.HOUR_24,
              language: Language.English,
              defaultCalendarView: CalendarView.DayView,
              defaultAppointmentDuration: AppointmentDuration.Minutes_20,
              allowOnlineBooking: true,
              requireApprovalForBooking: false,
              sendAppointmentReminders: false,
              reminderTime: ReminderTime.Minutes_30_Before,
              bufferTimeBetween: BufferTime.Minutes_10,
            },
          });
          regionalCreated++;
          this.logger.log(
            `Created regional settings for doctor: ${doctor.email}`,
          );
        } else {
          regionalSkipped++;
        }

        // Seed Security Settings
        const existingSecurity =
          await this.prisma.doctorSecuritySettings.findUnique({
            where: { doctorId: doctor.id },
          });

        if (!existingSecurity) {
          await this.prisma.doctorSecuritySettings.create({
            data: {
              doctorId: doctor.id,
              enforceTwoFA: true,
              sessionTimeoutMinutes: 30,
              maxLoginAttempts: 5,
              encryptSensitiveData: true,
              enableAuditLogs: true,
            },
          });
          securityCreated++;
          this.logger.log(
            `Created security settings for doctor: ${doctor.email}`,
          );
        } else {
          securitySkipped++;
        }
      }

      // Summary
      this.logger.log('=== Seeding Summary ===');
      this.logger.log(
        `Notification Settings - Created: ${notificationCreated}, Skipped: ${notificationSkipped}`,
      );
      this.logger.log(
        `Regional Settings - Created: ${regionalCreated}, Skipped: ${regionalSkipped}`,
      );
      this.logger.log(
        `Security Settings - Created: ${securityCreated}, Skipped: ${securitySkipped}`,
      );
    } catch (error) {
      this.logger.error('Error during settings seeding:', error);
      throw error;
    }
  }
}
