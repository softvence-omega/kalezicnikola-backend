import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, JwtModule.register({}), ConfigModule, EmailModule],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
