import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { GetAllPrescriptionsDto } from './dto/get-all-prescriptions.dto';

@Injectable()
export class PrescriptionService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ----------------- HELPER: GENERATE UNIQUE PRESCRIPTION NUMBER -------------------
  private async generateUniquePrescriptionNo(): Promise<string> {
    let prescriptionNo = '';
    let isUnique = false;

    while (!isUnique) {
      // Generate random digits (9-12 digits for good uniqueness)
      const randomDigits = Math.floor(
        100000000 + Math.random() * 900000000,
      ).toString();
      prescriptionNo = `PRS-${randomDigits}`;

      // Check if this prescription number already exists
      const existing = await this.prisma.prescription.findUnique({
        where: { prescriptionNo },
      });

      if (!existing) {
        isUnique = true;
      }
    }

    return prescriptionNo;
  }

  // ----------------- CREATE PRESCRIPTION -------------------
  async createPrescription(accessToken: string, dto: CreatePrescriptionDto) {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new UnauthorizedException('Doctor not found');
    }

    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    // Verify appointment exists
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });

    if (!appointment) {
      throw new BadRequestException('Appointment not found');
    }

    // Verify appointment belongs to this doctor and patient
    if (
      appointment.doctorId !== doctorId ||
      appointment.patientId !== dto.patientId
    ) {
      throw new BadRequestException(
        'Appointment does not belong to this doctor and patient',
      );
    }

    // Generate unique prescription number
    const prescriptionNo = await this.generateUniquePrescriptionNo();

    // Create prescription with items
    const prescription = await this.prisma.prescription.create({
      data: {
        patientId: dto.patientId,
        doctorId: doctorId,
        appointmentId: dto.appointmentId,
        prescriptionNo: prescriptionNo,
        status: dto.status,
        instructions: dto.instructions,
        additionalNotes: dto.additionalNotes,
        items: {
          create: dto.items.map((item) => ({
            medicineName: item.medicineName,
            medicineInstructions: item.medicineInstructions,
            morningDosage: item.morningDosage,
            afternoonDosage: item.afternoonDosage,
            nightDosage: item.nightDosage,
          })),
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
        items: true,
      },
    });

    return {
      prescription,
    };
  }

  // ----------------- GET ALL PRESCRIPTIONS -------------------
  async getAllPrescriptions(
    accessToken: string,
    query: GetAllPrescriptionsDto,
  ) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new UnauthorizedException('Doctor not found');
    }

    // Extract pagination parameters
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {
      doctorId: doctorId, // Only show prescriptions created by this doctor
      deletedAt: null, // Exclude soft-deleted prescriptions
    };

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    // Filter by patient
    if (query.patientId) {
      where.patientId = query.patientId;
    }

    // Search by medicine name
    if (query.search) {
      where.medicineName = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Get total count for pagination metadata
    const total = await this.prisma.prescription.count({ where });

    // Check if no prescriptions found
    if (total === 0) {
      const hasFilters = query.status || query.patientId || query.search;

      const message = hasFilters
        ? 'No prescriptions found matching your search criteria'
        : "No prescriptions found. You haven't created any prescriptions yet.";

      return {
        prescriptions: [],
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

    // Fetch prescriptions with pagination
    const prescriptions = await this.prisma.prescription.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
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
      prescriptions,
    };
  }

  // ----------------- GET SINGLE PRESCRIPTION -------------------
  async getSinglePrescription(accessToken: string, prescriptionId: string) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new UnauthorizedException('Doctor not found');
    }

    // Fetch prescription by ID
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Verify prescription belongs to this doctor
    if (prescription.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You are not authorized to view this prescription',
      );
    }

    // Check if soft deleted
    if (prescription.deletedAt) {
      throw new NotFoundException('Prescription has been deleted');
    }

    return {
      prescription,
    };
  }

  // ----------------- UPDATE PRESCRIPTION -------------------
  async updatePrescription(
    accessToken: string,
    prescriptionId: string,
    dto: UpdatePrescriptionDto,
  ) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new UnauthorizedException('Doctor not found');
    }

    // Fetch existing prescription
    const existingPrescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!existingPrescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Verify prescription belongs to this doctor
    if (existingPrescription.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You are not authorized to update this prescription',
      );
    }

    // Check if soft deleted
    if (existingPrescription.deletedAt) {
      throw new BadRequestException('Cannot update a deleted prescription');
    }

    // Verify patient exists if patientId is being updated
    if (dto.patientId && dto.patientId !== existingPrescription.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
      });

      if (!patient) {
        throw new BadRequestException('Patient not found');
      }
    }

    // Verify appointment exists if appointmentId is being updated
    if (
      dto.appointmentId &&
      dto.appointmentId !== existingPrescription.appointmentId
    ) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
      });

      if (!appointment) {
        throw new BadRequestException('Appointment not found');
      }

      // Verify appointment belongs to this doctor
      if (appointment.doctorId !== doctorId) {
        throw new BadRequestException(
          'Appointment does not belong to this doctor',
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (dto.patientId !== undefined) updateData.patientId = dto.patientId;
    if (dto.appointmentId !== undefined)
      updateData.appointmentId = dto.appointmentId;
    // prescriptionNo is auto-generated and cannot be updated
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.instructions !== undefined) updateData.instructions = dto.instructions;
    if (dto.additionalNotes !== undefined)
      updateData.additionalNotes = dto.additionalNotes;

    // Update prescription and replace items if provided
    const updatedPrescription = await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        ...updateData,
        items: dto.items
          ? {
              deleteMany: {}, // Delete all existing items
              create: dto.items.map((item) => ({
                medicineName: item.medicineName,
                medicineInstructions: item.medicineInstructions,
                morningDosage: item.morningDosage,
                afternoonDosage: item.afternoonDosage,
                nightDosage: item.nightDosage,
              })),
            }
          : undefined,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
        items: true,
      },
    });

    return {
      prescription: updatedPrescription,
    };
  }

  // ----------------- DELETE PRESCRIPTION -------------------
  async deletePrescription(accessToken: string, prescriptionId: string) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new UnauthorizedException('Doctor not found');
    }

    // Fetch prescription
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Verify prescription belongs to this doctor
    if (prescription.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You are not authorized to delete this prescription',
      );
    }

    // Check if already deleted
    if (prescription.deletedAt) {
      throw new BadRequestException('Prescription is already deleted');
    }

    // Soft delete the prescription
    await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Prescription deleted successfully',
    };
  }
}
