import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SeedService } from './seed/seed.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, JwtModule, ConfigModule],
  controllers: [SettingsController],
  providers: [SettingsService, SeedService],
  exports: [SettingsService],
})
export class SettingsModule {}
