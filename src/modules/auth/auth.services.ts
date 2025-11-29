import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminRegistrationDto } from './dto/auth-admin.dto';
import { DoctorRegistrationDto } from './dto/auth-doctor.dto';
import { UserLoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ----------------- ADMIN REGISTER -------------------
  async registerAdmin(dto: AdminRegistrationDto) {
    const existing =
      await this.prisma.admin.findUnique({ where: { email: dto.email } }) ||
      await this.prisma.doctor.findUnique({ where: { email: dto.email } });

    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const admin = await this.prisma.admin.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
      },
    });

    return admin;
  }

  // ----------------- DOCTOR REGISTER ------------------
  async registerDoctor(dto: DoctorRegistrationDto) {
    const existing =
      await this.prisma.admin.findUnique({ where: { email: dto.email } }) ||
      await this.prisma.doctor.findUnique({ where: { email: dto.email } });

    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const doctor = await this.prisma.doctor.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        licenceNo: dto.licenceNo || null,
        specialities: [],
      },
    });

    return doctor;
  }


}
