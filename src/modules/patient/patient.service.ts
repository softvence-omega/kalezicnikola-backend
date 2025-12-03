import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ----------------- ADD PATIENT -------------------
  async addPatient(accessToken: string, dto: CreatePatientDto) {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Get doctor's clinic ID
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { clinicId: true },
    });

    if (!doctor) {
      throw new UnauthorizedException('Doctor not found');
    }

    // Check if email is already in use by another patient (if email is provided)
    if (dto.email) {
      const emailExists = await this.prisma.patient.findFirst({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email is already in use by another patient');
      }
    }

    // Check if phone is already in use by another patient (if phone is provided)
    if (dto.phone) {
      const phoneExists = await this.prisma.patient.findFirst({
        where: { phone: dto.phone },
      });

      if (phoneExists) {
        throw new ConflictException('Phone number is already in use by another patient');
      }
    }

    // Create patient record
    const patient = await this.prisma.patient.create({
      data: {
        clinicId: doctor.clinicId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        alternativePhone: dto.alternativePhone,
        email: dto.email,
        insuranceId: dto.insuranceId,
        address: dto.address,
        dob: dto.dob ? new Date(dto.dob) : null,
        maritalStatus: dto.maritalStatus,
        city: dto.city,
        gender: dto.gender,
        photo: dto.photo,
        bloodGroup: dto.bloodGroup,
        conditionName: dto.conditionName,
        diagnosedDate: dto.diagnosedDate ? new Date(dto.diagnosedDate) : null,
        severity: dto.severity,
        status: dto.status,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactRelationship: dto.emergencyContactRelationship,
      },
      select: {
        id: true,
        clinicId: true,
        firstName: true,
        lastName: true,
        phone: true,
        alternativePhone: true,
        email: true,
        insuranceId: true,
        address: true,
        dob: true,
        maritalStatus: true,
        city: true,
        gender: true,
        photo: true,
        bloodGroup: true,
        conditionName: true,
        diagnosedDate: true,
        severity: true,
        status: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelationship: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      patient,
    };
  }
}
