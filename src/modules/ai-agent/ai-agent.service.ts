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
import { NotificationHelperService } from '../notification/notification-helper.service';

import axios from 'axios';

@Injectable()
export class AiAgentService {
  private readonly twilioNumber: string;
  private readonly fallbackNumber: string;
  private readonly elevenLabsApiKey: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notificationHelper: NotificationHelperService,
  ) {
    this.twilioNumber = '+15095091987'; // Twilio number from client
    this.fallbackNumber = '+8801742460399'; // Physical assistant number
    this.elevenLabsApiKey =
      this.config.get<string>('ELEVENLABS_WEBHOOK_API_KEY') || '';
  }

  // =============== HELPER METHODS ===============
  
  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation based on common prefix/suffix and character matching
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    // Calculate Levenshtein distance (simplified)
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
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

    // Enhanced keyword matching for natural language queries
    const queryLower = dto.query.toLowerCase();
    const queryWords = queryLower.split(/\s+/); // Split query into words

    const matches = kbEntries.filter((entry) => {
      const questionMatch = entry.question.toLowerCase().includes(queryLower);
      const answerMatch = entry.answer.toLowerCase().includes(queryLower);

      // Improved keyword matching:
      // Check if any keyword appears in the query OR if any query word matches a keyword
      const keywordMatch = entry.keywords.some((kw) => {
        const keyword = kw.toLowerCase();
        // Check if query contains the keyword
        if (queryLower.includes(keyword)) return true;
        // Check if keyword contains any word from the query (for multi-word keywords)
        if (keyword.includes(' ')) {
          const keywordWords = keyword.split(/\s+/);
          return keywordWords.some(kword => queryWords.includes(kword));
        }
        // Check if any query word matches the keyword
        return queryWords.includes(keyword);
      });

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
  private normalizeInsuranceId(id: string | undefined): string | undefined {
    if (!id) return undefined;
    return id.trim().replace(/\D/g, '');
  }

  async getAvailableSlots(dto: SlotQueryDto & { step?: number }) {
    const { doctor_id, date, appointment_type_id, step: customStep } = dto;

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctor_id },
      include: { doctorRegionalSettings: true }
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const queryDate = date ? new Date(date) : new Date();
    const dayOfWeek = queryDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase() as WeekDay;

    const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { doctorId_day: { doctorId: doctor_id, day: dayOfWeek } },
    });

    if (!schedule || schedule.isClosed) {
      return { summary: { total: 0, available: 0, unavailable: 0 }, availableSlots: [], unavailableSlots: [] };
    }

    // Check if the date falls within an absence period
    const checkDate = new Date(queryDate);
    checkDate.setHours(0, 0, 0, 0);

    const absence = await this.prisma.doctorAbsence.findFirst({
      where: {
        doctorId: doctor_id,
        fromDate: { lte: checkDate },
        toDate: { gte: checkDate },
      },
    });

    if (absence) {
      // Doctor is absent on this date, return empty slots
      return {
        summary: { total: 0, available: 0, unavailable: 0 },
        availableSlots: [],
        unavailableSlots: [],
        absenceInfo: {
          isAbsent: true,
          fromDate: absence.fromDate,
          toDate: absence.toDate,
          reason: absence.reason,
        }
      };
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

    const dayStart = new Date(queryDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(queryDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor_id,
        appointmentDate: {
          gte: dayStart,
          lte: dayEnd,
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

      // Use 5-minute granularity by default to allow "any time" booking
      // Use customStep if provided (e.g. for broader suggestions)
      const step = customStep || 5;

      while (current + duration <= endLimit) {
        const slotEnd = current + duration;
        if (isSlotAvailable(current, slotEnd)) {
          slots.push({
            startTime: minutesToTime(current),
            endTime: minutesToTime(slotEnd),
            isAvailable: true
          });
        }
        current += step; // Granular step
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
      // Use a larger step (30 mins) for suggestions to show diverse times
      const slots = await this.getAvailableSlots({
        doctor_id,
        date: checkDate.toISOString(),
        appointment_type_id,
        step: 30
      });
      for (const slot of slots.availableSlots) {
        alternatives.push({
          date: checkDate.toDateString(),
          time: slot.startTime,
          originalDate: checkDate.toISOString().split('T')[0]
        });
        if (alternatives.length >= 20) break;
      }
      if (alternatives.length >= 20) break;
    }

    // Sort by proximity to requested slot if provided
    if (requested_slot && alternatives.length > 0) {
      // requested_slot could be a full ISO date or just a time
      const requestedTimeStr = requested_slot.includes('T')
        ? requested_slot.split('T')[1].substring(0, 5)
        : requested_slot;

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

      const targetMins = parseTimeToMinutes(requestedTimeStr);
      alternatives.sort((a, b) => {
        const diffA = Math.abs(parseTimeToMinutes(a.time) - targetMins);
        const diffB = Math.abs(parseTimeToMinutes(b.time) - targetMins);
        return diffA - diffB;
      });
    }

    return { alternative_slots: alternatives.slice(0, 20) };
  }

  // =============== CREATE BOOKING ===============
  async createBooking(dto: any) {
    const { doctor_id, patient_id, appointment_type_id, start_time, appointment_date, patient_info } = dto;

    const apptDate = new Date(appointment_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (new Date(apptDate).setHours(0, 0, 0, 0) < now.getTime()) throw new BadRequestException('Cannot book in the past');

    let patientId = patient_id;
    let isNewPatient = false;

    // Caller number fallback from payload if explicitly provided
    const callerNumber = dto.caller_phone_number;

    if (!patientId) {
      let existingPatient;

      // Priority 1: Lookup by insurance ID
      const insuranceId = this.normalizeInsuranceId(patient_info?.insuranceId);
      if (insuranceId) {
        existingPatient = await this.prisma.patient.findUnique({
          where: { insuranceId: insuranceId },
        });
      }

      // Priority 2: Fallback to explicit patient info phone
      if (!existingPatient && patient_info?.phone) {
        existingPatient = await this.prisma.patient.findFirst({
          where: { phone: patient_info.phone },
        });
      }

      // Priority 3: Fallback to caller phone number (SID info)
      if (!existingPatient && callerNumber) {
        existingPatient = await this.prisma.patient.findFirst({
          where: { phone: callerNumber },
        });
      }

      if (existingPatient) {
        patientId = existingPatient.id;

        // Sync insurance ID if provided and missing
        if (patient_info?.insuranceId && !existingPatient.insuranceId) {
          await this.prisma.patient.update({
            where: { id: patientId },
            data: { insuranceId: patient_info.insuranceId }
          });
        }
      } else {
        // If no patient found, we need at least one identifier to create one
        const finalPhone = patient_info?.phone || callerNumber;
        if (!finalPhone && !patient_info?.insuranceId) {
          throw new BadRequestException('Phone number or Insurance ID required for registration');
        }

        const newPatient = await this.prisma.patient.create({
          data: {
            firstName: patient_info?.firstName,
            lastName: patient_info?.lastName,
            phone: finalPhone,
            email: patient_info?.email,
            insuranceId: this.normalizeInsuranceId(patient_info?.insuranceId) || null,
            dob: patient_info?.dob ? new Date(patient_info?.dob) : null,
            gender: patient_info?.gender?.toUpperCase() as any,
          },
        });
        patientId = newPatient.id;
        isNewPatient = true;
      }
    }

    // Determine endTime
    const type = await this.prisma.appointmentType.findUnique({ where: { id: appointment_type_id || '' } });
    if (!type) throw new BadRequestException('Invalid appointment type');

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

    const startMins = parseTimeToMinutes(start_time);
    const endMins = startMins + type.duration;
    const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    // Conflict & Half-day check
    const dayOfWeek = apptDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase() as WeekDay;
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctor_id },
      include: { doctorRegionalSettings: true }
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { doctorId_day: { doctorId: doctor_id, day: dayOfWeek } },
    });
    if (!schedule || schedule.isClosed) throw new BadRequestException('Doctor closed on this day');

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
        if (startMins >= (sh * 60 + sm) && endMinsFull <= (eh * 60 + em)) {
          fitsInHalf = true;
          break;
        }
      }
    }
    if (!fitsInHalf) throw new BadRequestException('Appointment must fit in a half-day block');

    // Check if appointment date falls within an absence period
    const apptCheckDate = new Date(apptDate);
    apptCheckDate.setHours(0, 0, 0, 0);

    const absenceCheck = await this.prisma.doctorAbsence.findFirst({
      where: {
        doctorId: doctor_id,
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
            doctorId: doctor_id,
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

    // Conflict check
    const bufferMap: Record<BufferTime, number> = {
      Minutes_5: 5, Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30,
    };
    const buffer = doctor.doctorRegionalSettings ? bufferMap[doctor.doctorRegionalSettings.bufferTimeBetween] || 0 : 0;

    const checkDate = appointment_date ? new Date(appointment_date) : new Date();
    const dayStart = new Date(checkDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(checkDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existing = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor_id,
        appointmentDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 'SCHEDULED',
      },
    });

    for (const appt of existing) {
      if (appt.startTime && appt.endTime) {
        const eStart = parseTimeToMinutes(appt.startTime);
        const eEnd = parseTimeToMinutes(appt.endTime);
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

    // Set status to RESCHEDULED
    updateData.status = 'RESCHEDULED';

    // Recalculate endTime if needed
    if (dto.new_start_time || dto.appointment_type_id) {
      const typeId = dto.appointment_type_id || appointment.appointmentTypeId;
      const type = await this.prisma.appointmentType.findUnique({ where: { id: typeId || '' } });
      if (type) {
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
        const st = dto.new_start_time || appointment.startTime || '00:00';
        const endMins = parseTimeToMinutes(st) + type.duration;
        updateData.endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
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

        const dayOfWeek = new Date(checkDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase() as WeekDay;
        const doctor = await this.prisma.doctor.findUnique({
          where: { id: appointment.doctorId || '' },
          include: { doctorRegionalSettings: true }
        });

        const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
          where: { doctorId_day: { doctorId: appointment.doctorId || '', day: dayOfWeek } },
        });
        if (!schedule || schedule.isClosed) throw new BadRequestException('Doctor closed on this day');

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

        const startMins = parseTimeToMinutes(checkStart);
        const endMinsFull = startMins + type.duration;

        let fitsInHalf = false;
        const halves = [
          { start: schedule.firstHalfStartTime, end: schedule.firstHalfEndTime },
          { start: schedule.secondHalfStartTime, end: schedule.secondHalfEndTime }
        ];
        for (const half of halves) {
          if (half.start && half.end) {
            const shMins = parseTimeToMinutes(half.start);
            const ehMins = parseTimeToMinutes(half.end);
            if (startMins >= shMins && endMinsFull <= ehMins) {
              fitsInHalf = true;
              break;
            }
          }
        }
        if (!fitsInHalf) throw new BadRequestException('Appointment must fit in a half-day block');

        // Check if reschedule date falls within an absence period
        const rescheduleCheckDate = new Date(checkDate);
        rescheduleCheckDate.setHours(0, 0, 0, 0);

        const absenceCheck = await this.prisma.doctorAbsence.findFirst({
          where: {
            doctorId: appointment.doctorId || '',
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
                doctorId: appointment.doctorId || '',
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

        const bufferMap: Record<BufferTime, number> = {
          Minutes_5: 5, Minutes_10: 10, Minutes_15: 15, Minutes_20: 20, Minutes_30: 30,
        };
        const buffer = doctor?.doctorRegionalSettings ? bufferMap[doctor.doctorRegionalSettings.bufferTimeBetween] || 0 : 0;

        const dayStart = new Date(checkDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDate);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const existing = await this.prisma.appointment.findMany({
          where: {
            doctorId: appointment.doctorId,
            appointmentDate: {
              gte: dayStart,
              lte: dayEnd,
            },
            status: 'SCHEDULED',
            id: { not: bookingId }
          }
        });

        for (const appt of existing) {
          if (appt.startTime && appt.endTime) {
            const eStart = parseTimeToMinutes(appt.startTime);
            const eEnd = parseTimeToMinutes(appt.endTime);
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

    // Insurance ID: Priority 1: DTO, Priority 2: Extracted
    let insuranceId: string | undefined = this.normalizeInsuranceId(dto.insurance_id);

    // Extract patient info from transcription/summary (including phone, name, email)
    const patientInfo = this.extractPatientInfoFromText(
      dto.transcription || dto.summary || '',
    );

    if (!insuranceId && patientInfo.insuranceId) {
      insuranceId = this.normalizeInsuranceId(patientInfo.insuranceId);
      console.log(`Using extracted insuranceId for transcription save: ${insuranceId}`);
    }

    // Use extracted phone if not provided in DTO
    // For demo calls, set phone to null if no real phone number found
    let phoneNumber: string | null = dto.phone_number || patientInfo.phone || null;
    
    // Check if this is a demo call and phone number is actually an insurance ID
    if (phoneNumber && phoneNumber.length >= 9 && /^\d+$/.test(phoneNumber)) {
      // If phone number looks like an insurance ID (9-10 digits) and we have an insurance ID too,
      // check if it's a full match or partial match (missing digits)
      if (insuranceId) {
        const isFullMatch = phoneNumber === insuranceId;
        
        // Enhanced partial match detection:
        // 1. Check if one contains the other
        // 2. Check if they have high similarity (missing/extra digits)
        let isPartialMatch = insuranceId.includes(phoneNumber) || phoneNumber.includes(insuranceId);
        
        // Additional check: if they're both numeric and have high similarity
        if (!isPartialMatch && phoneNumber.length >= 9 && insuranceId.length >= 9) {
          const shorter = phoneNumber.length < insuranceId.length ? phoneNumber : insuranceId;
          const longer = phoneNumber.length < insuranceId.length ? insuranceId : phoneNumber;
          
          // Check if shorter is a substring of longer after removing potential noise
          if (longer.includes(shorter)) {
            isPartialMatch = true;
          } else {
            // Check for high similarity (allowing for 1-2 digit differences)
            const similarity = this.calculateStringSimilarity(phoneNumber, insuranceId);
            isPartialMatch = similarity >= 0.8; // 80% similarity threshold
          }
        }
        
        if (isFullMatch || isPartialMatch) {
          phoneNumber = null;
          console.log(`Demo call detected: phone number set to null (${isFullMatch ? 'full' : 'partial'} match with insurance ID)`);
        }
      }
    }

    // STEP 1: Try to find or create patient
    if (!patientId) {
      let existingPatient;

      // Priority 1: Lookup by insurance ID
      if (insuranceId) {
        existingPatient = await this.prisma.patient.findUnique({
          where: { insuranceId },
        });
      }

      // Priority 2: Fallback to phone number if not found by insurance ID
      if (!existingPatient && phoneNumber) {
        existingPatient = await this.prisma.patient.findFirst({
          where: { phone: phoneNumber },
        });
      }

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
        phoneNumber: phoneNumber, // Will be null for demo calls
        duration: callDuration || dto.duration,
        audioUrl: dto.audio_url,
        transcription: this.formatTranscriptionWithLabels(this.wordsToDigits(dto.transcription)),
        intent: (dto.intent?.toUpperCase() as any) || 'GENERAL',
        sentiment: (dto.sentiment?.toUpperCase() as any) || 'NEUTRAL',
        summary: this.wordsToDigits(dto.summary),
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

    // Send Real-time Notification
    try {
      if (dto.doctor_id) {
        await this.notificationHelper.notifyCallLog(dto.doctor_id, {
          callId: transcription.id,
          callerName: transcription.callerName || undefined,
          callType: transcription.callStatus || 'RECEIVED',
          timestamp: transcription.createdAt,
        });
      }
    } catch (error) {
      console.error('Failed to send call notification:', error);
    }

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
    const finalDoctorId = doctorId || dto.doctor_id;

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

    // Fallback 1: Calculate duration from timestamps if available
    if (!duration && realData.start_timestamp && realData.end_timestamp) {
      const startTime = new Date(realData.start_timestamp).getTime();
      const endTime = new Date(realData.end_timestamp).getTime();
      const diffMs = endTime - startTime;
      if (diffMs > 0) {
        duration = Math.floor(diffMs / 1000);
        console.log(`⏱️ Calculated duration from timestamps: ${duration}s`);
      }
    }

    // Fallback 2: Check existing DB record if duration is still missing
    // (This helps if tool call saved duration but webhook missed it)
    if (!duration) {
      try {
        const existingRecord = await this.prisma.callTranscription.findUnique({
          where: { callSid: incomingCallSid }
        });
        if (existingRecord && existingRecord.duration) {
          duration = existingRecord.duration;
          console.log(`⏱️ Retrieved duration from existing DB record: ${duration}s`);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to check DB for fallback duration:`, err);
      }
    }

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
    else if (realData.metadata?.from_number || realData.metadata?.caller_id || realData.metadata?.phone_number || realData.metadata?.customer_number) {
      callerPhoneNumber = realData.metadata?.from_number || realData.metadata?.caller_id || realData.metadata?.phone_number || realData.metadata?.customer_number;
      console.log(`Caller phone from metadata: ${callerPhoneNumber}`);
    }
    // Final fallback: Top level from_number
    else if (realData.from_number) {
      callerPhoneNumber = realData.from_number;
      console.log(`Caller phone from top-level: ${callerPhoneNumber}`);
    }

    // Format transcript if available
    let transcriptionText = '';
    if (Array.isArray(realData.transcript)) {
      transcriptionText = this.formatTranscriptionWithLabels(
        realData.transcript
          .map((t) => `${t.role}: ${t.message}`)
          .join('\n'),
      );
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

    // If not found by ID, try finding by Insurance ID OR Phone Number extracted from tool calls or transcription
    // (This handles cases where the Tool saved with a "temp_" ID because config was broken)
    if (!existing) {
      console.log(`Attempting to link call via fallback identifiers (Insurance: ${extractedInfo.insuranceId}, Phone: ${callerPhoneNumber})`);
      // Find most recent temp record for this patient/phone and doctor (last 15 mins)
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

      const query: any = {
        where: {
          doctorId: finalDoctorId || undefined,
          callSid: { startsWith: 'temp_' },
          createdAt: { gt: fifteenMinsAgo },
          OR: []
        },
        orderBy: { createdAt: 'desc' },
      };

      if (extractedInfo.insuranceId) {
        query.where.OR.push({ insuranceId: extractedInfo.insuranceId });
      }
      if (callerPhoneNumber) {
        query.where.OR.push({ phoneNumber: callerPhoneNumber });
      }

      // If we have a transcription, also try to match by similar transcription content
      // This helps when insurance/phone aren't captured during the call
      if (transcriptionText && transcriptionText.length > 50) {
        // Get first 100 chars of transcription as a fingerprint
        const transcriptFingerprint = transcriptionText.substring(0, 100).toLowerCase();
        query.where.OR.push({
          transcription: {
            contains: transcriptFingerprint.substring(0, 50), // Use first 50 chars for matching
          },
        });
      }

      // Fallback: If no specific identifiers, just find the most recent temp record for this doctor
      // This is safe because we're within a 15-minute window
      if (query.where.OR.length === 0 && finalDoctorId) {
        delete query.where.OR;
        console.log(`No specific identifiers found, searching for most recent temp record for doctor ${finalDoctorId}`);
      }

      if (query.where.OR?.length > 0 || finalDoctorId) {
        existing = await this.prisma.callTranscription.findFirst(query);
      }

      if (existing) {
        console.log(
          `Found linked record via fallback! ID: ${existing.id}, TempSID: ${existing.callSid}, Match: ${existing.insuranceId === extractedInfo.insuranceId ? 'Insurance' : existing.phoneNumber === callerPhoneNumber ? 'Phone' : 'Transcription/Recent'}`,
        );
      } else {
        console.log(`No temp record found for linking. Will create new record.`);
      }
    }

    if (existing) {
      // If we have an existing record, update it with real ID, audioUrl, duration, and phone
      // Apply demo call detection logic here too
      let finalPhoneNumber = callerPhoneNumber || existing.phoneNumber;
      
      // Check if this is a demo call and phone number is actually an insurance ID
      if (finalPhoneNumber && finalPhoneNumber.length >= 9 && /^\d+$/.test(finalPhoneNumber)) {
        const existingInsuranceId = existing.insuranceId || extractedInfo.insuranceId;
        // If phone number looks like an insurance ID (9-10 digits) and we have an insurance ID too,
        // check if it's a full match or partial match (missing digits)
        if (existingInsuranceId) {
          const isFullMatch = finalPhoneNumber === existingInsuranceId;
          
          // Enhanced partial match detection
          let isPartialMatch = existingInsuranceId.includes(finalPhoneNumber) || finalPhoneNumber.includes(existingInsuranceId);
          
          if (!isPartialMatch && finalPhoneNumber.length >= 9 && existingInsuranceId.length >= 9) {
            const shorter = finalPhoneNumber.length < existingInsuranceId.length ? finalPhoneNumber : existingInsuranceId;
            const longer = finalPhoneNumber.length < existingInsuranceId.length ? existingInsuranceId : finalPhoneNumber;
            
            if (longer.includes(shorter)) {
              isPartialMatch = true;
            } else {
              const similarity = this.calculateStringSimilarity(finalPhoneNumber, existingInsuranceId);
              isPartialMatch = similarity >= 0.8;
            }
          }
          
          if (isFullMatch || isPartialMatch) {
            finalPhoneNumber = null;
            console.log(`Demo call detected in webhook update: phone number set to null (${isFullMatch ? 'full' : 'partial'} match with insurance ID)`);
          }
        }
      }
      
      const updatedRecord = await this.prisma.callTranscription.update({
        where: { id: existing.id },
        data: {
          audioUrl: audioUrl,
          duration: duration ? Math.round(duration) : undefined, // Ensure integer
          callSid: incomingCallSid, // UPDATE to the real ID so next time it matches!
          agentId: realData.agent_id || dto.agent_id || existing.agentId,
          // Update phone number if we found it and existing record doesn't have one
          phoneNumber: finalPhoneNumber,
          // Only update transcript if missing
          transcription: existing.transcription ? undefined : this.formatTranscriptionWithLabels(this.wordsToDigits(transcriptionText)),
          // ALWAYS update summary with ElevenLabs summary when available (overwrite existing)
          summary: realData.analysis?.transcript_summary
            ? this.wordsToDigits(realData.analysis.transcript_summary)
            : existing.summary,
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

      // [NEW] Call Minute Tracking Logic: Run AFTER resolution (billing idempotent)
      if (updatedRecord.duration && updatedRecord.duration > 0 && updatedRecord.callSid) {
        await this.deductCallMinutes(updatedRecord.doctorId, updatedRecord.duration, updatedRecord.callSid);
      }
      console.log(
        `Updated CallTranscription ${existing.id} with audio and duration.`,
      );

      // SYNC: Update patient's insurance ID if we extracted one and they don't have it
      if (existing.patientId) {
        const insuranceIdToSync = existing.insuranceId || extractedInfo.insuranceId;
        if (insuranceIdToSync) {
          const patient = await this.prisma.patient.findUnique({ where: { id: existing.patientId } });
          if (patient && !patient.insuranceId) {
            console.log(`[Webhook] Syncing insuranceId ${insuranceIdToSync} to patient ${existing.patientId}`);
            await this.prisma.patient.update({
              where: { id: existing.patientId },
              data: { insuranceId: insuranceIdToSync },
            });
          }
        }
      }

      return { success: true, message: 'Updated existing transcription' };
    }


    // If still no record, create a new one (Fallback)
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
    
    // Apply demo call detection to caller phone number
    let finalCallerPhoneNumber = callerPhoneNumber;
    if (finalCallerPhoneNumber && finalCallerPhoneNumber.length >= 9 && /^\d+$/.test(finalCallerPhoneNumber)) {
      const extractedInsuranceId = extractedInfo.insuranceId;
      // If phone number looks like an insurance ID (9-10 digits) and we have an insurance ID too,
      // check if it's a full match or partial match (missing digits)
      if (extractedInsuranceId) {
        const isFullMatch = finalCallerPhoneNumber === extractedInsuranceId;
        
        // Enhanced partial match detection
        let isPartialMatch = extractedInsuranceId.includes(finalCallerPhoneNumber) || finalCallerPhoneNumber.includes(extractedInsuranceId);
        
        if (!isPartialMatch && finalCallerPhoneNumber.length >= 9 && extractedInsuranceId.length >= 9) {
          const shorter = finalCallerPhoneNumber.length < extractedInsuranceId.length ? finalCallerPhoneNumber : extractedInsuranceId;
          const longer = finalCallerPhoneNumber.length < extractedInsuranceId.length ? extractedInsuranceId : finalCallerPhoneNumber;
          
          if (longer.includes(shorter)) {
            isPartialMatch = true;
          } else {
            const similarity = this.calculateStringSimilarity(finalCallerPhoneNumber, extractedInsuranceId);
            isPartialMatch = similarity >= 0.8;
          }
        }
        
        if (isFullMatch || isPartialMatch) {
          finalCallerPhoneNumber = null;
          console.log(`Demo call detected in fallback creation: phone number set to null (${isFullMatch ? 'full' : 'partial'} match with insurance ID)`);
        }
      }
    }
    
    if (finalCallerPhoneNumber) {
      const patient = await this.prisma.patient.findFirst({
        where: { phone: finalCallerPhoneNumber },
      });
      if (patient) {
        patientId = patient.id;
        console.log(`Linked fallback call to patient: ${patientId}`);
      }
    }

    const createdRecord = await this.prisma.callTranscription.create({
      data: {
        doctorId: finalDoctorId,
        patientId,
        callSid: incomingCallSid,
        agentId: realData.agent_id || dto.agent_id,
        phoneNumber: finalCallerPhoneNumber, // Use demo call detection result
        duration: tempDto.duration,
        audioUrl: audioUrl,
        transcription: this.formatTranscriptionWithLabels(this.wordsToDigits(tempDto.transcription)),
        summary: this.wordsToDigits(tempDto.summary),
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

    // [NEW] Call Minute Tracking Logic: Run AFTER creation (billing idempotent)
    if (createdRecord.duration && createdRecord.duration > 0 && createdRecord.callSid) {
      await this.deductCallMinutes(createdRecord.doctorId, createdRecord.duration, createdRecord.callSid);
    }

    console.log(`Created NEW CallTranscription for SID ${incomingCallSid}`);

    // Send Real-time Notification
    try {
      await this.notificationHelper.notifyCallLog(finalDoctorId, {
        callId: createdRecord.id,
        callerName: createdRecord.callerName || undefined,
        callType: createdRecord.callStatus || 'RECEIVED',
        timestamp: createdRecord.createdAt,
      });
    } catch (error) {
      console.error('Failed to send call notification:', error);
    }

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
    // Use wordsToDigits to normalize spoken words
    const normalizedText = this.wordsToDigits(text);

    // 1. Spoken format with explicit trigger
    const explicitPhonePatterns = [
      /(?:phone\s+number\s+is|my\s+number\s+is|call\s+me\s+at)\s+([\d\s,]+)/i,
    ];

    for (const pattern of explicitPhonePatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const phoneDigits = match[1].replace(/[\s,]/g, '');
        if (phoneDigits.length >= 10 && phoneDigits.length <= 14) {
          result.phone = phoneDigits;
          break;
        }
      }
    }

    if (!result.phone) {
      // 2. Standard digits (with optional +, spaces, or hyphens)
      const standardPhoneMatch = normalizedText.match(/(?:\+?88)?01[3-9]\d{8}/);
      if (standardPhoneMatch) {
        result.phone = standardPhoneMatch[0].replace(/[\s-]/g, '');
      } else {
        const broaderMatch = normalizedText.match(/(?:\+?88)?0?\d{9,13}/);
        if (broaderMatch && broaderMatch[0] !== result.insuranceId) {
          result.phone = broaderMatch[0].replace(/[\s-]/g, '');
        }
      }
    }

    // 1. Spoken format: "one zero five..."
    const insurancePatterns = [
      /(?:insurance\s+id\s+is|id\s+number\s+is|insurance\s+is|id\s+as)\s+([\d\s,]+)/i,
    ];

    for (const pattern of insurancePatterns) {
      const spokenMatch = normalizedText.match(pattern);
      if (spokenMatch) {
        const idDigits = spokenMatch[1].replace(/[\s,]/g, '');
        if (idDigits.length === 10) {
          result.insuranceId = idDigits;
          break;
        }
      }
    }

    // 2. Direct digit sequence (10 digits) if not found by spoken pattern
    if (!result.insuranceId) {
      const digitMatch = normalizedText.match(/\b\d{10}\b/);
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

        // Remove trailing punctuation like ". AI" or "..."
        fullName = fullName.replace(/[.\s]+AI$/i, '').trim();
        fullName = fullName.replace(/[.!?,]+$/, '').trim();

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
        let fullName = match[1];

        // Remove trailing punctuation like ". AI"
        fullName = fullName.replace(/[.\s]+AI$/i, '').trim();
        fullName = fullName.replace(/[.!?,]+$/, '').trim();

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

  // Helper to deduct minutes from subscription (whole minutes, ceiling) - IDEMPOTENT via Transaction
  private async deductCallMinutes(userId: string, durationInSeconds: number, callSid: string) {
    try {
      // Check if already billed to avoid double deduction
      const existingCall = await this.prisma.callTranscription.findUnique({
        where: { callSid: callSid },
      });

      if (existingCall && existingCall.minutesDeducted && existingCall.minutesDeducted > 0) {
        console.log(`⚠️ Call ${callSid} already billed (${existingCall.minutesDeducted} mins). Skipping.`);
        return;
      }

      const minutesToDeduct = Math.ceil(durationInSeconds / 60);
      console.log(`⏱️ Deducting ${minutesToDeduct} minutes for call duration ${durationInSeconds}s from user ${userId}`);

      // Run in transaction to ensure atomicity: Deduct Minutes AND Mark Call as Billed
      await this.prisma.$transaction(async (tx) => {
        // 1. Find active subscription
        const activeSubscription = await tx.subscription.findUnique({
          where: { userId },
        });

        if (activeSubscription && activeSubscription.status === 'ACTIVE') {
          const newUsedMin = (activeSubscription.minutesUsed || 0) + minutesToDeduct;
          const allocatedMin = activeSubscription.minutesAllocated || 0;

          let extraMin = 0;
          if (newUsedMin > allocatedMin) {
            extraMin = newUsedMin - allocatedMin;
          }

          // 2. Update Subscription
          await tx.subscription.update({
            where: { userId },
            data: {
              minutesUsed: newUsedMin,
              extraMinutes: extraMin,
            },
          });

          // 3. Mark Call as Billed (Upsert to handle case where record doesn't exist yet)
          // We only set minutesDeducted and required fields here. The main update logic later will fill the rest.
          await tx.callTranscription.upsert({
            where: { callSid: callSid },
            update: { minutesDeducted: minutesToDeduct },
            create: {
              callSid: callSid,
              doctorId: userId,
              minutesDeducted: minutesToDeduct,
              // Min required fields. Default to SUCCESSFUL if we are creating it here (it will likely be updated later)
              callStatus: 'SUCCESSFUL'
            }
          });

          console.log(`✅ Transaction success: Deducted ${minutesToDeduct} mins, Marked ${callSid} as billed.`);
        } else {
          console.warn(`⚠️ No active subscription found for user ${userId}. Cannot deduct minutes.`);
        }
      });

    } catch (err) {
      console.error('❌ Error updating subscription minutes (Transaction):', err);
    }
  }

  // Helper to map descriptive strings to AppointmentType UUIDs
  private async resolveAppointmentType(doctorId: string, input?: string): Promise<string | null> {
    if (!input || input === 'not_provided' || input === 'unknown' || input.trim().length < 3) return null;

    // Check if it's already a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(input)) return input;

    const types = await this.prisma.appointmentType.findMany({
      where: { doctorId }
    });

    if (types.length === 0) return null;

    const cleanInput = input.toLowerCase().trim().replace(/_/g, ' ');

    // 1. Exact Name Match
    const exact = types.find(t => t.name.toLowerCase() === cleanInput);
    if (exact) return exact.id;

    // 2. Contains Match 
    const contains = types.find(t =>
      t.name.toLowerCase().includes(cleanInput) ||
      cleanInput.includes(t.name.toLowerCase())
    );
    if (contains) return contains.id;

    // 3. Spoken Words / Keywords Match
    // Handle cases like "I want to book an appointment for blood checkup"
    const cleanedText = cleanInput.replace(/[^a-z0-9\s]/g, '');
    for (const type of types) {
      const typeLow = type.name.toLowerCase();
      // If the transcript contains the full name of the appointment type
      if (cleanedText.includes(typeLow)) return type.id;

      // If significant keywords match
      const typeWords = typeLow.split(' ').filter(w => w.length > 3);
      for (const word of typeWords) {
        if (cleanedText.includes(word)) return type.id;
      }
    }

    return null;
  }

  // Helper to convert spoken words to digits (e.g. "zero" -> "0")
  private wordsToDigits(text?: string): string {
    if (!text) return '';
    const digitWords: Record<string, string> = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9'
    };

    let result = text.toLowerCase();

    // Replace standalone words with digits
    // Use regex with word boundaries to avoid partial matches (e.g. "someone" -> "some1")
    Object.entries(digitWords).forEach(([word, digit]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, digit);
    });

    // Join single digit sequences
    // Matches: "0, 6, 6" -> "066", "1 2 3" -> "123"
    // We look for digits separated by spaces or commas
    result = result.replace(/\b\d\b(?:[\s,]+\d\b)+/g, (match) => {
      return match.replace(/[\s,]/g, '');
    });

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

  /**
   * Standardizes transcription formatting with only 'ai:' and 'user:' labels.
   */
  private formatTranscriptionWithLabels(text: string): string {
    if (!text) return '';

    // Split into lines and cleanup
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) return '';

    // Helper to normalize roles
    const normalizeRole = (role: string): 'ai' | 'user' => {
      const r = role.toLowerCase().trim();
      if (['ai', 'agent', 'assistant', 'system'].includes(r)) return 'ai';
      return 'user'; // Default everything else to 'user' (patient, etc.)
    };

    // Check if lines already have labels (at least 50% for heuristic)
    const labeledCount = lines.filter(line => /^[a-z0-9_-]+:\s/i.test(line)).length;
    const isMostlyLabeled = labeledCount / lines.length >= 0.5;

    if (isMostlyLabeled) {
      return lines.map(line => {
        const match = line.match(/^([a-z0-9_-]+):\s*(.*)$/i);
        if (match) {
          const role = normalizeRole(match[1]);
          const message = match[2].trim();
          return `${role}: ${message}`;
        }
        // If a line is missing a label in a labeled block, it likely belongs to the previous speaker
        return line;
      }).join('\n');
    } else {
      // No consistent labels, alternate starting with ai
      return lines.map((line, index) => {
        const role = index % 2 === 0 ? 'ai' : 'user';
        return `${role}: ${line}`;
      }).join('\n');
    }
  }

  /**
   * Resolves a unique target appointment for reschedule or cancel based on patient identification 
   * and conversational context (requested date/time).
   */
  private async resolveTargetAppointment(payload: WebhookPayloadDto): Promise<{
    appointment?: any;
    multipleOptions?: any[];
    error?: string
  }> {
    const { doctor_id, patient_id, patient_info, booking_id, requested_date, appointment_date } = payload;
    const phoneNumber = payload.phone_number || patient_info?.phone;
    const insuranceId = this.normalizeInsuranceId(patient_info?.insuranceId);

    // 1. If booking_id is provided, use it directly
    if (booking_id) {
      const bId = this.parseBookingId(booking_id);
      if (bId) {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: bId },
          include: { patient: true }
        });
        if (appointment) return { appointment };
      }
    }

    // 2. Resolve Patient with strict validation
    let resolvedPatientId = patient_id;
    let patientFound = false;
    let patientMatchMethod = '';
    
    if (!resolvedPatientId) {
      let patient;
      
      // Priority 1: Insurance ID (exact match only)
      if (insuranceId) {
        patient = await this.prisma.patient.findUnique({ where: { insuranceId } });
        if (patient) {
          patientMatchMethod = 'insurance_id';
          patientFound = true;
        }
      }
      
      // Priority 2: Phone number (exact match only)
      if (!patient && phoneNumber) {
        patient = await this.prisma.patient.findFirst({ where: { phone: phoneNumber } });
        if (patient) {
          patientMatchMethod = 'phone_number';
          patientFound = true;
        }
      }
      
      // Priority 3: Name-based lookup (only if no ID provided at all)
      if (!patient && !insuranceId && !phoneNumber && patient_info?.firstName && patient_info?.lastName) {
        patient = await this.prisma.patient.findFirst({
          where: {
            firstName: { contains: patient_info.firstName, mode: 'insensitive' },
            lastName: { contains: patient_info.lastName, mode: 'insensitive' },
          }
        });
        if (patient) {
          patientMatchMethod = 'name';
          patientFound = true;
        }
      }

      if (!patient) {
        // If insurance ID was provided but not found, be specific
        if (insuranceId) {
          return { error: "I couldn't find any patient record with that insurance ID. Please check your insurance ID and try again." };
        }
        return { error: "I couldn't find your patient record. Could you please provide your insurance ID, phone number, or full name?" };
      }
      
      resolvedPatientId = patient.id;
      
      // Log how we found the patient for debugging
      console.log(`[resolveTargetAppointment] Patient found using: ${patientMatchMethod}, ID: ${resolvedPatientId}`);
    }

    // 3. Fetch all SCHEDULED or RESCHEDULED appointments for this patient and doctor
    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor_id,
        patientId: resolvedPatientId,
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    if (appointments.length === 0) {
      return { error: "I couldn't find any scheduled appointments for you." };
    }

    if (appointments.length === 1) {
      return { appointment: appointments[0] };
    }

    // 4. Handle multiple appointments with strict validation
    console.log(`[resolveTargetAppointment] Found ${appointments.length} appointments for patient ${resolvedPatientId}`);
    
    // Support month/range matching (e.g., "in March", "this month")
    const searchDateStr = payload.intent?.toLowerCase().includes('reschedule')
      ? appointment_date
      : (appointment_date || requested_date || payload.transcription || payload.query);

    if (searchDateStr) {
      const lowerSearch = searchDateStr.toLowerCase();
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIdx = months.findIndex(m => lowerSearch.includes(m));

      const filtered = appointments.filter((apt) => {
        if (!apt.appointmentDate) return false;
        const aptDate = new Date(apt.appointmentDate);
        const aptDateStr = aptDate.toISOString().split('T')[0];

        // Specific date match
        const searchDate = new Date(searchDateStr);
        if (!isNaN(searchDate.getTime()) && aptDateStr === searchDate.toISOString().split('T')[0]) {
          return true;
        }

        // Month match
        if (monthIdx !== -1 && aptDate.getUTCMonth() === monthIdx) {
          return true;
        }

        return false;
      });

      if (filtered.length === 1) {
        return { appointment: filtered[0] };
      }
    }

    // If multiple appointments remain, present them clearly for user selection
    const options = appointments
      .map((a, idx) => {
        const date = a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'unknown date';
        const time = a.startTime || 'unknown time';
        const type = 'appointment'; // Simplified since appointmentType relation not available
        return `${idx + 1}. ${type} on ${date} at ${time}`;
      })
      .join('\n');

    return {
      multipleOptions: appointments,
      error: `I found multiple appointments for you:\n${options}\n\nPlease tell me which specific appointment you'd like to reschedule by mentioning the date (e.g., "the one on February 15th") or the appointment type and date (e.g., "the blood test on February 15th").`
    };  
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

  async updateBufferSetting(doctorId: string, bufferMinutes: number) {
    // Map number to BufferTime enum string safely
    const bufferMap: Record<number, string> = {
      5: 'Minutes_5',
      10: 'Minutes_10',
      15: 'Minutes_15',
      20: 'Minutes_20',
      30: 'Minutes_30',
    };

    const bufferValue = bufferMap[Number(bufferMinutes)];

    if (!bufferValue) {
      throw new BadRequestException(`Invalid buffer time. Allowed values are: 5, 10, 15, 20, 30 minutes.`);
    }

    console.log(`[AiAgentService] Updating buffer time for doctor ${doctorId} to ${bufferValue}`);

    // Update the regional settings
    return this.prisma.doctorRegionalSettings.upsert({
      where: { doctorId },
      update: { bufferTimeBetween: bufferValue as any },
      create: {
        doctorId,
        bufferTimeBetween: bufferValue as any,
      }
    });
  }

  async getBufferSetting(doctorId: string) {
    // Get the doctor's regional settings
    const settings = await this.prisma.doctorRegionalSettings.findUnique({
      where: { doctorId },
    });

    if (!settings || !settings.bufferTimeBetween) {
      // Return default if no settings exist
      return {
        buffer_minutes: 10, // Default 10 minutes
        buffer_setting: 'Minutes_10',
        is_default: true
      };
    }

    // Map BufferTime enum back to minutes
    const bufferMap: Record<string, number> = {
      'Minutes_5': 5,
      'Minutes_10': 10,
      'Minutes_15': 15,
      'Minutes_20': 20,
      'Minutes_30': 30,
    };

    const bufferMinutes = bufferMap[settings.bufferTimeBetween] || 10;

    return {
      buffer_minutes: bufferMinutes,
      buffer_setting: settings.bufferTimeBetween,
      is_default: false
    };
  }

  // =============== INTENT HANDLERS ===============
  private async handleBookingIntent(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    // Resolve Appointment Type ID from string if needed
    // Use full transcription as context if appointment_type_id is blank or generic
    const typeContext = (payload.appointment_type_id && payload.appointment_type_id !== 'not_provided')
      ? payload.appointment_type_id
      : (payload.transcription || payload.query || '');

    const resolvedTypeId = await this.resolveAppointmentType(payload.doctor_id, typeContext) || undefined;

    // Normalize date extraction and handle "as soon as possible"
    let appointmentDate = payload.appointment_date || payload.requested_date;
    let startTime = payload.start_time || payload.requested_time;
    
    // Check for "as soon as possible" requests
    const isAsSoonAsPossible = 
      (appointmentDate && appointmentDate.toLowerCase().includes('as soon as possible')) ||
      (startTime && startTime.toLowerCase().includes('as soon as possible')) ||
      (payload.transcription && payload.transcription.toLowerCase().includes('as soon as possible'));

    console.log(`[DEBUG] handleBookingIntent: isAsSoonAsPossible=${isAsSoonAsPossible}`);
    console.log(`[DEBUG] appointmentDate=${appointmentDate}, startTime=${startTime}`);
    console.log(`[DEBUG] transcription contains 'as soon as possible': ${payload.transcription && payload.transcription.toLowerCase().includes('as soon as possible')}`);

    if (isAsSoonAsPossible) {
      console.log('[DEBUG] Entering "as soon as possible" booking logic');
      // Find the earliest available slot
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start from today
        
        // Search for next 7 days for availability
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() + i);
          
          const availability = await this.getAvailableSlots({
            doctor_id: payload.doctor_id,
            date: checkDate.toISOString().split('T')[0],
            appointment_type_id: resolvedTypeId,
          });

          if (availability.summary.available > 0) {
            // Found earliest slot - show it and ask for confirmation
            const earliestSlot = availability.availableSlots[0];
            const bookingDate = checkDate.toISOString().split('T')[0];
            
            // Show a few more options if available
            const additionalSlots = availability.availableSlots.slice(1, 3);
            const additionalText = additionalSlots.length > 0 
              ? ` Other available times on ${bookingDate}: ${additionalSlots.map(s => s.startTime).join(', ')}.`
              : '';

            return {
              reply_text: `I found the earliest available appointment for ${bookingDate} at ${earliestSlot.startTime}.${additionalText} Would you like me to book this ${bookingDate} at ${earliestSlot.startTime} slot for you?`,
              suggested_slots: availability.availableSlots.slice(0, 5).map((s: any) => ({
                date: bookingDate,
                time: s.startTime,
              })),
              action: 'confirm_earliest_slot',
              proposed_slot: {
                date: bookingDate,
                time: earliestSlot.startTime,
              },
            };
          }
        }

        // No availability found in next 7 days
        return {
          reply_text: "I apologize, but we don't have availability in the next week. Would you like me to check further out, or connect you with our assistant?",
          action: 'no_availability',
          fallback_number: this.fallbackNumber,
        };
      } catch (error) {
        console.error('Error finding earliest availability:', error);
        return {
          reply_text: "I apologize, but I'm having trouble finding availability. Could you please provide a specific date you'd like to book?",
          action: 'ask_date',
        };
      }
    }

    // Handle date extraction from time field if needed
    if (!appointmentDate && startTime && startTime.includes('-')) {
      appointmentDate = startTime;
    }

    const updatedPayload = { ...payload, appointment_type_id: resolvedTypeId || payload.appointment_type_id, appointment_date: appointmentDate, start_time: startTime };

    // Handle confirmation for earliest slot (when user says yes to proposed slot)
    if (payload.action === 'confirm_earliest_slot' && payload.proposed_slot) {
      try {
        const booking = await this.createBooking({
          doctor_id: payload.doctor_id,
          patient_id: payload.patient_id,
          patient_info: payload.patient_info,
          start_time: payload.proposed_slot.time,
          appointment_date: payload.proposed_slot.date,
          appointment_type_id: resolvedTypeId || payload.appointment_type_id,
          caller_phone_number: payload.phone_number,
        });

        return {
          reply_text: booking.is_new_patient
            ? `Great! I've registered you and booked your appointment for ${payload.proposed_slot.date} at ${payload.proposed_slot.time}. You'll receive a confirmation shortly.`
            : `Perfect! Your appointment is confirmed for ${payload.proposed_slot.date} at ${payload.proposed_slot.time}. See you then!`,
          action: 'booking_confirmed',
          booking_id: booking.booking_id,
          is_new_patient: booking.is_new_patient,
          success: true,
          data: booking.appointment,
        };
      } catch (error) {
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

    // If start_time and appointment_date are provided, book directly
    if (startTime && appointmentDate && !startTime.includes('-')) {
      try {
        const booking = await this.createBooking({
          doctor_id: payload.doctor_id,
          patient_id: payload.patient_id,
          patient_info: payload.patient_info,
          start_time: startTime,
          appointment_date: appointmentDate,
          appointment_type_id: resolvedTypeId || payload.appointment_type_id,
          caller_phone_number: payload.phone_number,
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
        appointment_type_id: resolvedTypeId,
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
    const typeContext = (payload.appointment_type_id && payload.appointment_type_id !== 'not_provided')
      ? payload.appointment_type_id
      : (payload.transcription || payload.query || '');

    const resolvedTypeId = await this.resolveAppointmentType(payload.doctor_id, typeContext) || undefined;

    let requestedDate = payload.requested_date || payload.appointment_date;
    if (!requestedDate && payload.requested_time && payload.requested_time.includes('-')) {
      requestedDate = payload.requested_time;
    }
    
    // Check for "as soon as possible" requests
    const isAsSoonAsPossible = 
      (requestedDate && requestedDate.toLowerCase().includes('as soon as possible')) ||
      (payload.requested_time && payload.requested_time.toLowerCase().includes('as soon as possible')) ||
      (payload.transcription && payload.transcription.toLowerCase().includes('as soon as possible')) ||
      (payload.appointment_date && payload.appointment_date.toLowerCase().includes('as soon as possible'));

    if (isAsSoonAsPossible) {
      // Find the earliest available slot across next 7 days
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start from today
        
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() + i);
          
          const availability = await this.getAvailableSlots({
            doctor_id: payload.doctor_id,
            date: checkDate.toISOString().split('T')[0],
            appointment_type_id: resolvedTypeId,
          });

          if (availability.summary.available > 0) {
            const displaySlots = availability.availableSlots.slice(0, 6);
            const slotList = displaySlots
              .map((s: any) => `${s.startTime}`)
              .join(', ');

            const moreText = availability.summary.available > 6
              ? `. We have many more slots available throughout the day until ${availability.availableSlots[availability.availableSlots.length - 1].startTime}.`
              : '.';

            return {
              reply_text: `The earliest availability is on ${checkDate.toISOString().split('T')[0]}. We have ${availability.summary.available} slots available. The earliest times are: ${slotList}${moreText} Would you like me to book the earliest slot at ${availability.availableSlots[0].startTime}?`,
              suggested_slots: availability.availableSlots.slice(0, 20).map((s: any) => ({
                date: checkDate.toISOString().split('T')[0],
                time: s.startTime,
              })),
              action: 'show_slots',
            };
          }
        }

        return {
          reply_text: "I apologize, but we don't have availability in the next week. Would you like me to check further out, or connect you with our assistant?",
          action: 'no_availability',
          fallback_number: this.fallbackNumber,
        };
      } catch (error) {
        console.error('Error finding earliest availability:', error);
        return {
          reply_text: "I apologize, but I'm having trouble checking availability. Could you please provide a specific date you'd like to check?",
          action: 'ask_date',
        };
      }
    }
    
    if (!requestedDate) {
      requestedDate = new Date().toISOString().split('T')[0];
    }

    const availability = await this.getAvailableSlots({
      doctor_id: payload.doctor_id,
      date: requestedDate,
      appointment_type_id: resolvedTypeId,
    });

    if (availability.summary.available > 0) {
      // Show more slots (up to 6) and mention there are more
      const displaySlots = availability.availableSlots.slice(0, 6);
      const slotList = displaySlots
        .map((s: any) => `${s.startTime}`)
        .join(', ');

      const moreText = availability.summary.available > 6
        ? `. We have many more slots available throughout the day until ${availability.availableSlots[availability.availableSlots.length - 1].startTime}.`
        : '.';

      return {
        reply_text: `Yes, we have ${availability.summary.available} slots available on ${requestedDate}. Available times include: ${slotList}${moreText} Which time works best for you?`,
        suggested_slots: availability.availableSlots.slice(0, 20).map((s: any) => ({
          date: requestedDate,
          time: s.startTime,
        })),
        action: 'show_slots',
      };
    }

    // If no slots on requested date, look for next available days (up to 7 days ahead)
    const MAX_DAYS_TO_CHECK = 7;
    const baseDate = new Date(requestedDate);

    for (let i = 1; i <= MAX_DAYS_TO_CHECK; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + i);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      const alternativeAvailability = await this.getAvailableSlots({
        doctor_id: payload.doctor_id,
        date: nextDateStr,
        appointment_type_id: resolvedTypeId,
      });

      if (alternativeAvailability.summary.available > 0) {
        const displaySlots = alternativeAvailability.availableSlots.slice(0, 3);
        const slotList = displaySlots
          .map((s: any) => `${s.startTime}`)
          .join(', ');

        const formattedDate = nextDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric'
        });

        return {
          reply_text: `Unfortunately, we're fully booked on your requested date. However, I found ${alternativeAvailability.summary.available} slots on ${formattedDate}. Available times include: ${slotList}. Would any of those work for you?`,
          suggested_slots: alternativeAvailability.availableSlots.slice(0, 20).map((s: any) => ({
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
    const resolvedTypeId = await this.resolveAppointmentType(payload.doctor_id, payload.appointment_type_id) || undefined;

    // Resolve Target Appointment instead of relying solely on booking_id
    const targetResolution = await this.resolveTargetAppointment(payload);

    if (targetResolution.error) {
      return {
        reply_text: targetResolution.error || "I couldn't resolve your appointment. Please provide more details.",
        action: 'ask_identity',
      };
    }

    if (targetResolution.multipleOptions) {
      // The error message now contains the formatted options
      return {
        reply_text: targetResolution.error || "I found multiple appointments. Please specify which one you'd like to reschedule.",
        action: 'ask_identity',
      };
    }

    const appointmentToReschedule = targetResolution.appointment;

    // If new time and date provided, execute the reschedule
    if (appointmentToReschedule && (payload.start_time || payload.requested_time) && (payload.appointment_date || payload.requested_date)) {
      try {
        const result = await this.updateBooking({
          booking_id: appointmentToReschedule.id.toString(),
          new_start_time: payload.start_time || payload.requested_time,
          new_date: payload.appointment_date || payload.requested_date,
          appointment_type_id: resolvedTypeId,
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

    // Suggest alternative slots if we have a target appointment but no new date/time yet
    if (appointmentToReschedule) {
      const slots = await this.suggestAlternativeSlots({
        doctor_id: payload.doctor_id,
        requested_slot: payload.requested_time || new Date().toISOString(),
        appointment_type_id: resolvedTypeId,
      });

      if (slots.alternative_slots.length > 0) {
        const slotTexts = slots.alternative_slots
          .slice(0, 3)
          .map((s: any) => `${s.date} at ${s.time}`)
          .join(', or ');

        return {
          reply_text: `I can reschedule your appointment for ${appointmentToReschedule.appointmentDate ? new Date(appointmentToReschedule.appointmentDate).toDateString() : 'that date'}. Available times are: ${slotTexts}. Which would you prefer?`,
          suggested_slots: slots.alternative_slots.slice(0, 3),
          action: 'ask_new_slot',
          booking_id: appointmentToReschedule.id.toString(),
        };
      }
    } else {
      console.log(`[handleRescheduleIntent] No appointment uniquely resolved yet. Current payload:`, payload);
    }

    // Fallback: If booking_id missing and resolution didn't find anything (should be covered by targetResolution.error or multipleOptions, but just in case)
    if (!payload.booking_id && !appointmentToReschedule) {
      return {
        reply_text:
          'I can help you reschedule. Could you please provide your appointment confirmation number, phone number, or insurance ID so I can find your appointment?',
        action: 'ask_identity',
      };
    }

    // Suggest alternative slots
    const slots = await this.suggestAlternativeSlots({
      doctor_id: payload.doctor_id,
      requested_slot: payload.requested_time || new Date().toISOString(),
      appointment_type_id: resolvedTypeId, // Use resolvedTypeId here
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
    // Resolve Target Appointment
    const targetResolution = await this.resolveTargetAppointment(payload);

    if (targetResolution.error) {
      return {
        reply_text: `I'd be happy to help you cancel. ${targetResolution.error}`,
        action: 'ask_identity',
      };
    }

    if (targetResolution.multipleOptions) {
      const options = targetResolution.multipleOptions
        .map((a, idx) => `${idx + 1}. ${a.appointmentDate ? new Date(a.appointmentDate).toDateString() : 'unknown date'} at ${a.startTime || 'unknown time'}`)
        .join('\n');
      return {
        reply_text: `I found multiple appointments for you:\n${options}\nWhich one would you like to cancel? You can just say the date.`,
        action: 'ask_identity',
      };
    }

    const appointmentToCancel = targetResolution.appointment;

    try {
      const result = await this.cancelBooking({
        booking_id: appointmentToCancel.id.toString(),
      });

      return {
        reply_text: `I have successfully found your appointment for ${appointmentToCancel.appointmentDate ? new Date(appointmentToCancel.appointmentDate).toDateString() : 'that date'} at ${appointmentToCancel.startTime || 'unknown time'} and cancelled it for you.`,
        action: 'cancellation_confirmed',
        booking_id: result.appointment.id,
        success: true,
        data: result.appointment,
      };
    } catch (error) {
      return {
        reply_text:
          error.message ||
          "I'm sorry, I couldn't cancel that appointment. Would you like me to connect you with our assistant?",
        action: 'cancellation_failed',
        success: false,
      };
    }

    // If no identifying information provided, ask for it
    return {
      reply_text:
        'I can help you cancel your appointment. Could you please provide your appointment confirmation number, phone number, or insurance ID so I can find your appointment?',
      action: 'ask_identity',
    };
  }

  private async handleInquiryIntent(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    const query = payload.query || payload.transcription || '';

    // Check for "as soon as possible" in inquiry intent - redirect to booking logic
    const isAsSoonAsPossible = 
      (query && query.toLowerCase().includes('as soon as possible')) ||
      (payload.appointment_date && payload.appointment_date.toLowerCase().includes('as soon as possible')) ||
      (payload.requested_date && payload.requested_date.toLowerCase().includes('as soon as possible')) ||
      (payload.requested_time && payload.requested_time.toLowerCase().includes('as soon as possible'));

    // Check if this is a booking request with "as soon as possible"
    const isBookingRequest = 
      (query && (query.toLowerCase().includes('book') || query.toLowerCase().includes('schedule') || query.toLowerCase().includes('appointment'))) ||
      (payload.intent && (payload.intent.toLowerCase().includes('book') || payload.intent.toLowerCase().includes('schedule')));

    if (isAsSoonAsPossible && isBookingRequest) {
      console.log('Booking request with "as soon as possible" detected in inquiry intent, redirecting to booking');
      // Redirect to booking intent handler
      return this.handleBookingIntent(payload);
    } else if (isAsSoonAsPossible) {
      console.log('As soon as possible detected in inquiry intent, redirecting to availability check');
      // Redirect to availability intent handler
      return this.handleAvailabilityIntent(payload);
    }

    // Special handling for "what types of appointments"
    if (query.toLowerCase().includes('type') && (query.toLowerCase().includes('available') || query.toLowerCase().includes('offer'))) {
      const types = await this.prisma.appointmentType.findMany({
        where: { doctorId: payload.doctor_id }
      });

      if (types.length > 0) {
        const typeList = types.map(t => `${t.name} (${t.duration} mins)`).join(', ');
        return {
          reply_text: `We offer the following appointment types: ${typeList}. Which one would you like to schedule?`,
          action: 'provide_info',
        };
      }
    }

    const kbResponse = await this.queryKnowledgeBase({
      doctor_id: payload.doctor_id,
      query: query,
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
