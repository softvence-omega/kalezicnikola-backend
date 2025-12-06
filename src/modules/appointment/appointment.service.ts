import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GetAllAppointmentsDto } from './dto/get-all-appointments.dto';

@Injectable()
export class AppointmentService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ----------------- CREATE APPOINTMENT -------------------
  async createAppointment(accessToken: string, dto: CreateAppointmentDto) {
    // 1. Verify doctor is authenticated
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // 2. Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // 3. Verify insuranceId matches patient's actual insuranceId
    if (dto.insuranceId !== patient.insuranceId) {
      throw new BadRequestException(
        'Insurance ID does not match patient\'s insurance ID',
      );
    }

    // 4. Verify scheduleSlotId exists and is a valid DoctorScheduleSlot
    const scheduleSlot = await this.prisma.doctorScheduleSlot.findUnique({
      where: { id: dto.scheduleSlotId },
      include: {
        schedule: true,
      },
    });

    if (!scheduleSlot) {
      throw new NotFoundException('Schedule slot not found');
    }

    // 5. Verify the schedule slot belongs to the authenticated doctor
    if (scheduleSlot.schedule.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'This schedule slot does not belong to you',
      );
    }

    // 6. Extract day of week from appointmentDate and verify it matches the schedule's day
    const appointmentDate = new Date(dto.appointmentDate);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
    }).toUpperCase();

    if (dayOfWeek !== scheduleSlot.schedule.day) {
      throw new BadRequestException(
        `Appointment date (${dayOfWeek}) does not match schedule day (${scheduleSlot.schedule.day})`,
      );
    }

    // 7. Ensure appointmentDate is in the future
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < now) {
      throw new BadRequestException('Appointment date must be in the future');
    }

    // 8. Check for conflicting appointments (same doctor, same slot, same date)
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        scheduleSlotId: dto.scheduleSlotId,
        appointmentDate: new Date(dto.appointmentDate),
        status: {
          not: 'CANCELLED',
        },
      },
    });

    if (conflictingAppointment) {
      throw new ConflictException(
        'This time slot is already booked for the selected date',
      );
    }

    // 9. Create appointment with auto-populated patient information
    const appointment = await this.prisma.appointment.create({
      data: {
        doctorId,
        patientId: dto.patientId,
        scheduleSlotId: dto.scheduleSlotId,
        appointmentDate: new Date(dto.appointmentDate),
        insuranceId: dto.insuranceId,
        // Auto-populate patient information for historical reference
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dob: patient.dob,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        // Optional fields
        appointmentDetails: dto.appointmentDetails,
        address: dto.address || patient.address,
        status: dto.status || 'SCHEDULED',
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
        scheduleSlot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return {
      appointment,
    };
  }

  // ----------------- GET ALL APPOINTMENTS -------------------
  async getAllAppointments(accessToken: string, query: GetAllAppointmentsDto) {
    // Verify doctor is authenticated
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

    // Build where clause
    const where: any = { doctorId };

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.appointmentDate = {};
      if (query.startDate) {
        where.appointmentDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.appointmentDate.lte = new Date(query.endDate);
      }
    }

    // Get total count
    const total = await this.prisma.appointment.count({ where });

    // Get appointments
    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        scheduleSlot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
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
      appointments,
    };
  }

  // ----------------- GET SINGLE APPOINTMENT -------------------
  async getSingleAppointment(accessToken: string, appointmentId: string) {
    // Verify doctor is authenticated
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Fetch appointment
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dob: true,
            gender: true,
            bloodGroup: true,
            address: true,
          },
        },
        scheduleSlot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            schedule: {
              select: {
                day: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to access this appointment',
      );
    }

    return {
      appointment,
    };
  }

  // ----------------- UPDATE APPOINTMENT -------------------
  async updateAppointment(
    accessToken: string,
    appointmentId: string,
    dto: UpdateAppointmentDto,
  ) {
    // Verify doctor is authenticated
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Fetch existing appointment
    const existingAppointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
      },
    });

    if (!existingAppointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (existingAppointment.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to update this appointment',
      );
    }

    // Prepare update data
    const updateData: any = {};

    // If patientId is being updated, verify new patient and insurance
    if (dto.patientId && dto.patientId !== existingAppointment.patientId) {
      const newPatient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
      });

      if (!newPatient) {
        throw new NotFoundException('New patient not found');
      }

      updateData.patientId = dto.patientId;
      // Auto-update patient information
      updateData.firstName = newPatient.firstName;
      updateData.lastName = newPatient.lastName;
      updateData.email = newPatient.email;
      updateData.phone = newPatient.phone;
      updateData.dob = newPatient.dob;
      updateData.gender = newPatient.gender;
      updateData.bloodGroup = newPatient.bloodGroup;
    }

    // Verify insuranceId if provided
    if (dto.insuranceId) {
      const patientToCheck = dto.patientId
        ? await this.prisma.patient.findUnique({ where: { id: dto.patientId } })
        : existingAppointment.patient;

      if (dto.insuranceId !== patientToCheck?.insuranceId) {
        throw new BadRequestException(
          'Insurance ID does not match patient\'s insurance ID',
        );
      }
      updateData.insuranceId = dto.insuranceId;
    }

    // If scheduleSlotId is being updated, validate it
    if (dto.scheduleSlotId) {
      const scheduleSlot = await this.prisma.doctorScheduleSlot.findUnique({
        where: { id: dto.scheduleSlotId },
        include: { schedule: true },
      });

      if (!scheduleSlot) {
        throw new NotFoundException('Schedule slot not found');
      }

      if (scheduleSlot.schedule.doctorId !== doctorId) {
        throw new UnauthorizedException(
          'This schedule slot does not belong to you',
        );
      }

      updateData.scheduleSlotId = dto.scheduleSlotId;

      // If appointmentDate is also being updated, verify day matches
      if (dto.appointmentDate) {
        const appointmentDate = new Date(dto.appointmentDate);
        const dayOfWeek = appointmentDate
          .toLocaleDateString('en-US', { weekday: 'long' })
          .toUpperCase();

        if (dayOfWeek !== scheduleSlot.schedule.day) {
          throw new BadRequestException(
            `Appointment date (${dayOfWeek}) does not match schedule day (${scheduleSlot.schedule.day})`,
          );
        }
      }
    }

    // If appointmentDate is being updated
    if (dto.appointmentDate) {
      const appointmentDate = new Date(dto.appointmentDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);

      if (appointmentDate < now) {
        throw new BadRequestException('Appointment date must be in the future');
      }

      updateData.appointmentDate = appointmentDate;

      // Check for conflicts if date or slot changed
      if (dto.scheduleSlotId || dto.appointmentDate) {
        const conflictingAppointment = await this.prisma.appointment.findFirst({
          where: {
            doctorId,
            scheduleSlotId: dto.scheduleSlotId || existingAppointment.scheduleSlotId,
            appointmentDate: appointmentDate,
            status: { not: 'CANCELLED' },
            id: { not: appointmentId }, // Exclude current appointment
          },
        });

        if (conflictingAppointment) {
          throw new ConflictException(
            'This time slot is already booked for the selected date',
          );
        }
      }
    }

    // Update optional fields
    if (dto.appointmentDetails !== undefined) {
      updateData.appointmentDetails = dto.appointmentDetails;
    }
    if (dto.address !== undefined) {
      updateData.address = dto.address;
    }
    if (dto.type !== undefined) {
      updateData.type = dto.type;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    // Update appointment
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
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
        scheduleSlot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return {
      appointment: updatedAppointment,
    };
  }

  // ----------------- DELETE APPOINTMENT -------------------
  async deleteAppointment(accessToken: string, appointmentId: string) {
    // Verify doctor is authenticated
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Fetch appointment
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to delete this appointment',
      );
    }

    // Delete appointment
    await this.prisma.appointment.delete({
      where: { id: appointmentId },
    });

    return {
      message: 'Appointment deleted successfully',
    };
  }
}
