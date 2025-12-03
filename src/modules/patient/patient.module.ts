import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
