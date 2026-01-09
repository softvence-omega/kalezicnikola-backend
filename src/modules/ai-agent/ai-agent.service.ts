import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { KbQueryDto } from './dto/kb-query.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { TranscriptionSaveDto } from './dto/transcription-save.dto';
import { ElevenLabsPostCallDto } from './dto/elevenlabs-post-call.dto';
import { AgentCreateTaskDto } from './dto/agent-create-task.dto';
import { BufferTime, WeekDay } from 'generated/prisma';

import axios from 'axios';

@Injectable()
export class AiAgentService {
  private readonly twilioNumber: string;
  private readonly fallbackNumber: string;
  private readonly elevenLabsApiKey: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.twilioNumber = '+15095091987'; // Twilio number from client
    this.fallbackNumber = '+8801742460399'; // Physical assistant number
    this.elevenLabsApiKey =
      this.config.get<string>('ELEVENLABS_WEBHOOK_API_KEY') || '';
  }

  // =============== MAIN WEBHOOK PROCESSOR ===============
  async processWebhook(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    const { intent, doctor_id, agent_busy } = payload;

    // If agent is busy, provide fallback number
    if (agent_busy) {
      return {
        reply_text: `I apologize, but I'm currently assisting other patients. Please call our physical assistant at ${this.fallbackNumber} for immediate assistance.`,
        action: 'transfer_to_assistant',
        fallback_number: this.fallbackNumber,
      };
    }

    // Route based on intent
    switch (intent?.toLowerCase()) {
      case 'book_appointment':
        return this.handleBookingIntent(payload);
      case 'check_availability':
        return this.handleAvailabilityIntent(payload);
      case 'reschedule':
        return this.handleRescheduleIntent(payload);
      case 'cancel':
        return this.handleCancelIntent(payload);
      case 'inquiry':
      case 'general':
        return this.handleInquiryIntent(payload);
      default:
        return {
          reply_text:
            'I can help you with booking appointments, checking availability, or answering questions about our services. How can I assist you today?',
          action: 'ask_intent',
        };
    }
  }

  // =============== KNOWLEDGE BASE QUERY ===============
  async queryKnowledgeBase(dto: KbQueryDto) {
    const kbEntries = await this.prisma.doctorKnowledgeBase.findMany({
      where: {
        doctorId: dto.doctor_id,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    if (kbEntries.length === 0) {
      return {
        answer:
          "I don't have specific information about that at the moment. Would you like me to connect you with our team?",
        category: null,
      };
    }

    // Simple keyword matching (can be enhanced with vector search later)
    const queryLower = dto.query.toLowerCase();
    const matches = kbEntries.filter((entry) => {
      const questionMatch = entry.question.toLowerCase().includes(queryLower);
      const answerMatch = entry.answer.toLowerCase().includes(queryLower);
      const keywordMatch = entry.keywords.some((kw) =>
        queryLower.includes(kw.toLowerCase()),
      );
      return questionMatch || answerMatch || keywordMatch;
    });

    if (matches.length > 0) {
      return {
        answer: matches[0].answer,
        category: matches[0].category,
        question: matches[0].question,
      };
    }

    // Fallback: return highest priority entry
    return {
      answer: kbEntries[0].answer,
      category: kbEntries[0].category,
      question: kbEntries[0].question,
    };
  }

  // =============== SLOT AVAILABILITY ===============
  async getAvailableSlots(dto: SlotQueryDto) {
    const { doctor_id, date, appointment_type_id } = dto;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctor_id },
      include: { doctorRegionalSettings: true }
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const queryDate = date ? new Date(date) : new Date();
    const dayOfWeek = queryDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() as WeekDay;

    const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { doctorId_day: { doctorId: doctor_id, day: dayOfWeek } },
    });

    if (!schedule || schedule.isClosed) {
      return { summary: { total: 0, available: 0, unavailable: 0 }, availableSlots: [], unavailableSlots: [] };
    }

    // Determine duration
    let duration = 20;
    if (appointment_type_id) {
      const type = await this.prisma.appointmentType.findUnique({ where: { id: appointment_type_id } });
      if (type) duration = type.duration;
    } else if (doctor.doctorRegionalSettings?.defaultAppointmentDuration) {
      const durationMap: any = {
        Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30, Minutes_45: 45, Minutes_60: 60
      };
      duration = durationMap[doctor.doctorRegionalSettings.defaultAppointmentDuration] || 20;
    }

    const bufferMap: Record<BufferTime, number> = {
      Minutes_5: 5, Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30,
    };
    const buffer = doctor.doctorRegionalSettings ? bufferMap[doctor.doctorRegionalSettings.bufferTimeBetween] || 0 : 0;

    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const minutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor_id,
        appointmentDate: {
          gte: new Date(new Date(queryDate).setHours(0,0,0,0)),
          lte: new Date(new Date(queryDate).setHours(23,59,59,999)),
        },
        status: 'SCHEDULED',
      },
      select: { startTime: true, endTime: true, patient: { select: { firstName: true, lastName: true } } }
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
          slots.push({ startTime: minutesToTime(current), endTime: minutesToTime(slotEnd), isAvailable: true });
        }
        current += duration + buffer;
      }
      return slots;
    };

    const avail = [...generateSlots(schedule.firstHalfStartTime, schedule.firstHalfEndTime), ...generateSlots(schedule.secondHalfStartTime, schedule.secondHalfEndTime)];

    return {
      summary: { total: avail.length, available: avail.length, unavailable: 0 },
      availableSlots: avail,
      unavailableSlots: []
    };
  }

  // =============== SUGGEST ALTERNATIVE SLOTS ===============
  async suggestAlternativeSlots(dto: SlotQueryDto) {
    const { doctor_id, requested_slot, appointment_type_id } = dto;
    const requestedDate = requested_slot ? new Date(requested_slot) : new Date();
    if (isNaN(requestedDate.getTime())) throw new BadRequestException('Invalid date');

    const alternatives: any[] = [];
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(requestedDate);
      checkDate.setDate(checkDate.getDate() + i);
      const slots = await this.getAvailableSlots({ doctor_id, date: checkDate.toISOString(), appointment_type_id });
      for (const slot of slots.availableSlots) {
        alternatives.push({ date: checkDate.toISOString().split('T')[0], time: slot.startTime });
        if (alternatives.length >= 10) break;
      }
      if (alternatives.length >= 10) break;
    }
    return { alternative_slots: alternatives };
  }

  // =============== CREATE BOOKING ===============
  async createBooking(dto: any) {
    const { doctor_id, patient_id, appointment_type_id, start_time, appointment_date, patient_info } = dto;

    const apptDate = new Date(appointment_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (new Date(apptDate).setHours(0,0,0,0) < now.getTime()) throw new BadRequestException('Cannot book in the past');

    let patientId = patient_id;
    let isNewPatient = false;

    if (!patientId) {
      if (!patient_info?.phone) throw new BadRequestException('Phone required');
      const existingPatient = await this.prisma.patient.findFirst({ where: { phone: patient_info.phone } });
      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const newPatient = await this.prisma.patient.create({
          data: {
            firstName: patient_info.firstName,
            lastName: patient_info.lastName,
            phone: patient_info.phone,
            email: patient_info.email,
            insuranceId: patient_info.insuranceId || null,
            dob: patient_info.dob ? new Date(patient_info.dob) : null,
            gender: patient_info.gender?.toUpperCase() as any,
          },
        });
        patientId = newPatient.id;
        isNewPatient = true;
      }
    }

    // Determine endTime
    const type = await this.prisma.appointmentType.findUnique({ where: { id: appointment_type_id || '' } });
    if (!type) throw new BadRequestException('Invalid appointment type');
    
    const [h, m] = start_time.split(':').map(Number);
    const endMins = h * 60 + m + type.duration;
    const endTime = `${Math.floor(endMins/60).toString().padStart(2,'0')}:${(endMins%60).toString().padStart(2,'0')}`;

    // Conflict & Half-day check
    const dayOfWeek = apptDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() as WeekDay;
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctor_id },
      include: { doctorRegionalSettings: true }
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { doctorId_day: { doctorId: doctor_id, day: dayOfWeek } },
    });
    if (!schedule || schedule.isClosed) throw new BadRequestException('Doctor closed on this day');

    const startMins = h * 60 + m;
    const endMinsFull = startMins + type.duration;

    // Half-Day check
    let fitsInHalf = false;
    const halves = [
      { start: schedule.firstHalfStartTime, end: schedule.firstHalfEndTime },
      { start: schedule.secondHalfStartTime, end: schedule.secondHalfEndTime }
    ];
    for (const half of halves) {
      if (half.start && half.end) {
        const [sh, sm] = half.start.split(':').map(Number);
        const [eh, em] = half.end.split(':').map(Number);
        if (startMins >= (sh*60+sm) && endMinsFull <= (eh*60+em)) {
          fitsInHalf = true;
          break;
        }
      }
    }
    if (!fitsInHalf) throw new BadRequestException('Appointment must fit in a half-day block');

    // Conflict check
    const bufferMap: Record<BufferTime, number> = {
      Minutes_5: 5, Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30,
    };
    const buffer = doctor.doctorRegionalSettings ? bufferMap[doctor.doctorRegionalSettings.bufferTimeBetween] || 0 : 0;

    const existing = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor_id,
        appointmentDate: {
          gte: new Date(new Date(apptDate).setHours(0,0,0,0)),
          lte: new Date(new Date(apptDate).setHours(23,59,59,999)),
        },
        status: 'SCHEDULED',
      }
    });

    for (const appt of existing) {
      if (appt.startTime && appt.endTime) {
        const [ash, asm] = appt.startTime.split(':').map(Number);
        const [aeh, aem] = appt.endTime.split(':').map(Number);
        const eStart = ash * 60 + asm;
        const eEnd = aeh * 60 + aem;
        if (startMins < eEnd + buffer && eStart < endMinsFull + buffer) {
          throw new ConflictException(`Time slot conflicts with an existing appointment (including ${buffer} min buffer time)`);
        }
      }
    }
    
    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        doctorId: doctor_id,
        patientId: patientId,
        appointmentTypeId: type.id,
        appointmentDate: apptDate,
        startTime: start_time,
        endTime: endTime,
        insuranceId: patient_info?.insuranceId || null,
        status: 'SCHEDULED',
      },
      include: {
        patient: true,
        appointmentType: true,
      },
    });

    return {
      success: true,
      booking_id: appointment.id,
      message: isNewPatient ? 'Registered and booked' : 'Booked',
      is_new_patient: isNewPatient,
      appointment: {
        id: appointment.id,
        date: appointment.appointmentDate,
        time: appointment.startTime,
        patient: appointment.patient,
      },
    };
  }

  // Helper to parse booking ID (handles "123", "#123", "123rd", "seventeen", "eighteenth")
  private parseBookingId(id: string): number | null {
    if (!id) return null;

    const lowerId = id.toLowerCase().trim();

    // 1. Try extracting digits directly (handles "18th", "#18", "No. 18")
    const digitMatch = lowerId.match(/(\d+)/);
    if (digitMatch) {
      return Number(digitMatch[1]);
    }

    // 2. Handle number words and ordinals
    const wordMap: Record<string, number> = {
      // Cardinals
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19,
      twenty: 20,
      // Ordinals
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      sixth: 6,
      seventh: 7,
      eighth: 8,
      ninth: 9,
      tenth: 10,
      eleventh: 11,
      twelfth: 12,
      thirteenth: 13,
      fourteenth: 14,
      fifteenth: 15,
      sixteenth: 16,
      seventeenth: 17,
      eighteenth: 18,
      nineteenth: 19,
      twentieth: 20,
    };

    if (wordMap[lowerId]) return wordMap[lowerId];

    // Check for "number X" format with words
    if (lowerId.startsWith('number ')) {
      const part = lowerId.replace('number ', '').trim();
      if (wordMap[part]) return wordMap[part];
    }

    return null;
  }

  // =============== UPDATE BOOKING ===============
  async updateBooking(dto: {
    booking_id: string;
    new_start_time?: string;
    new_date?: string;
    appointment_type_id?: string;
  }) {
    const bookingId = this.parseBookingId(dto.booking_id);
    if (!bookingId) throw new BadRequestException('Invalid booking ID');

    const appointment = await this.prisma.appointment.findUnique({ where: { id: bookingId } });
    if (!appointment) throw new NotFoundException('Booking not found');

    const updateData: any = {};
    if (dto.new_date) updateData.appointmentDate = new Date(dto.new_date);
    if (dto.new_start_time) updateData.startTime = dto.new_start_time;
    if (dto.appointment_type_id) updateData.appointmentTypeId = dto.appointment_type_id;

    // Recalculate endTime if needed
    if (dto.new_start_time || dto.appointment_type_id) {
       const typeId = dto.appointment_type_id || appointment.appointmentTypeId;
       const type = await this.prisma.appointmentType.findUnique({ where: { id: typeId || '' } });
       if (type) {
         const st = dto.new_start_time || appointment.startTime || '00:00';
         const [h, m] = st.split(':').map(Number);
         const endMins = h * 60 + m + type.duration;
         updateData.endTime = `${Math.floor(endMins/60).toString().padStart(2,'0')}:${(endMins%60).toString().padStart(2,'0')}`;
       }
    }

    // Conflict & Half-day check (if time or date changed)
    if (dto.new_date || dto.new_start_time || dto.appointment_type_id) {
        const checkDate = dto.new_date ? new Date(dto.new_date) : appointment.appointmentDate;
        const checkStart = dto.new_start_time || appointment.startTime;
        const typeId = dto.appointment_type_id || appointment.appointmentTypeId;

        if (checkDate && checkStart && typeId) {
            const type = await this.prisma.appointmentType.findUnique({ where: { id: typeId } });
            if (!type) throw new BadRequestException('Invalid type');

            const dayOfWeek = new Date(checkDate).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() as WeekDay;
            const doctor = await this.prisma.doctor.findUnique({
                where: { id: appointment.doctorId || '' },
                include: { doctorRegionalSettings: true }
            });

            const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
                where: { doctorId_day: { doctorId: appointment.doctorId || '', day: dayOfWeek } },
            });
            if (!schedule || schedule.isClosed) throw new BadRequestException('Doctor closed on this day');

            const [h, m] = checkStart.split(':').map(Number);
            const startMins = h * 60 + m;
            const endMinsFull = startMins + type.duration;

            let fitsInHalf = false;
            const halves = [
                { start: schedule.firstHalfStartTime, end: schedule.firstHalfEndTime },
                { start: schedule.secondHalfStartTime, end: schedule.secondHalfEndTime }
            ];
            for (const half of halves) {
                if (half.start && half.end) {
                    const [sh, sm] = half.start.split(':').map(Number);
                    const [eh, em] = half.end.split(':').map(Number);
                    if (startMins >= (sh*60+sm) && endMinsFull <= (eh*60+em)) {
                        fitsInHalf = true;
                        break;
                    }
                }
            }
            if (!fitsInHalf) throw new BadRequestException('Appointment must fit in a half-day block');

            const bufferMap: Record<BufferTime, number> = {
                Minutes_5: 5, Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30,
            };
            const buffer = doctor?.doctorRegionalSettings ? bufferMap[doctor.doctorRegionalSettings.bufferTimeBetween] || 0 : 0;

            const existing = await this.prisma.appointment.findMany({
                where: {
                    doctorId: appointment.doctorId,
                    appointmentDate: {
                        gte: new Date(new Date(checkDate).setHours(0,0,0,0)),
                        lte: new Date(new Date(checkDate).setHours(23,59,59,999)),
                    },
                    status: 'SCHEDULED',
                    id: { not: bookingId }
                }
            });

            for (const appt of existing) {
                if (appt.startTime && appt.endTime) {
                    const [ash, asm] = appt.startTime.split(':').map(Number);
                    const [aeh, aem] = appt.endTime.split(':').map(Number);
                    const eStart = ash * 60 + asm;
                    const eEnd = aeh * 60 + aem;
                    if (startMins < eEnd + buffer && eStart < endMinsFull + buffer) {
                        throw new ConflictException(`Time slot conflicts with an existing appointment (including ${buffer} min buffer time)`);
                    }
                }
            }
        }
    }

    const updated = await this.prisma.appointment.update({
      where: { id: bookingId },
      data: updateData,
    });

    return {
      success: true,
      booking_id: updated.id,
      message: 'Rescheduled successfully',
      appointment: { id: updated.id, date: updated.appointmentDate, time: updated.startTime, status: updated.status },
    };
  }

  // =============== CANCEL BOOKING ===============
  async cancelBooking(dto: {
    booking_id?: string;
    phone_number?: string;
    appointment_date?: string;
  }) {
    let appointment;

    // Try to find by booking_id first
    if (dto.booking_id) {
      const bookingId = this.parseBookingId(dto.booking_id);
      if (bookingId) {
        appointment = await this.prisma.appointment.findUnique({
          where: { id: bookingId },
        });
      }
    }

    // Fallback: Find by phone number
    if (!appointment && dto.phone_number) {
      const patient = await this.prisma.patient.findFirst({
        where: { phone: dto.phone_number },
      });

      if (patient) {
        // Find all SCHEDULED appointments for this patient
        const appointments = await this.prisma.appointment.findMany({
          where: {
            patientId: patient.id,
            status: 'SCHEDULED',
          },
          orderBy: { appointmentDate: 'asc' },
          include: { scheduleSlot: true },
        });

        // If date provided, filter by date
        if (dto.appointment_date && appointments.length > 0) {
          const searchDate = new Date(dto.appointment_date);
          const filtered = appointments.filter((apt) => {
            if (!apt.appointmentDate) return false;
            const aptDate = new Date(apt.appointmentDate);
            return (
              aptDate.toISOString().split('T')[0] ===
              searchDate.toISOString().split('T')[0]
            );
          });

          if (filtered.length > 1) {
            throw new BadRequestException(
              `Found ${filtered.length} appointments on this date. Please provide the booking ID.`,
            );
          }
          if (filtered.length > 0) appointment = filtered[0];
        } else if (appointments.length === 1) {
          // Only one scheduled appointment, use it
          appointment = appointments[0];
        } else if (appointments.length > 1) {
          throw new BadRequestException(
            `Found ${appointments.length} scheduled appointments. Please provide the booking ID or appointment date.`,
          );
        }
      }
    }

    if (!appointment) {
      throw new NotFoundException('Booking not found');
    }

    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('Appointment is already cancelled');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CANCELLED' },
    });

    return {
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: {
        id: updated.id,
        status: updated.status,
        date: updated.appointmentDate,
      },
    };
  }

  // =============== GET BOOKING ===============
  async getBooking(bookingId: string) {
    const id = this.parseBookingId(bookingId);
    if (!id) {
      throw new NotFoundException('Invalid booking ID format');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: id },
      include: {
        doctor: {
          select: { firstName: true, lastName: true, specialities: true },
        },
        patient: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        scheduleSlot: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Booking not found');
    }

    return {
      success: true,
      data: appointment,
    };
  }

  private determineCallStatus(
    dto: TranscriptionSaveDto,
    resolvedAppointmentId?: number,
  ): 'SUCCESSFUL' | 'UNSUCCESSFUL' | 'TRANSFERRED' | 'MISSED' {
    // 1. Priority: Explicit status from AI
    if (dto.call_status) {
      const status = dto.call_status.toUpperCase();
      if (
        ['SUCCESSFUL', 'UNSUCCESSFUL', 'TRANSFERRED', 'MISSED'].includes(status)
      ) {
        return status as any;
      }
    }

    const duration = typeof dto.duration === 'number' ? dto.duration : -1;
    const textToCheck = ((dto.summary || '') + ' ' + (dto.transcription || ''))
      .toLowerCase()
      .trim();

    // 2. Priority: Appointment Made -> Always SUCCESSFUL
    if (dto.appointment_id || resolvedAppointmentId) {
      return 'SUCCESSFUL';
    }

    // 3. Priority: MISSED check
    // If there is NO transcription, or it's under 5 seconds (lowered from 10 to be safer), or short + aborted
    if (!dto.transcription || dto.transcription.trim().length === 0) {
      return 'MISSED';
    }
    if (duration >= 0 && duration < 5) {
      return 'MISSED';
    }
    if (
      duration >= 0 &&
      duration < 20 &&
      (dto.transcription.length < 50 ||
        textToCheck.includes('cut the call') ||
        textToCheck.includes('wrong number'))
    ) {
      return 'MISSED';
    }

    // 3.5 Priority: SUCCESSFUL check for Tasks or explicit success words
    if (
      textToCheck.includes('successfully created a task') ||
      textToCheck.includes('task for you') ||
      textToCheck.includes('created the task') ||
      textToCheck.includes('successfully booked') ||
      textToCheck.includes('appointment for you')
    ) {
      return 'SUCCESSFUL';
    }

    // 4. Priority: TRANSFERRED check
    if (
      dto.was_transferred ||
      textToCheck.includes('transfer') ||
      textToCheck.includes('human') ||
      textToCheck.includes('assistant') ||
      textToCheck.includes('connect you') ||
      textToCheck.includes('physical assistance')
    ) {
      return 'TRANSFERRED';
    }

    // 5. Priority: Booking failure check
    if (
      dto.intent?.toUpperCase() === 'BOOK_APPOINTMENT' &&
      !dto.appointment_id &&
      !resolvedAppointmentId
    ) {
      return 'UNSUCCESSFUL';
    }

    return 'SUCCESSFUL';
  }

  // =============== SAVE TRANSCRIPTION ===============
  async saveTranscription(dto: TranscriptionSaveDto) {
    let patientId = dto.patient_id;
    let appointmentId = dto.appointment_id
      ? Number(dto.appointment_id)
      : undefined;

    // Insurance ID: optional, digits only 
    let insuranceId: string | undefined = dto.insurance_id;

    if (insuranceId) {
      // Remove whitespace just in case
      insuranceId = insuranceId.trim();

      // Optional extra safety: keep only digits
      insuranceId = insuranceId.replace(/\D/g, '');

      // At this point DTO already guarantees length === 10
    }

    // Extract patient info from transcription/summary (including phone, name, email)
    const patientInfo = this.extractPatientInfoFromText(
      dto.transcription || dto.summary || '',
    );

    // Use extracted phone if not provided in DTO
    let phoneNumber = dto.phone_number || patientInfo.phone;

    // STEP 1: Try to find or create patient
    if (!patientId && phoneNumber) {
      // Try to find existing patient by phone
      const existingPatient = await this.prisma.patient.findFirst({
        where: {
          phone: phoneNumber,
        },
      });

      if (existingPatient) {
        patientId = existingPatient.id;

        // Update patient's insurance ID if provided and not already set
        if (insuranceId && !existingPatient.insuranceId) {
          await this.prisma.patient.update({
            where: { id: patientId },
            data: { insuranceId: insuranceId },
          });
        }

        // Update patient's name if extracted and not already set
        if (
          (patientInfo.firstName && !existingPatient.firstName) ||
          (patientInfo.lastName && !existingPatient.lastName)
        ) {
          await this.prisma.patient.update({
            where: { id: patientId },
            data: {
              firstName: patientInfo.firstName || existingPatient.firstName,
              lastName: patientInfo.lastName || existingPatient.lastName,
            },
          });
        }
      } else {
        // Create new patient if we have at least name or email
        if (patientInfo.firstName || patientInfo.email) {
          const newPatient = await this.prisma.patient.create({
            data: {
              firstName: patientInfo.firstName,
              lastName: patientInfo.lastName,
              phone: phoneNumber,
              email: patientInfo.email,
              insuranceId: insuranceId, // Save insurance ID for new patient
            },
          });
          patientId = newPatient.id;
        }
      }
    } else if (patientId && insuranceId) {
      // If patientId provided (e.g. from existing context), check if we need to update insurance
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
      });
      if (patient && !patient.insuranceId) {
        await this.prisma.patient.update({
          where: { id: patientId },
          data: { insuranceId: insuranceId },
        });
      }
    }

    // STEP 2: Try to find appointment if not provided
    if (!appointmentId && patientId) {
      // Look for recent appointment for this patient and doctor
      const recentAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: dto.doctor_id,
          patientId: patientId,
          status: 'SCHEDULED',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (recentAppointment) {
        appointmentId = recentAppointment.id;
      }
    }

    // STEP 2.5: Calculate duration if not provided but timestamps are available
    let callDuration = dto.duration;
    if (!callDuration && dto.call_started_at && dto.call_ended_at) {
      const startTime = new Date(dto.call_started_at).getTime();
      const endTime = new Date(dto.call_ended_at).getTime();
      callDuration = Math.floor((endTime - startTime) / 1000); // Convert ms to seconds
      console.log(
        `Calculated call duration: ${callDuration} seconds (from ${dto.call_started_at} to ${dto.call_ended_at})`,
      );
    }

    // STEP 3: Save transcription with linked patient and appointment
    // If callSid is the literal template string (ElevenLabs UI issue) or null, generate a temp one
    const isInvalidSid =
      !dto.call_sid ||
      dto.call_sid === '{{conversation_id}}' ||
      dto.call_sid === '{{call_id}}';
    const callSid = isInvalidSid
      ? `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : dto.call_sid;

    if (isInvalidSid) {
      console.warn(
        `Received invalid callSid: "${dto.call_sid}". Using temporary ID: ${callSid}`,
      );
    }

    const callStatus = this.determineCallStatus(dto, appointmentId);

    // Extract reason for calling if not provided
    const reasonForCalling = 
      dto.reason_for_calling || 
      this.extractReasonForCallingFromText(dto.transcription || dto.summary || '');

    const transcription = await this.prisma.callTranscription.create({
      data: {
        doctorId: dto.doctor_id,
        patientId: patientId,
        callSid: callSid,
        phoneNumber: phoneNumber,
        duration: callDuration || dto.duration,
        audioUrl: dto.audio_url,
        transcription: dto.transcription,
        intent: (dto.intent?.toUpperCase() as any) || 'GENERAL',
        sentiment: (dto.sentiment?.toUpperCase() as any) || 'NEUTRAL',
        summary: dto.summary,
        appointmentId: appointmentId,
        fallbackNumber: dto.fallback_number || this.fallbackNumber,
        callStartedAt: dto.call_started_at
          ? new Date(dto.call_started_at)
          : null,
        callEndedAt: dto.call_ended_at ? new Date(dto.call_ended_at) : null,

        // New fields
        agentId: dto.agent_id,
        callStatus: callStatus,
        wasTransferred: dto.was_transferred || callStatus === 'TRANSFERRED',
        reasonForCalling: reasonForCalling,
        insuranceId: insuranceId,
        callerName: dto.caller_name || (patientInfo.firstName ? `${patientInfo.firstName} ${patientInfo.lastName || ''}`.trim() : undefined),
      },
    });

    return {
      success: true,
      transcription_id: transcription.id,
      patient_id: patientId,
      appointment_id: appointmentId,
      message: 'Call transcription saved successfully',
    };
  }

  // =============== POST-CALL WEBHOOK ===============
  async processPostCallWebhook(dto: ElevenLabsPostCallDto, doctorId?: string) {
    console.log('Post-call webhook received:', JSON.stringify(dto, null, 2));

    // 1. Normalize Data (Handle nested "data" wrapper from ElevenLabs)
    const realData = dto.data || dto;
    const incomingCallSid = realData.conversation_id;
    // Construct proxy Audio URL (easier for frontend to use)
    // Use environment variable or fallback to localhost for development
    const backendBaseUrl =
      this.config.get<string>('BACKEND_URL') || 'https://backend.docline.ai';
    const audioUrl = `${backendBaseUrl}/api/v1/ai-agent/audio/${incomingCallSid}`;

    // Map duration correctly (logs show 'call_duration_secs')
    let duration =
      realData.duration_seconds ||
      realData.metadata?.duration_seconds ||
      realData.metadata?.call_duration_secs ||
      realData.call_duration_secs;

    // Extract caller phone number with priority order:
    // 1. SIP metadata (actual caller's phone)
    // 2. Tool call parameters (phone provided during call)
    // 3. Extracted from transcription text
    let callerPhoneNumber: string | null = null;

    // Priority 1: Check SIP metadata for caller's actual phone number
    if (realData.sip_metadata?.from_number || dto.sip_metadata?.from_number) {
      callerPhoneNumber = realData.sip_metadata?.from_number || dto.sip_metadata?.from_number;
      console.log(`Caller phone from SIP metadata: ${callerPhoneNumber}`);
    }
    // Also check in main metadata object
    else if (realData.metadata?.from_number) {
      callerPhoneNumber = realData.metadata?.from_number;
      console.log(`Caller phone from metadata: ${callerPhoneNumber}`);
    }

    // Format transcript if available
    let transcriptionText = '';
    if (Array.isArray(realData.transcript)) {
      transcriptionText = realData.transcript
        .map((t) => `${t.role}: ${t.message}`)
        .join('\n');
    }

    // Priority 2: Extract from tool call parameters if not found in SIP metadata
    if (!callerPhoneNumber && realData.transcript) {
      try {
        const toolCall = realData.transcript.find((t) =>
          t.tool_calls?.some(
            (tc) =>
              tc.tool_name?.includes('Webhook') ||
              tc.tool_name?.includes('saveTranscription'),
          ),
        );
        if (toolCall) {
          const tc = toolCall.tool_calls.find(
            (tc) =>
              tc.tool_name?.includes('Webhook') ||
              tc.tool_name?.includes('saveTranscription'),
          );
          if (tc && tc.params_as_json) {
            const params = JSON.parse(tc.params_as_json);
            const phoneFromTool =
              params.patient_info?.phone || params.phone_number || params.phone;
            if (phoneFromTool) {
              callerPhoneNumber = phoneFromTool;
              console.log(`Caller phone from tool call: ${callerPhoneNumber}`);
            }
          }
        }
      } catch (err) {
        console.error('Error extracting phone from tool call:', err);
      }
    }

    // Priority 3: Extract from transcription text if still not found
    let extractedInfo: any = {};
    if (transcriptionText) {
      extractedInfo = this.extractPatientInfoFromText(transcriptionText);
      if (!callerPhoneNumber && extractedInfo.phone) {
        callerPhoneNumber = extractedInfo.phone;
        console.log(`Caller phone extracted from transcription: ${callerPhoneNumber}`);
      }
    }

    // 2. Identify the Record (Smart Linking)
    let existing = await this.prisma.callTranscription.findUnique({
      where: { callSid: incomingCallSid },
    });

    // If not found by ID, try finding by Phone Number extracted from tool calls or transcription
    // (This handles cases where the Tool saved with a "temp_" ID because config was broken)
    if (!existing && callerPhoneNumber) {
      console.log(`Attempting to link call via phone number: ${callerPhoneNumber}`);
      // Find most recent temp record for this phone (last 15 mins)
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      existing = await this.prisma.callTranscription.findFirst({
        where: {
          phoneNumber: callerPhoneNumber,
          callSid: { startsWith: 'temp_' },
          createdAt: { gt: fifteenMinsAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        console.log(
          `Found linked record via phone! ID: ${existing.id}, TempSID: ${existing.callSid}`,
        );
      }
    }

    if (existing) {
      // If we have an existing record, update it with real ID, audioUrl, duration, and phone
      await this.prisma.callTranscription.update({
        where: { id: existing.id },
        data: {
          audioUrl: audioUrl,
          duration: duration ? Math.round(duration) : undefined, // Ensure integer
          callSid: incomingCallSid, // UPDATE to the real ID so next time it matches!
          agentId: realData.agent_id || dto.agent_id || existing.agentId,
          // Update phone number if we found it and existing record doesn't have one
          phoneNumber: callerPhoneNumber || existing.phoneNumber,
          // Only update transcript if missing
          transcription: existing.transcription ? undefined : transcriptionText,
          // ALWAYS update summary with ElevenLabs summary when available (overwrite existing)
          summary: realData.analysis?.transcript_summary || existing.summary,
          // Merge insurance ID if missing
          insuranceId: existing.insuranceId || extractedInfo.insuranceId,
          // Update reason for calling if missing
          reasonForCalling: 
            existing.reasonForCalling || 
            this.extractReasonForCallingFromText(transcriptionText || realData.analysis?.transcript_summary || ''),
          // RE-DETERMINE STATUS: If it was MISSED before, it likely was because transcript was empty during call.
          // Now we have the full transcript and real duration, so let's fix it.
          callStatus: this.determineCallStatus({
            doctor_id: existing.doctorId,
            duration: duration ? Math.round(duration) : (existing.duration || 0),
            transcription: transcriptionText || existing.transcription || '',
            summary: realData.analysis?.transcript_summary || existing.summary || '',
            intent: existing.intent || undefined,
            call_status: undefined, // Let it calculate based on text
          }),
          callerName: existing.callerName || (extractedInfo.firstName ? `${extractedInfo.firstName} ${extractedInfo.lastName || ''}`.trim() : undefined),
        },
      });
      console.log(
        `Updated CallTranscription ${existing.id} with audio and duration.`,
      );
      return { success: true, message: 'Updated existing transcription' };
    }

    // If still no record, create a new one (Fallback)
    const finalDoctorId = doctorId || dto.doctor_id;

    if (!finalDoctorId) {
      console.warn('Cannot create new transcription: Missing Doctor ID');
      return { success: false, message: 'Missing Doctor ID' };
    }

    // Use determineCallStatus logic for fallback too
    let detectedIntent = 'GENERAL';
    const summaryTitle =
      realData.analysis?.call_summary_title?.toUpperCase() || '';
    if (summaryTitle.includes('BOOK')) detectedIntent = 'BOOK_APPOINTMENT';
    else if (summaryTitle.includes('INQUIRY')) detectedIntent = 'INQUIRY';
    else if (summaryTitle.includes('AVAILABILITY'))
      detectedIntent = 'CHECK_AVAILABILITY';

    const tempDto: any = {
      duration: duration ? Math.round(duration) : 0,
      transcription: transcriptionText,
      summary: realData.analysis?.transcript_summary,
      intent: detectedIntent,
    };

    const callStatus = this.determineCallStatus(tempDto);

    // Find patient for the fallback record
    let patientId: string | null = null;
    if (callerPhoneNumber) {
      const patient = await this.prisma.patient.findFirst({
        where: { phone: callerPhoneNumber },
      });
      if (patient) {
        patientId = patient.id;
        console.log(`Linked fallback call to patient: ${patientId}`);
      }
    }

    await this.prisma.callTranscription.create({
      data: {
        doctorId: finalDoctorId,
        patientId,
        callSid: incomingCallSid,
        agentId: realData.agent_id || dto.agent_id,
        phoneNumber: callerPhoneNumber,
        duration: tempDto.duration,
        audioUrl: audioUrl,
        transcription: tempDto.transcription,
        summary: tempDto.summary,
        callStatus: callStatus,
        wasTransferred: callStatus === 'TRANSFERRED',
        intent: detectedIntent as any,
        sentiment:
          (realData.analysis?.call_sentiment?.toUpperCase() as any) ||
          'NEUTRAL',
        insuranceId: extractedInfo.insuranceId,
        reasonForCalling: this.extractReasonForCallingFromText(transcriptionText || realData.analysis?.transcript_summary || ''),
      },
    });

    console.log(`Created NEW CallTranscription for SID ${incomingCallSid}`);
    return { success: true, message: 'Created new transcription' };
  }

  async getCallAudio(conversationId: string) {
    // Detect EU residency key and use correct endpoint
    const isEuKey = this.elevenLabsApiKey?.includes('_residency_eu');
    const baseUrl = isEuKey
      ? 'https://api.eu.residency.elevenlabs.io'
      : 'https://api.elevenlabs.io';
    const url = `${baseUrl}/v1/convai/conversations/${conversationId}/audio`;

    try {
      const response = await axios.get(url, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
        },
        responseType: 'stream',
      });
      return response.data;
    } catch (error) {
      console.error(
        'Error fetching audio from ElevenLabs:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Helper method to extract patient info from conversation text
  private extractPatientInfoFromText(text: string): {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    insuranceId?: string;
  } {
    const result: { 
      firstName?: string; 
      lastName?: string; 
      email?: string;
      phone?: string;
      insuranceId?: string;
    } = {};

    const digitWords: Record<string, string> = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9'
    };

    // Extract email using regex
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) {
      result.email = emailMatch[0];
    }

    // Extract phone number - support multiple formats
    // 1. Spoken format with explicit trigger (highest priority)
    const explicitPhonePatterns = [
      /(?:phone\s+number\s+is|my\s+number\s+is|call\s+me\s+at)\s+([zero|one|two|three|four|five|six|seven|eight|nine|\s|,]+)/i,
    ];

    for (const pattern of explicitPhonePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let phoneDigits = '';
        const words = match[1].toLowerCase().split(/[\s,]+/);
        for (const word of words) {
          if (digitWords[word.trim()]) {
            phoneDigits += digitWords[word.trim()];
          }
        }
        if (phoneDigits.length >= 10 && phoneDigits.length <= 14) {
          result.phone = phoneDigits;
          break;
        }
      }
    }

    if (!result.phone) {
      // 2. Standard digits (with optional +, spaces, or hyphens)
      // Tightened: must NOT be exactly 10 digits if we already looked for insurance, 
      // but here we just ensure it's a plausible phone number sequence.
      // Usually phone numbers in this context are 11 digits (Bangladesh) or 10.
      const standardPhoneMatch = text.match(/(?:\+?88)?01[3-9]\d{8}/); // Specific to BD mobile numbers for better accuracy
      if (standardPhoneMatch) {
        result.phone = standardPhoneMatch[0].replace(/[\s-]/g, '');
      } else {
        // Fallback to broader digit sequence if not found
        const broaderMatch = text.match(/(?:\+?88)?0?\d{9,13}/);
        if (broaderMatch && broaderMatch[0] !== result.insuranceId) {
          result.phone = broaderMatch[0].replace(/[\s-]/g, '');
        }
      }
    }
    
    // 1. Spoken format: "one zero five..."
    const insurancePatterns = [
      /(?:insurance\s+id\s+is|id\s+number\s+is|insurance\s+is|id\s+as)\s+([zero|one|two|three|four|five|six|seven|eight|nine|\s|,]+)/i,
    ];

    for (const pattern of insurancePatterns) {
      const spokenMatch = text.match(pattern);
      if (spokenMatch) {
        const spokenText = spokenMatch[1];
        let idDigits = '';
        const words = spokenText.toLowerCase().split(/[\s,]+/);
        for (const word of words) {
          if (digitWords[word.trim()]) {
            idDigits += digitWords[word.trim()];
          }
        }
        if (idDigits.length === 10) {
          result.insuranceId = idDigits;
          break;
        }
      }
    }

    // 2. Direct digit sequence (10 digits) if not found by spoken pattern
    if (!result.insuranceId) {
      const digitMatch = text.match(/\b\d{10}\b/);
      if (digitMatch) {
        result.insuranceId = digitMatch[0];
      }
    }

    // Extract name patterns
    // Priority 1: Explicit triggers like "My name is...", "I am...", "This is..."
    const explicitPatterns = [
      /(?:my\s+full\s+name\s+is|my\s+name\s+is|first\s+name\s+and\s+last\s+name\s+is)\s+([A-Z][a-z.]+(?:\s+[A-Z][a-z.]+)+)/i,
      /(?:i\s+am|i'm|this\s+is)\s+([A-Z][a-z.]+(?:\s+[A-Z][a-z.]+)+)/i,
    ];

    const nameBlocklist = [
      'an', 'urgent', 'and', 'a', 'the', 'task', 'medical', 'appointment',
      'booking', 'insurance', 'doctor', 'called', 'calling', 'help', 'assist',
      'order', 'medicine', 'delivery', 'test', 'result', 'high', 'priority',
      'actually', 'just', 'please', 'morning', 'afternoon', 'evening'
    ];

    const boundaryStopWords = [
      'and', 'from', 'my', 'for', 'with', 'at', 'about', 'is', 'want'
    ];

    for (const pattern of explicitPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let fullName = match[1].trim();
        
        // Smart Slicing: Cut the name if a boundary stop word is found
        const words = fullName.split(/\s+/);
        const cleanedParts: string[] = [];
        
        for (const word of words) {
          if (boundaryStopWords.includes(word.toLowerCase())) break;
          cleanedParts.push(word);
        }
        
        if (cleanedParts.length === 0) continue;
        
        fullName = cleanedParts.join(' ');

        // Blocklist Check
        const isBlocked = cleanedParts.some(part => 
          nameBlocklist.includes(part.toLowerCase())
        );
        if (isBlocked) continue;

        // Validation: Ensure significant parts exist
        if (cleanedParts.length >= 1) {
          result.firstName = cleanedParts[0];
        }
        if (cleanedParts.length >= 2) {
          result.lastName = cleanedParts.slice(1).join(' ');
        }
        
        if (result.firstName) break;
      }
    }

    // Fallback: If no explicit match, look for Capitalized Name pairs that aren't blocked
    if (!result.firstName) {
      const genericPattern = /\b([A-Z][a-z.]+\s+[A-Z][a-z.]+)\b/g;
      let match;
      while ((match = genericPattern.exec(text)) !== null) {
        const fullName = match[1];
        const parts = fullName.split(/\s+/);
        
        const isBlocked = parts.some(part => 
          nameBlocklist.includes(part.toLowerCase())
        );
        
        if (!isBlocked) {
          result.firstName = parts[0];
          result.lastName = parts[1];
          break;
        }
      }
    }

    return result;
  }

  // Helper method to extract reason for calling from transcript or summary
  private extractReasonForCallingFromText(text: string): string | null {
    if (!text) return null;

    // Look for common "I want to...", "I need...", "Reason for calling is..." patterns
    const reasonPatterns = [
      /(?:reason\s+for\s+calling\s+is|purpose\s+of\s+the\s+call\s+is)\s+([^.\n]{5,})/i,
      /(?:i\s+want\s+to|i\s+need\s+to|i\s+would\s+like\s+to|please\s+help\s+me\s+with)\s+([^.\n]{5,})/i,
      /user:\s+(?:i\s+want\s+to|i\s+need\s+to|i\s+would\s+like\s+to)\s+([^.\n]{5,})/i,
    ];

    const personalInfoBoundaries = [
      'and my name', 'and my email', 'and my insurance', 
      'and my phone', 'and my number', 'my name is',
      'my email is', 'and insurance'
    ];

    for (const pattern of reasonPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let reason = match[1].trim();
        
        // Smart Slicing: Cut the reason if it starts pivoting to personal info
        const lowerReason = reason.toLowerCase();
        for (const boundary of personalInfoBoundaries) {
          const index = lowerReason.indexOf(boundary);
          if (index !== -1) {
            reason = reason.substring(0, index).trim();
          }
        }

        // Final cleanup: remove trailing "and"
        if (reason.toLowerCase().endsWith(' and')) {
          reason = reason.substring(0, reason.length - 4).trim();
        }

        // Phase 6 Cleanup: Strip leading filler words
        const fillerWords = [
          'actually', 'uh', 'um', 'to', 'just', 'so', 'like', 'actually,', 'basis', 'urgent'
        ];
        
        let words = reason.split(/\s+/);
        while (words.length > 0 && fillerWords.includes(words[0].toLowerCase().replace(/[^a-z]/g, ''))) {
          words.shift();
        }
        reason = words.join(' ');

        if (reason.length >= 3) {
          // Capitalize first letter for better display
          reason = reason.charAt(0).toUpperCase() + reason.slice(1);
          return reason;
        }
      }
    }

    return null;
  }

  // =============== GET PATIENT HISTORY ===============
  async getPatientHistory(patientId: string) {
    const history = await this.prisma.callTranscription.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      data: history,
    };
  }

  // =============== INTENT HANDLERS ===============
  private async handleBookingIntent(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    // If start_time and appointment_date are provided, book directly
    if ((payload.start_time || payload.requested_time) && (payload.appointment_date || payload.requested_date)) {
      try {
        const booking = await this.createBooking({
          doctor_id: payload.doctor_id,
          patient_id: payload.patient_id,
          patient_info: payload.patient_info,
          start_time: payload.start_time || payload.requested_time,
          appointment_date: payload.appointment_date || payload.requested_date,
          appointment_type_id: payload.appointment_type_id,
        });

        return {
          reply_text: booking.is_new_patient
            ? `Great! I've registered you and booked your appointment for ${booking.appointment.date} at ${booking.appointment.time}. You'll receive a confirmation shortly.`
            : `Perfect! Your appointment is confirmed for ${booking.appointment.date} at ${booking.appointment.time}. See you then!`,
          action: 'booking_confirmed',
          booking_id: booking.booking_id,
          is_new_patient: booking.is_new_patient,
          success: true,
          data: booking.appointment,
        };
      } catch (error) {
        // If booking fails, return specific error message if available
        const errorMessage =
          error instanceof BadRequestException
            ? error.message
            : "I'm sorry, that slot is no longer available. Let me find you another time.";

        return {
          reply_text: errorMessage,
          action: 'slot_unavailable',
        };
      }
    }

    // Otherwise, suggest available slots
    try {
      const slots = await this.suggestAlternativeSlots({
        doctor_id: payload.doctor_id,
        requested_slot:
          payload.requested_time ||
          payload.requested_date ||
          new Date().toISOString(),
      });

      if (slots.alternative_slots.length > 0) {
        const slotTexts = slots.alternative_slots
          .slice(0, 3)
          .map((s) => `${s.date} at ${s.time}`)
          .join(', or ');

        return {
          reply_text: `I have availability on ${slotTexts}. Which time works best for you?`,
          // Return ALL slots (up to 20) in the data payload so the LLM knows about them
          suggested_slots: slots.alternative_slots.slice(0, 20),
          action: 'ask_slot',
        };
      }
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        error.message === 'Invalid date format'
      ) {
        return {
          reply_text:
            "I didn't quite catch the date properly. Could you please repeat the date you'd like to book?",
          action: 'ask_date',
        };
      }
    }

    return {
      reply_text:
        "I apologize, but we don't have availability in the near future. Would you like me to check next week, or connect you with our assistant?",
      action: 'no_availability',
      fallback_number: this.fallbackNumber,
    };
  }

  private async handleAvailabilityIntent(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    const availability = await this.getAvailableSlots({
      doctor_id: payload.doctor_id,
      date: payload.requested_date || new Date().toISOString().split('T')[0],
    });

    if (availability.summary.available > 0) {
      const slotList = availability.availableSlots
        .slice(0, 3)
        .map((s: any) => `${s.startTime} to ${s.endTime}`)
        .join(', ');

      return {
        reply_text: `Yes, we have ${availability.summary.available} slots available. Available times include: ${slotList}. Would you like to book one of these?`,
        suggested_slots: availability.availableSlots.slice(0, 3).map((s: any) => ({
          date:
            payload.requested_date || new Date().toISOString().split('T')[0],
          time: s.startTime,
        })),
        action: 'show_slots',
      };
    }

    // If no slots on requested date, look for next available days (up to 7 days ahead)
    const MAX_DAYS_TO_CHECK = 7;
    const requestedDate = new Date(payload.requested_date || new Date());
    
    for (let i = 1; i <= MAX_DAYS_TO_CHECK; i++) {
      const nextDate = new Date(requestedDate);
      nextDate.setDate(nextDate.getDate() + i);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      
      const alternativeAvailability = await this.getAvailableSlots({
        doctor_id: payload.doctor_id,
        date: nextDateStr,
        appointment_type_id: payload.appointment_type_id,
      });

      if (alternativeAvailability.summary.available > 0) {
        const slotList = alternativeAvailability.availableSlots
          .slice(0, 3)
          .map((s: any) => `${s.startTime} to ${s.endTime}`)
          .join(', ');

        const formattedDate = nextDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric' 
        });

        return {
          reply_text: `Unfortunately, we're fully booked on your requested date. However, I found ${alternativeAvailability.summary.available} slots on ${formattedDate}. Available times include: ${slotList}. Would any of those work for you?`,
          suggested_slots: alternativeAvailability.availableSlots.slice(0, 3).map((s: any) => ({
            date: nextDateStr,
            time: s.startTime,
          })),
          action: 'show_slots',
        };
      }
    }

    return {
      reply_text:
        "I'm sorry, but we seem to be fully booked for the next week. Would you like me to check for dates further out in the month?",
      action: 'suggest_alternatives',
    };
  }

  private async handleRescheduleIntent(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    // If all reschedule parameters provided, execute the reschedule
    if (payload.booking_id && (payload.start_time || payload.requested_time) && (payload.appointment_date || payload.requested_date)) {
      try {
        const result = await this.updateBooking({
          booking_id: payload.booking_id,
          new_start_time: payload.start_time || payload.requested_time,
          new_date: payload.appointment_date || payload.requested_date,
          appointment_type_id: payload.appointment_type_id,
        });

        return {
          reply_text: `Your appointment has been successfully rescheduled for ${result.appointment.date} at ${result.appointment.time}.`,
          action: 'reschedule_confirmed',
          booking_id: result.booking_id,
          success: true,
          data: result.appointment,
        };
      } catch (error) {
        const errorMessage =
          error instanceof BadRequestException || error.message
            ? error.message
            : "I'm sorry, that slot is no longer available. Let me find you another time.";

        return {
          reply_text: errorMessage,
          action: 'slot_unavailable',
        };
      }
    }

    // If booking_id missing, ask for it
    if (!payload.booking_id) {
      return {
        reply_text:
          'I can help you reschedule. Can you provide your appointment confirmation number or the date of your current appointment?',
        action: 'ask_booking_id',
      };
    }

    // Suggest alternative slots
    const slots = await this.suggestAlternativeSlots({
      doctor_id: payload.doctor_id,
      requested_slot: payload.requested_time || new Date().toISOString(),
      appointment_type_id: payload.appointment_type_id,
    });

    if (slots.alternative_slots.length > 0) {
      const slotTexts = slots.alternative_slots
        .slice(0, 3)
        .map((s: any) => `${s.date} at ${s.time}`)
        .join(', or ');

      return {
        reply_text: `I can reschedule your appointment. Available times are: ${slotTexts}. Which would you prefer?`,
        suggested_slots: slots.alternative_slots.slice(0, 3),
        action: 'ask_new_slot',
        booking_id: payload.booking_id,
      };
    }

    return {
      reply_text:
        "I don't have immediate availability. Would you like me to connect you with our assistant to find a suitable time?",
      action: 'transfer_to_assistant',
      fallback_number: this.fallbackNumber,
    };
  }

  private async handleCancelIntent(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    // Extract phone number from either location
    const phoneNumber = payload.phone_number || payload.patient_info?.phone;

    // Try to cancel with available information
    if (
      payload.booking_id ||
      phoneNumber ||
      payload.appointment_date ||
      payload.requested_date
    ) {
      try {
        const result = await this.cancelBooking({
          booking_id: payload.booking_id,
          phone_number: phoneNumber,
          appointment_date: payload.appointment_date || payload.requested_date,
        });

        return {
          reply_text: `Your appointment has been successfully cancelled. If you need to book a new appointment in the future, feel free to call back.`,
          action: 'cancellation_confirmed',
          booking_id: result.appointment.id,
          success: true,
          data: result.appointment,
        };
      } catch (error) {
        return {
          reply_text:
            error.message ||
            "I'm sorry, I couldn't find that appointment. Could you verify the booking ID or appointment date?",
          action: 'cancellation_failed',
          success: false,
        };
      }
    }

    // If no identifying information provided, ask for it
    return {
      reply_text:
        'I can help you cancel your appointment. Can you provide your appointment confirmation number or the date of your appointment?',
      action: 'ask_booking_id',
    };
  }

  private async handleInquiryIntent(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    const kbResponse = await this.queryKnowledgeBase({
      doctor_id: payload.doctor_id,
      query: payload.query || '',
    });

    return {
      reply_text: kbResponse.answer,
      action: 'provide_info',
      data: {
        category: kbResponse.category,
        question: kbResponse.question,
      },
    };
  }

  // =============== CREATE AGENT TASK ===============
  async createAgentTask(dto: AgentCreateTaskDto) {
    const {
      doctor_id,
      title,
      description,
      phone_number,
      insurance_id,
      priority,
      time,
      due_date,
    } = dto;

    let patientId: string | null = null;

    // Try to find patient by phone number if provided
    if (phone_number) {
      const patient = await this.prisma.patient.findFirst({
        where: { phone: phone_number },
      });
      if (patient) {
        patientId = patient.id;
      }
    }

    // Map priority "MEDIUM" to "NORMAL" for Flag enum if needed
    let mappedPriority = priority?.toUpperCase();
    if (mappedPriority === 'MEDIUM') {
      mappedPriority = 'NORMAL';
    }

    // Create the task with status TODO
    const task = await this.prisma.task.create({
      data: {
        doctorId: doctor_id,
        title,
        description,
        status: 'TODO',
        priority: mappedPriority as any,
        time,
        dueDate: due_date ? new Date(due_date) : undefined,
        patientId,
        insuranceId: insurance_id,
        phone: phone_number,
        callerName: dto.caller_name,
      },
    });

    return {
      success: true,
      data: task,
      message: 'Task created successfully',
    };
  }
  // =============== CALL REVIEW ===============
  async getUnreviewedCallCount(doctorId: string) {
    if (!doctorId) {
      throw new BadRequestException('Doctor ID is required');
    }

    const count = await this.prisma.callTranscription.count({
      where: {
        doctorId,
        isReviewed: false,
      },
    });

    return {
      success: true,
      count,
    };
  }

  async bulkUpdateCallReviewStatus(ids: string[], isReviewed: boolean, doctorId: string) {
    // Verify all transcriptions belong to the doctor
    const transcriptions = await this.prisma.callTranscription.findMany({
      where: {
        id: { in: ids },
        doctorId,
      },
    });

    if (transcriptions.length !== ids.length) {
      throw new BadRequestException('Some call transcriptions not found or do not belong to this doctor');
    }

    const updated = await this.prisma.callTranscription.updateMany({
      where: {
        id: { in: ids },
        doctorId,
      },
      data: { isReviewed },
    });

    return {
      success: true,
      updatedCount: updated.count,
      message: `${updated.count} call review statuses updated successfully`,
    };
  }

  // =============== PERFORMANCE STATISTICS ===============
  async getAgentPerformanceStats(doctorId?: string, agentId?: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const where: any = {};
    if (doctorId) where.doctorId = doctorId;
    if (agentId) where.agentId = agentId;

    // Current 30 days metrics
    const currentMetrics = await this.prisma.callTranscription.findMany({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        duration: true,
        appointmentId: true,
        wasTransferred: true,
        createdAt: true,
      },
    });

    // Previous 30 days metrics for comparison
    const previousMetrics = await this.prisma.callTranscription.findMany({
      where: {
        ...where,
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      select: {
        duration: true,
        appointmentId: true,
        wasTransferred: true,
      },
    });

    const calculateStats = (metrics: any[]) => {
      const total = metrics.length;
      if (total === 0)
        return { total: 0, successRate: 0, avgDuration: 0, escalationRate: 0 };

      const successful = metrics.filter((m) => m.appointmentId).length;
      const transferred = metrics.filter((m) => m.wasTransferred).length;
      const totalDuration = metrics.reduce(
        (acc, m) => acc + (m.duration || 0),
        0,
      );

      return {
        total,
        successRate: (successful / total) * 100,
        avgDuration: totalDuration / total / 60, // in minutes
        escalationRate: (transferred / total) * 100,
      };
    };

    const currentStats = calculateStats(currentMetrics);
    const previousStats = calculateStats(previousMetrics);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // 7-day trend data
    const trendData: any[] = [];
    const counts: number[] = [];
    const dates: Date[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await this.prisma.callTranscription.count({
        where: {
          ...where,
          createdAt: { gte: date, lt: nextDate },
        },
      });
      counts.push(count);
    }

    const maxCalls = Math.max(...counts, 0);

    for (let i = 0; i < counts.length; i++) {
      const date = dates[i];
      const count = counts[i];
      trendData.push({
        day: date
          .toLocaleDateString('en-US', { weekday: 'short' })
          .toUpperCase(),
        date: date.toISOString().split('T')[0],
        calls: count,
        valuePercentage:
          maxCalls > 0 ? parseFloat(((count / maxCalls) * 100).toFixed(1)) : 0,
      });
    }

    return {
      success: true,
      data: {
        totalCalls: {
          value: currentStats.total,
          change: calculateChange(currentStats.total, previousStats.total),
        },
        appointmentSuccessRate: {
          value: parseFloat(currentStats.successRate.toFixed(1)),
          change: calculateChange(
            currentStats.successRate,
            previousStats.successRate,
          ),
        },
        avgCallDuration: {
          value: parseFloat(currentStats.avgDuration.toFixed(1)),
          change: calculateChange(
            currentStats.avgDuration,
            previousStats.avgDuration,
          ),
        },
        escalationRate: {
          value: parseFloat(currentStats.escalationRate.toFixed(1)),
          change: calculateChange(
            currentStats.escalationRate,
            previousStats.escalationRate,
          ),
        },
        callVolumeTrend: trendData,
      },
    };
  }
}
