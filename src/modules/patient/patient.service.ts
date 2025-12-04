import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { deleteFileFromUploads } from 'src/utils/file-delete.util';

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

  // ----------------- GET ALL PATIENTS -------------------
  async getAllPatients(accessToken: string, query: any) {
    // Find session to verify doctor authentication
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

    // Extract pagination parameters
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Build where clause for filtering
    const where: any = { clinicId: doctor.clinicId };

    // Search functionality - searches across multiple fields
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filter by gender
    if (query.gender) {
      where.gender = query.gender;
    }

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    // Filter by blood group
    if (query.bloodGroup) {
      where.bloodGroup = query.bloodGroup;
    }

    // Filter by severity
    if (query.severity) {
      where.severity = { contains: query.severity, mode: 'insensitive' };
    }

    // Filter by city
    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    // Get total count for pagination metadata
    const total = await this.prisma.patient.count({ where });

    // Check if no patients found and return with message
    if (total === 0) {
      const hasFilters = query.search || query.gender || query.status || 
                         query.bloodGroup || query.severity || query.city;

      const message = hasFilters 
        ? 'No patients found matching your search criteria'
        : 'No patients found. You haven\'t added any patients yet.';

      return {
        patients: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          previous: null,
          next: null,
        },
        message,
      };
    }

    // Fetch patients with pagination and sorting
    const patients = await this.prisma.patient.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        gender: true,
        status: true,
        bloodGroup: true,
        city: true,
        photo: true,
        createdAt: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        previous: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
      },
      patients,
    };
  }

  // ----------------- GET SINGLE PATIENT -------------------
  async getSinglePatient(accessToken: string, patientId: string) {
    // Find session to verify doctor authentication
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

    // Fetch patient by ID
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    // Verify patient belongs to doctor's clinic
    if (patient.clinicId !== doctor.clinicId) {
      throw new UnauthorizedException('You do not have permission to access this patient');
    }

    return {
      patient,
    };
  }

  // ----------------- UPDATE PATIENT -------------------
  async updatePatient(accessToken: string, patientId: string, dto: UpdatePatientDto) {
    // Find session to verify doctor authentication
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

    // Fetch patient by ID and verify it belongs to doctor's clinic
    const existingPatient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!existingPatient) {
      throw new BadRequestException('Patient not found');
    }

    if (existingPatient.clinicId !== doctor.clinicId) {
      throw new UnauthorizedException('You do not have permission to update this patient');
    }

    // Check if email is being updated and if it's already in use
    if (dto.email && dto.email !== existingPatient.email) {
      const emailExists = await this.prisma.patient.findFirst({
        where: {
          email: dto.email,
          id: { not: patientId },
        },
      });

      if (emailExists) {
        throw new ConflictException('Email is already in use by another patient');
      }
    }

    // Check if phone is being updated and if it's already in use
    if (dto.phone && dto.phone !== existingPatient.phone) {
      const phoneExists = await this.prisma.patient.findFirst({
        where: {
          phone: dto.phone,
          id: { not: patientId },
        },
      });

      if (phoneExists) {
        throw new ConflictException('Phone number is already in use by another patient');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.alternativePhone !== undefined) updateData.alternativePhone = dto.alternativePhone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.insuranceId !== undefined) updateData.insuranceId = dto.insuranceId;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.dob !== undefined) updateData.dob = new Date(dto.dob);
    if (dto.maritalStatus !== undefined) updateData.maritalStatus = dto.maritalStatus;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.bloodGroup !== undefined) updateData.bloodGroup = dto.bloodGroup;
    if (dto.conditionName !== undefined) updateData.conditionName = dto.conditionName;
    if (dto.diagnosedDate !== undefined) updateData.diagnosedDate = new Date(dto.diagnosedDate);
    if (dto.severity !== undefined) updateData.severity = dto.severity;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.emergencyContactName !== undefined) updateData.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = dto.emergencyContactRelationship;

    // Handle photo update - delete old photo if new one is uploaded
    if (dto.photo !== undefined) {
      updateData.photo = dto.photo;
      
      // Delete old photo if it exists and a new one is being set
      if (existingPatient.photo && dto.photo && existingPatient.photo !== dto.photo) {
        await deleteFileFromUploads(existingPatient.photo);
      }
    }

    // Update patient record
    const updatedPatient = await this.prisma.patient.update({
      where: { id: patientId },
      data: updateData,
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
      patient: updatedPatient,
    };
  }

  // ----------------- DELETE PATIENT -------------------
  async deletePatient(accessToken: string, patientId: string) {
    // Find session to verify doctor authentication
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

    // Fetch patient by ID and verify it belongs to doctor's clinic
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    if (patient.clinicId !== doctor.clinicId) {
      throw new UnauthorizedException('You do not have permission to delete this patient');
    }

    // Delete the patient
    await this.prisma.patient.delete({
      where: { id: patientId },
    });

    // Delete the patient photo if it exists
    if (patient.photo) {
      await deleteFileFromUploads(patient.photo);
    }

    return {
      message: 'Patient deleted successfully',
    };
  }
}
