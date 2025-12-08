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
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PrescriptionModule } from './modules/prescription/prescription.module';
import { LabModule } from './modules/lab/lab.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { ChatModule } from './modules/chat/chat.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';


@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..'),
      serveRoot: '/',
    }),
    ConfigurationModule,
    PrismaModule,
    AuthModule,
    EmailModule,
    DoctorModule,
    SettingsModule,
    PatientModule,
    TaskModule,
    AppointmentModule,
    SubscriptionModule,
    PrescriptionModule,
    LabModule,
    AiAgentModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
