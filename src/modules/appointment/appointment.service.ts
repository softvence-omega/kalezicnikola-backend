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
import { GetSlotAvailabilityDto } from './dto/get-slot-availability.dto';
import { AppointmentStatus, BufferTime, WeekDay } from 'generated/prisma';
import { NotificationHelperService } from '../notification/notification-helper.service';

@Injectable()
export class AppointmentService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notificationHelper: NotificationHelperService,
  ) { }

  // ----------------- CREATE APPOINTMENT -------------------
  async createAppointment(accessToken: string, dto: CreateAppointmentDto) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // 1. Fetch AppointmentType to get duration
    const appointmentType = await this.prisma.appointmentType.findUnique({
      where: { id: dto.appointmentTypeId },
    });

    if (!appointmentType) {
      throw new BadRequestException('Invalid appointment type');
    }

    // 2. Lookup/Create Patient
    let patient;
    
    if (dto.insuranceId) {
      // Insurance ID provided - check for existing patient
      patient = await this.prisma.patient.findUnique({
        where: { insuranceId: dto.insuranceId },
      });

      if (!patient) {
        if (!dto.firstName || !dto.lastName || !dto.phone || !dto.dob || !dto.gender || !dto.bloodGroup) {
          throw new BadRequestException('New patient details required when insurance ID is provided but patient not found');
        }
        patient = await this.prisma.patient.create({
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            insuranceId: dto.insuranceId,
            dob: new Date(dto.dob),
            gender: dto.gender,
            bloodGroup: dto.bloodGroup,
          },
        });

        // Trigger Patient Notification
        try {
          await this.notificationHelper.notifyPatientUpdate(doctorId, {
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            action: 'added',
          });
        } catch (error) {
          console.error('Failed to send patient notification:', error);
        }
      }
    } else {
      // No insurance ID provided - require patient details to create new patient
      if (!dto.firstName || !dto.lastName || !dto.phone || !dto.dob || !dto.gender || !dto.bloodGroup) {
        throw new BadRequestException('Patient details required when insurance ID is not provided');
      }
      patient = await this.prisma.patient.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          dob: new Date(dto.dob),
          gender: dto.gender,
          bloodGroup: dto.bloodGroup,
        },
      });

      // Trigger Patient Notification
      try {
        await this.notificationHelper.notifyPatientUpdate(doctorId, {
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          action: 'added',
        });
      } catch (error) {
        console.error('Failed to send patient notification:', error);
      }
    }

    // 3. Time Calculations
    const parseTimeToMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const clean = timeStr.trim().toUpperCase();
      const isPM = clean.includes('PM');
      const isAM = clean.includes('AM');
      let [h, m] = clean.replace(/[AP]M/, '').split(':').map(Number);
      if (isNaN(h)) return 0;
      if (isNaN(m)) m = 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return h * 60 + m;
    };

    const startMins = parseTimeToMinutes(dto.startTime);
    const endMins = startMins + appointmentType.duration;

    const minutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    const endTime = minutesToTime(endMins);

    // 4. Verify Schedule fits in Half-Days
    const appointmentDate = new Date(dto.appointmentDate);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase() as WeekDay;

    const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { doctorId_day: { doctorId, day: dayOfWeek } },
    });

    if (!schedule || schedule.isClosed) {
      throw new BadRequestException('Doctor is not available on this day');
    }

    let fitsInHalf = false;
    const halves = [
      { start: schedule.firstHalfStartTime, end: schedule.firstHalfEndTime },
      { start: schedule.secondHalfStartTime, end: schedule.secondHalfEndTime }
    ];

    for (const half of halves) {
      if (half.start && half.end) {
        const hStart = parseTimeToMinutes(half.start);
        const hEnd = parseTimeToMinutes(half.end);
        if (startMins >= hStart && endMins <= hEnd) {
          fitsInHalf = true;
          break;
        }
      }
    }

    if (!fitsInHalf) {
      throw new BadRequestException('Appointment must fit entirely within either the first or second half of the doctor\'s schedule');
    }

    // 4.5. Check if appointment date falls within an absence period
    const apptCheckDate = new Date(appointmentDate);
    apptCheckDate.setHours(0, 0, 0, 0);

    const absenceCheck = await this.prisma.doctorAbsence.findFirst({
      where: {
        doctorId,
        fromDate: { lte: apptCheckDate },
        toDate: { gte: apptCheckDate },
      },
    });

    if (absenceCheck) {
      // Find next available date
      let nextAvailableDate = new Date(absenceCheck.toDate);
      nextAvailableDate.setDate(nextAvailableDate.getDate() + 1);

      // Check if there are more absence periods after this one
      let currentDate = new Date(nextAvailableDate);
      const maxDaysToCheck = 365;
      let daysChecked = 0;

      while (daysChecked < maxDaysToCheck) {
        const futureAbsence = await this.prisma.doctorAbsence.findFirst({
          where: {
            doctorId,
            fromDate: { lte: currentDate },
            toDate: { gte: currentDate },
          },
        });

        if (!futureAbsence) {
          nextAvailableDate = currentDate;
          break;
        }

        currentDate = new Date(futureAbsence.toDate);
        currentDate.setDate(currentDate.getDate() + 1);
        daysChecked++;
      }

      const fromDateStr = absenceCheck.fromDate.toISOString().split('T')[0];
      const toDateStr = absenceCheck.toDate.toISOString().split('T')[0];
      const nextDateStr = nextAvailableDate.toISOString().split('T')[0];

      const reasonMsg = absenceCheck.reason ? ` (${absenceCheck.reason})` : '';
      throw new BadRequestException(
        `Doctor is unavailable from ${fromDateStr} to ${toDateStr}${reasonMsg}. Next available date is ${nextDateStr}.`
      );
    }

    // 5. Conflict Check with Buffer
    const regionalSettings = await this.prisma.doctorRegionalSettings.findUnique({
      where: { doctorId },
    });

    const bufferMap: Record<BufferTime, number> = {
      Minutes_5: 5,
      Minutes_10: 10,
      Minutes_15: 15,
      Minutes_20: 20,
      Minutes_30: 30,
    };
    const buffer = regionalSettings ? bufferMap[regionalSettings.bufferTimeBetween] || 0 : 0;

    const dayStart = new Date(dto.appointmentDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dto.appointmentDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 'SCHEDULED',
      },
      select: { startTime: true, endTime: true }
    });

    for (const appt of existingAppointments) {
      if (appt.startTime && appt.endTime) {
        const eStart = parseTimeToMinutes(appt.startTime);
        const eEnd = parseTimeToMinutes(appt.endTime);

        // Conflict formula: new_start < existing_end + buffer AND existing_start < new_end + buffer
        if (startMins < eEnd + buffer && eStart < endMins + buffer) {
          throw new ConflictException(`Time slot conflicts with an existing appointment (including ${buffer} min buffer time)`);
        }
      }
    }

    // 6. Create Appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        doctorId,
        patientId: patient.id,
        appointmentTypeId: appointmentType.id,
        appointmentDate: new Date(dto.appointmentDate),
        startTime: dto.startTime,
        endTime: endTime,
        insuranceId: dto.insuranceId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dob: patient.dob,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        appointmentDetails: dto.appointmentDetails,
        address: dto.address || patient.address,
        status: dto.status || 'SCHEDULED',
      },
      include: {
        patient: true,
        appointmentType: true,
      },
    });

    // 7. Trigger Notification
    try {
      await this.notificationHelper.notifyAppointmentReminder(doctorId, {
        appointmentId: appointment.id.toString(),
        patientName: `${patient.firstName} ${patient.lastName}`,
        appointmentTime: new Date(dto.appointmentDate),
      });
    } catch (error) {
      console.error('Failed to send appointment notification:', error);
    }

    return { appointment };
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

    // Filter by specific appointment date (takes precedence over range)
    if (query.appointmentDate) {
      const date = new Date(query.appointmentDate);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      where.appointmentDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (query.startDate || query.endDate) {
      // Filter by date range only if appointmentDate is not provided
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
        appointmentType: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            insuranceId: true,
            gender: true,
            dob: true,
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

  // ----------------- GET TODAY'S APPOINTMENTS -------------------
  async getTodayAppointments(accessToken: string) {
    // Verify doctor is authenticated
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Get today's date range (start and end of day)
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Fetch today's appointments
    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        status: AppointmentStatus.SCHEDULED,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        appointmentType: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Check if appointments exist
    if (appointments.length === 0) {
      return {
        message: 'No appointments scheduled for today',
        data: {
          count: 0,
          appointments: [],
        },
      };
    }

    return {
      message: `Found ${appointments.length} appointment${appointments.length > 1 ? 's' : ''} for today`,
      data: {
        count: appointments.length,
        appointments,
      },
    };
  }

  async getSlotAvailability(
    accessToken: string,
    query: GetSlotAvailabilityDto,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: { include: { doctorRegionalSettings: true } } },
    });

    if (!session?.doctorId || !session.doctor) throw new UnauthorizedException();
    const doctorId = session.doctorId;

    const queryDate = query.date ? new Date(query.date) : new Date();
    const dayOfWeek = queryDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase() as WeekDay;

    const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { doctorId_day: { doctorId, day: dayOfWeek } },
    });

    if (!schedule || schedule.isClosed) {
      return { message: 'Doctor is closed on this day', data: { date: query.date, availableSlots: [] } };
    }

    // Determine duration: from provided type or default settings
    let duration = 20; // fallback
    if (query.appointmentTypeId) {
      const type = await this.prisma.appointmentType.findUnique({ where: { id: query.appointmentTypeId } });
      if (type) duration = type.duration;
    } else if (session.doctor.doctorRegionalSettings?.defaultAppointmentDuration) {
      // Map enum Minutes_20 to number 20
      const durationMap: any = {
        Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30, Minutes_45: 45, Minutes_60: 60
      };
      duration = durationMap[session.doctor.doctorRegionalSettings.defaultAppointmentDuration] || 20;
    }

    const bufferMap: Record<BufferTime, number> = {
      Minutes_5: 5, Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30,
    };
    const buffer = session.doctor.doctorRegionalSettings ? bufferMap[session.doctor.doctorRegionalSettings.bufferTimeBetween] || 0 : 0;

    const parseTimeToMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const clean = timeStr.trim().toUpperCase();
      const isPM = clean.includes('PM');
      const isAM = clean.includes('AM');
      let [h, m] = clean.replace(/[AP]M/, '').split(':').map(Number);
      if (isNaN(h)) return 0;
      if (isNaN(m)) m = 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return h * 60 + m;
    };
    const timeToMinutes = parseTimeToMinutes;

    const minutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Get existing appointments to check for conflicts
    const dayStart = new Date(queryDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(queryDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 'SCHEDULED',
      },
      select: { startTime: true, endTime: true }
    });

    const isSlotAvailable = (start: number, end: number) => {
      return !appointments.some(appt => {
        if (!appt.startTime || !appt.endTime) return false;
        const eStart = timeToMinutes(appt.startTime);
        const eEnd = timeToMinutes(appt.endTime);
        return (start < eEnd + buffer && eStart < end + buffer);
      });
    };

    const generateSlots = (startStr: string | null, endStr: string | null) => {
      if (!startStr || !endStr) return [];
      const slots: any[] = [];
      let current = timeToMinutes(startStr);
      const endLimit = timeToMinutes(endStr);

      while (current + duration <= endLimit) {
        const slotEnd = current + duration;
        if (isSlotAvailable(current, slotEnd)) {
          slots.push({
            startTime: minutesToTime(current),
            endTime: minutesToTime(slotEnd),
            isAvailable: true
          });
        }
        current += duration + buffer;
      }
      return slots;
    };

    const firstHalfSlots = generateSlots(schedule.firstHalfStartTime, schedule.firstHalfEndTime);
    const secondHalfSlots = generateSlots(schedule.secondHalfStartTime, schedule.secondHalfEndTime);

    const allSlots = [...firstHalfSlots, ...secondHalfSlots];

    return {
      message: `Found ${allSlots.length} available slots`,
      data: {
        date: query.date,
        dayOfWeek,
        availableSlots: allSlots,
      }
    };
  }

  // ----------------- GET SINGLE APPOINTMENT -------------------
  async getSingleAppointment(accessToken: string, appointmentId: number) {
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
        appointmentType: true,
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
    appointmentId: number,
    dto: UpdateAppointmentDto,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session?.doctorId) throw new UnauthorizedException();
    const doctorId = session.doctorId;

    const existingAppointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existingAppointment || existingAppointment.doctorId !== doctorId) {
      throw new NotFoundException('Appointment not found');
    }

    const updateData: any = {};

    // 1. Handle Appointment Type / Duration Change
    let duration = 20;
    if (dto.appointmentTypeId) {
      const type = await this.prisma.appointmentType.findUnique({ where: { id: dto.appointmentTypeId } });
      if (!type) throw new BadRequestException('Invalid appointment type');
      updateData.appointmentTypeId = dto.appointmentTypeId;
      duration = type.duration;
    } else {
      const currentType = await this.prisma.appointmentType.findUnique({
        where: { id: existingAppointment.appointmentTypeId || '' }
      });
      duration = currentType?.duration || 20;
    }

    // 2. Handle Time/Date Change
    const startTime = dto.startTime || existingAppointment.startTime;
    const appointmentDateArray = dto.appointmentDate ? new Date(dto.appointmentDate) : existingAppointment.appointmentDate;
    const appointmentDate = appointmentDateArray ? new Date(appointmentDateArray) : null;

    if (startTime && appointmentDate) {
      const timeToMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };
      const minutesToTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      const startMins = timeToMinutes(startTime);
      const endMins = startMins + duration;
      const endTime = minutesToTime(endMins);

      updateData.startTime = startTime;
      updateData.endTime = endTime;
      updateData.appointmentDate = appointmentDate;

      // 3. Half-Day Check
      const dayOfWeek = appointmentDate
        .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
        .toUpperCase() as WeekDay;
      const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
        where: { doctorId_day: { doctorId, day: dayOfWeek } },
      });

      if (!schedule || schedule.isClosed) throw new BadRequestException('Doctor is not available on this day');

      let fitsInHalf = false;
      const halves = [
        { start: schedule.firstHalfStartTime, end: schedule.firstHalfEndTime },
        { start: schedule.secondHalfStartTime, end: schedule.secondHalfEndTime }
      ];

      for (const half of halves) {
        if (half.start && half.end) {
          const hStart = timeToMinutes(half.start);
          const hEnd = timeToMinutes(half.end);
          if (startMins >= hStart && endMins <= hEnd) {
            fitsInHalf = true;
            break;
          }
        }
      }
      if (!fitsInHalf) throw new BadRequestException('Appointment must fit in a half-day block');

      // 3.5. Check if reschedule date falls within an absence period
      const rescheduleCheckDate = new Date(appointmentDate);
      rescheduleCheckDate.setHours(0, 0, 0, 0);

      const absenceCheck = await this.prisma.doctorAbsence.findFirst({
        where: {
          doctorId,
          fromDate: { lte: rescheduleCheckDate },
          toDate: { gte: rescheduleCheckDate },
        },
      });

      if (absenceCheck) {
        // Find next available date
        let nextAvailableDate = new Date(absenceCheck.toDate);
        nextAvailableDate.setDate(nextAvailableDate.getDate() + 1);

        // Check if there are more absence periods after this one
        let currentDate = new Date(nextAvailableDate);
        const maxDaysToCheck = 365;
        let daysChecked = 0;

        while (daysChecked < maxDaysToCheck) {
          const futureAbsence = await this.prisma.doctorAbsence.findFirst({
            where: {
              doctorId,
              fromDate: { lte: currentDate },
              toDate: { gte: currentDate },
            },
          });

          if (!futureAbsence) {
            nextAvailableDate = currentDate;
            break;
          }

          currentDate = new Date(futureAbsence.toDate);
          currentDate.setDate(currentDate.getDate() + 1);
          daysChecked++;
        }

        const fromDateStr = absenceCheck.fromDate.toISOString().split('T')[0];
        const toDateStr = absenceCheck.toDate.toISOString().split('T')[0];
        const nextDateStr = nextAvailableDate.toISOString().split('T')[0];

        const reasonMsg = absenceCheck.reason ? ` (${absenceCheck.reason})` : '';
        throw new BadRequestException(
          `Cannot reschedule: Doctor is unavailable from ${fromDateStr} to ${toDateStr}${reasonMsg}. Next available date is ${nextDateStr}.`
        );
      }

      // 4. Conflict Check with Buffer
      const regionalSettings = await this.prisma.doctorRegionalSettings.findUnique({ where: { doctorId } });
      const bufferMap: Record<BufferTime, number> = {
        Minutes_5: 5, Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30,
      };
      const buffer = regionalSettings ? bufferMap[regionalSettings.bufferTimeBetween] || 0 : 0;

      const conflicts = await this.prisma.appointment.findMany({
        where: {
          doctorId,
          appointmentDate: {
            gte: new Date(new Date(appointmentDate).setHours(0, 0, 0, 0)),
            lte: new Date(new Date(appointmentDate).setHours(23, 59, 59, 999)),
          },
          status: 'SCHEDULED',
          id: { not: appointmentId }
        }
      });

      for (const appt of conflicts) {
        if (appt.startTime && appt.endTime) {
          const eStart = timeToMinutes(appt.startTime);
          const eEnd = timeToMinutes(appt.endTime);
          if (startMins < eEnd + buffer && eStart < endMins + buffer) {
            throw new ConflictException(`Time slot conflict (including ${buffer} min buffer)`);
          }
        }
      }
    }

    if (dto.appointmentDetails !== undefined) updateData.appointmentDetails = dto.appointmentDetails;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: { patient: true, appointmentType: true },
    });

    return { appointment: updated };
  }

  // ----------------- DELETE APPOINTMENT -------------------
  async deleteAppointment(accessToken: string, appointmentId: number) {
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
