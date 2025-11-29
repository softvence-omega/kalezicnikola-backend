import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionCleanupService } from './session-cleanup.service';
import { EmailModule } from '../email/email.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionCleanupService],
  exports: [AuthService],
  imports: [ConfigModule, JwtModule.register({}), PrismaModule, ScheduleModule.forRoot(), EmailModule],
})
export class AuthModule {}
