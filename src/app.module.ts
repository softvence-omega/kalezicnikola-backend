import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PatientModule } from './modules/patient/patient.module';
import { TaskModule } from './modules/task/task.module';
import { AppointmentModule } from './modules/appointment/appointment.module';

@Module({
  imports: [
    ConfigurationModule,
    PrismaModule,
    AuthModule,
    EmailModule,
    DoctorModule,
    SettingsModule,
    PatientModule,
    TaskModule,
    AppointmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
