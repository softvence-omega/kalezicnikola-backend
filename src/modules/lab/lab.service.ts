import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { GetAllLabsDto } from './dto/get-all-labs.dto';

@Injectable()
export class LabService {
  constructor(private prisma: PrismaService) {}

  // ----------------- CREATE LAB -------------------
  async createLab(accessToken: string, dto: CreateLabDto) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

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

    // Create lab with results
    const lab = await this.prisma.lab.create({
      data: {
        patientId: dto.patientId,
        doctorId: doctorId,
        appointmentId: dto.appointmentId,
        testDate: dto.testDate ? new Date(dto.testDate) : new Date(),
        additionalNotes: dto.additionalNotes,
        results: {
          create: dto.results.map((result) => ({
            testName: result.testName,
            result: result.result,
            unit: result.unit,
            normalMin: result.normalMin,
            normalMax: result.normalMax,
            flag: result.flag,
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
        results: true,
      },
    });

    return {
      lab,
    };
  }

  // ----------------- GET ALL LABS -------------------
  async getAllLabs(accessToken: string, query: GetAllLabsDto) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Extract pagination parameters
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {
      doctorId: doctorId, // Only show labs created by this doctor
      deletedAt: null, // Exclude soft-deleted labs
    };

    // Filter by patient
    if (query.patientId) {
      where.patientId = query.patientId;
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.testDate = {};
      if (query.startDate) {
        where.testDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.testDate.lte = new Date(query.endDate);
      }
    }

    // Get total count for pagination metadata
    const total = await this.prisma.lab.count({ where });

    // Check if no labs found
    if (total === 0) {
      const hasFilters = query.patientId || query.startDate || query.endDate;

      const message = hasFilters
        ? 'No labs found matching your search criteria'
        : "No labs found. You haven't created any labs yet.";

      return {
        labs: [],
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

    // Fetch labs with pagination
    const labs = await this.prisma.lab.findMany({
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
        results: true,
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
      labs,
    };
  }

  // ----------------- GET SINGLE LAB -------------------
  async getSingleLab(accessToken: string, labId: string) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Fetch lab by ID
    const lab = await this.prisma.lab.findUnique({
      where: { id: labId },
      include: {
        results: true,
      },
    });

    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    // Verify lab belongs to this doctor
    if (lab.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You are not authorized to view this lab',
      );
    }

    // Check if soft deleted
    if (lab.deletedAt) {
      throw new NotFoundException('Lab has been deleted');
    }

    return {
      lab,
    };
  }

  // ----------------- UPDATE LAB -------------------
  async updateLab(
    accessToken: string,
    labId: string,
    dto: UpdateLabDto,
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

    // Fetch existing lab
    const existingLab = await this.prisma.lab.findUnique({
      where: { id: labId },
    });

    if (!existingLab) {
      throw new NotFoundException('Lab not found');
    }

    // Verify lab belongs to this doctor
    if (existingLab.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You are not authorized to update this lab',
      );
    }

    // Check if soft deleted
    if (existingLab.deletedAt) {
      throw new BadRequestException('Cannot update a deleted lab');
    }

    // Verify patient exists if patientId is being updated
    if (dto.patientId && dto.patientId !== existingLab.patientId) {
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
      dto.appointmentId !== existingLab.appointmentId
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
    if (dto.testDate !== undefined)
      updateData.testDate = new Date(dto.testDate);
    if (dto.additionalNotes !== undefined)
      updateData.additionalNotes = dto.additionalNotes;

    // Update lab and replace results if provided
    const updatedLab = await this.prisma.lab.update({
      where: { id: labId },
      data: {
        ...updateData,
        results: dto.results
          ? {
              deleteMany: {}, // Delete all existing results
              create: dto.results.map((result) => ({
                testName: result.testName,
                result: result.result,
                unit: result.unit,
                normalMin: result.normalMin,
                normalMax: result.normalMax,
                flag: result.flag,
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
        results: true,
      },
    });

    return {
      lab: updatedLab,
    };
  }

  // ----------------- DELETE LAB -------------------
  async deleteLab(accessToken: string, labId: string) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Fetch existing lab
    const existingLab = await this.prisma.lab.findUnique({
      where: { id: labId },
    });

    if (!existingLab) {
      throw new NotFoundException('Lab not found');
    }

    // Verify lab belongs to this doctor
    if (existingLab.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You are not authorized to delete this lab',
      );
    }

    // Soft delete
    await this.prisma.lab.update({
      where: { id: labId },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Lab deleted successfully',
    };
  }
}
