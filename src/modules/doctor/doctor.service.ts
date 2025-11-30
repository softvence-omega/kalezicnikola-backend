import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UpdateDoctorProfileDto } from './dto/update-profile.dto';

@Injectable()
export class DoctorService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ----------------- GET MY PROFILE -------------------
  async getMyProfile(accessToken: string) {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    // Get complete doctor profile
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: session.doctorId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        licenceNo: true,
        specialities: true,
        experience: true,
        dob: true,
        photo: true,
        gender: true,
        address: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // Include clinic information if available
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new UnauthorizedException('Doctor profile not found');
    }

    return {
      profile: doctor,
    };
  }

  // ----------------- UPDATE MY PROFILE -------------------
  async updateMyProfile(accessToken: string, dto: UpdateDoctorProfileDto) {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Check if email is being updated and if it's already in use
    if (dto.email && dto.email !== session.doctor.email) {
      const emailExists = await this.prisma.doctor.findFirst({
        where: {
          email: dto.email,
          id: { not: doctorId },
        },
      });

      if (emailExists) {
        throw new BadRequestException('Email is already in use');
      }

      // Also check in admin table
      const adminEmailExists = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (adminEmailExists) {
        throw new BadRequestException('Email is already in use');
      }
    }

    // Check if phone is being updated and if it's already in use
    if (dto.phone && dto.phone !== session.doctor.phone) {
      const phoneExists = await this.prisma.doctor.findFirst({
        where: {
          phone: dto.phone,
          id: { not: doctorId },
        },
      });

      if (phoneExists) {
        throw new BadRequestException('Phone number is already in use');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.licenceNo !== undefined) updateData.licenceNo = dto.licenceNo;
    if (dto.specialities !== undefined) updateData.specialities = dto.specialities;
    if (dto.experience !== undefined) updateData.experience = dto.experience;
    if (dto.dob !== undefined) updateData.dob = new Date(dto.dob);
    if (dto.photo !== undefined) updateData.photo = dto.photo;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.address !== undefined) updateData.address = dto.address;

    // Update doctor profile
    const updatedDoctor = await this.prisma.doctor.update({
      where: { id: doctorId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        licenceNo: true,
        specialities: true,
        experience: true,
        dob: true,
        photo: true,
        gender: true,
        address: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return {
      profile: updatedDoctor,
    };
  }
}
