import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { KbQueryDto } from './dto/kb-query.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { TranscriptionSaveDto } from './dto/transcription-save.dto';
import { ElevenLabsPostCallDto } from './dto/elevenlabs-post-call.dto';

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
    const { doctor_id, date, scheduleSlotId } = dto;

    // Verify doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctor_id },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const queryDate = date ? new Date(date) : new Date();
    const dayOfWeek = queryDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    // Get schedule for the day
    const schedule = await this.prisma.doctorWeeklySchedule.findFirst({
      where: {
        doctorId: doctor_id,
        day: dayOfWeek as any,
        isClosed: false,
      },
      include: { slots: true },
    });

    if (!schedule || schedule.slots.length === 0) {
      return {
        summary: {
          total: 0,
          available: 0,
          unavailable: 0,
        },
        availableSlots: [],
        unavailableSlots: [],
      };
    }

    const availableSlots: Array<{
      slotId: string;
      startTime: string;
      endTime: string;
    }> = [];
    const unavailableSlots: Array<{
      slotId: string;
      startTime: string;
      endTime: string;
      appointment: { id: number; patientName: string };
    }> = [];

    for (const slot of schedule.slots) {
      if (scheduleSlotId && slot.id !== scheduleSlotId) continue;

      // Check if slot is booked
      const existingAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: doctor_id,
          scheduleSlotId: slot.id,
          appointmentDate: {
            gte: new Date(queryDate.setHours(0, 0, 0, 0)),
            lt: new Date(queryDate.setHours(23, 59, 59, 999)),
          },
          status: 'SCHEDULED',
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      if (existingAppointment) {
        unavailableSlots.push({
          slotId: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          appointment: {
            id: existingAppointment.id,
            patientName:
              `${existingAppointment.patient?.firstName || ''} ${existingAppointment.patient?.lastName || ''}`.trim(),
          },
        });
      } else {
        availableSlots.push({
          slotId: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }

    return {
      summary: {
        total: schedule.slots.length,
        available: availableSlots.length,
        unavailable: unavailableSlots.length,
      },
      availableSlots,
      unavailableSlots,
    };
  }

  // =============== SUGGEST ALTERNATIVE SLOTS ===============
  async suggestAlternativeSlots(dto: SlotQueryDto) {
    const { doctor_id, requested_slot } = dto;

    // Use current date if requested_slot is empty or invalid
    const requestedDate =
      requested_slot && requested_slot.trim() !== ''
        ? new Date(requested_slot)
        : new Date();

    // Validate the date
    const currentYear = new Date().getFullYear();

    if (isNaN(requestedDate.getTime())) {
      // Try parsing with current year appended if initial parse failed
      const retryDate = new Date(`${requested_slot} ${currentYear}`);

      if (!isNaN(retryDate.getTime())) {
        requestedDate.setTime(retryDate.getTime());
      } else {
        throw new BadRequestException('Invalid date format');
      }
    } else {
      // If date parsed but year is significantly in the past (e.g., default 2001 behavior),
      // try to use the current year with the original input string
      if (requestedDate.getFullYear() < currentYear) {
        const retryDate = new Date(`${requested_slot} ${currentYear}`);
        // Only use retryDate if it's valid
        if (!isNaN(retryDate.getTime())) {
          requestedDate.setTime(retryDate.getTime());
        }
      }
    }

    // Ensure start date is not in the past
    const now = new Date();
    const today = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    if (requestedDate < now) {
      // If requested date is explicitly in the past (and valid), default to today
      // This covers logic where "last Monday" might parse to a past date
      requestedDate.setTime(now.getTime());
    }

    const alternatives: Array<{ date: string; time: string; slotId: string }> =
      [];

    // Get next 7 days of schedules
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(requestedDate);
      checkDate.setDate(checkDate.getDate() + i);

      const dayOfWeek = checkDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toUpperCase();

      // Get schedule for this day
      const schedule = await this.prisma.doctorWeeklySchedule.findFirst({
        where: {
          doctorId: doctor_id,
          day: dayOfWeek as any,
          isClosed: false,
        },
        include: { slots: true },
      });

      if (schedule) {
        for (const slot of schedule.slots) {
          // Check if slot is available
          const existingAppointment = await this.prisma.appointment.findFirst({
            where: {
              doctorId: doctor_id,
              scheduleSlotId: slot.id,
              appointmentDate: {
                gte: new Date(checkDate.setHours(0, 0, 0, 0)),
                lt: new Date(checkDate.setHours(23, 59, 59, 999)),
              },
              status: 'SCHEDULED',
            },
          });

          if (!existingAppointment) {
            alternatives.push({
              date: checkDate.toISOString().split('T')[0],
              time: slot.startTime,
              slotId: slot.id,
            });

            if (alternatives.length >= 20) break;
          }
        }
      }

      if (alternatives.length >= 20) break;
    }

    return { alternative_slots: alternatives };
  }

  // =============== CREATE BOOKING ===============
  async createBooking(dto: any) {
    const { doctor_id, patient_id, slot_id, appointment_date, patient_info } =
      dto;

    // Validate appointment date is in the future or today
    const apptDate = new Date(appointment_date);
    const now = new Date();
    // Compare dates only (set time to 00:00:00)
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(apptDate);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < now) {
      throw new BadRequestException('Cannot book an appointment in the past.');
    }

    let patientId = patient_id;
    let isNewPatient = false;

    // HYBRID APPROACH: Handle both existing and new patients
    if (!patientId) {
      // No patient_id provided - need to find or create patient

      if (!patient_info || !patient_info.phone) {
        throw new BadRequestException(
          'Patient phone number is required for booking',
        );
      }

      // STEP 1: Try to find existing patient by phone number
      const existingPatient = await this.prisma.patient.findFirst({
        where: {
          phone: patient_info.phone,
          // Optionally filter by doctor to avoid cross-doctor conflicts
          // doctorId: doctor_id,
        },
      });

      if (existingPatient) {
        // SCENARIO 1: Existing patient found - use their ID
        patientId = existingPatient.id;
        isNewPatient = false;
      } else {
        // SCENARIO 2: New patient - create record
        const newPatient = await this.prisma.patient.create({
          data: {
            firstName: patient_info.firstName,
            lastName: patient_info.lastName,
            phone: patient_info.phone,
            email: patient_info.email,
            insuranceId: patient_info.insuranceId || null,
            dob: patient_info.dob ? new Date(patient_info.dob) : null,
            gender: patient_info.gender?.toUpperCase() as any,
            // Link to doctor if needed
            // doctorId: doctor_id,
          },
        });
        patientId = newPatient.id;
        isNewPatient = true;
      }
    }

    // Verify slot is available
    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctor_id,
        scheduleSlotId: slot_id,
        appointmentDate: new Date(appointment_date),
        status: 'SCHEDULED',
      },
    });

    if (existingAppointment) {
      throw new BadRequestException('This slot is already booked');
    }

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        doctorId: doctor_id,
        patientId: patientId,
        scheduleSlotId: slot_id,
        appointmentDate: new Date(appointment_date),
        insuranceId: patient_info?.insuranceId || null,
        status: 'SCHEDULED',
        type: 'CHECKUP',
      },
      include: {
        scheduleSlot: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      booking_id: appointment.id,
      message: isNewPatient
        ? 'New patient registered and appointment booked successfully'
        : 'Appointment booked successfully',
      is_new_patient: isNewPatient,
      appointment: {
        id: appointment.id,
        date: appointment.appointmentDate,
        time: appointment.scheduleSlot?.startTime,
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
    new_slot_id?: string;
    new_date?: string;
  }) {
    const bookingId = this.parseBookingId(dto.booking_id);
    if (!bookingId) {
      throw new BadRequestException(
        'Invalid booking ID provided. Please provide a numeric ID.',
      );
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: bookingId },
    });

    if (!appointment) {
      throw new NotFoundException('Booking not found');
    }

    // If changing slot, verify availability
    if (dto.new_slot_id && dto.new_date) {
      // Validate new date is in future
      const newDate = new Date(dto.new_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const checkDate = new Date(newDate);
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate < now) {
        throw new BadRequestException(
          'Cannot reschedule to a date in the past.',
        );
      }

      const existingAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: appointment.doctorId,
          scheduleSlotId: dto.new_slot_id,
          appointmentDate: new Date(dto.new_date),
          status: 'SCHEDULED',
          id: { not: bookingId },
        },
      });

      if (existingAppointment) {
        throw new BadRequestException('The new slot is already booked');
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id: bookingId },
      data: {
        scheduleSlotId: dto.new_slot_id,
        appointmentDate: dto.new_date ? new Date(dto.new_date) : undefined,
        // Keep status as SCHEDULED so it appears in active appointments
      },
      include: {
        scheduleSlot: true,
      },
    });

    return {
      success: true,
      booking_id: updated.id,
      message: 'Appointment rescheduled successfully',
      appointment: {
        id: updated.id,
        date: updated.appointmentDate,
        time: updated.scheduleSlot?.startTime,
        status: updated.status,
      },
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
    // If there is NO transcription, or it's under 10 seconds (User request), or short + aborted
    if (!dto.transcription || dto.transcription.trim().length === 0) {
      return 'MISSED';
    }
    if (duration >= 0 && duration < 10) {
      return 'MISSED';
    }
    if (
      duration >= 0 &&
      duration < 25 &&
      (dto.transcription.length < 100 ||
        textToCheck.includes('cut the call') ||
        textToCheck.includes('wrong number'))
    ) {
      return 'MISSED';
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

    // Insurance ID: optional, digits only (no INS prefix)
    let insuranceId: string | undefined = dto.insurance_id;

    if (insuranceId) {
      // Remove whitespace just in case
      insuranceId = insuranceId.trim();

      // Optional extra safety: keep only digits
      insuranceId = insuranceId.replace(/\D/g, '');

      // At this point DTO already guarantees length === 10
    }

    // STEP 1: Try to extract patient info from transcription/summary if not provided
    if (!patientId && dto.phone_number) {
      // Try to find existing patient by phone
      const existingPatient = await this.prisma.patient.findFirst({
        where: {
          phone: dto.phone_number,
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
      } else {
        // Extract patient info from transcription/summary
        const patientInfo = this.extractPatientInfoFromText(
          dto.transcription || dto.summary || '',
        );

        if (patientInfo.firstName || patientInfo.email) {
          // Create new patient
          const newPatient = await this.prisma.patient.create({
            data: {
              firstName: patientInfo.firstName,
              lastName: patientInfo.lastName,
              phone: dto.phone_number,
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

    const transcription = await this.prisma.callTranscription.create({
      data: {
        doctorId: dto.doctor_id,
        patientId: patientId,
        callSid: callSid,
        phoneNumber: dto.phone_number,
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
        callStatus: callStatus,
        wasTransferred: dto.was_transferred || callStatus === 'TRANSFERRED',
        reasonForCalling: dto.reason_for_calling,
        insuranceId: insuranceId,
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

    // Format transcript if available
    let transcriptionText = '';
    if (Array.isArray(realData.transcript)) {
      transcriptionText = realData.transcript
        .map((t) => `${t.role}: ${t.message}`)
        .join('\n');
    }

    // 2. Identify the Record (Smart Linking)
    let existing = await this.prisma.callTranscription.findUnique({
      where: { callSid: incomingCallSid },
    });

    // If not found by ID, try finding by Phone Number extracted from tool calls
    // (This handles cases where the Tool saved with a "temp_" ID because config was broken)
    if (!existing && realData.transcript) {
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
            // Extract phone from nested patient_info or flat phone_number
            const phone =
              params.patient_info?.phone || params.phone_number || params.phone;

            if (phone) {
              console.log(`Attempting to link call via phone number: ${phone}`);
              // Find most recent temp record for this phone (last 15 mins)
              const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
              existing = await this.prisma.callTranscription.findFirst({
                where: {
                  phoneNumber: phone,
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
          }
        }
      } catch (err) {
        console.error('Error in smart linking logic:', err);
      }
    }

    if (existing) {
      // If we have an existing record, update it with real ID, audioUrl and duration
      await this.prisma.callTranscription.update({
        where: { id: existing.id },
        data: {
          audioUrl: audioUrl,
          duration: duration ? Math.round(duration) : undefined, // Ensure integer
          callSid: incomingCallSid, // UPDATE to the real ID so next time it matches!
          // Only update transcript if missing
          transcription: existing.transcription ? undefined : transcriptionText,
          // ALWAYS update summary with ElevenLabs summary when available (overwrite existing)
          summary: realData.analysis?.transcript_summary || existing.summary,
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

    await this.prisma.callTranscription.create({
      data: {
        doctorId: finalDoctorId,
        callSid: incomingCallSid,
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
  } {
    const result: { firstName?: string; lastName?: string; email?: string } =
      {};

    // Extract email using regex
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) {
      result.email = emailMatch[0];
    }

    // Extract name patterns
    // Support: "My full name is...", "I am...", "This is...", "First name and last name is..."
    const namePatterns = [
      /(?:my\s+full\s+name\s+is|my\s+name\s+is|i'm|i\s+am|this\s+is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /first\s+name\s+and\s+last\s+name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:,|\s+and)/,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // clean up the name
        const fullName = match[1].trim();
        const nameParts = fullName.split(/\s+/);

        if (nameParts.length >= 1) {
          result.firstName = nameParts[0];
        }
        if (nameParts.length >= 2) {
          result.lastName = nameParts.slice(1).join(' ');
        }
        break;
      }
    }

    return result;
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
    // If slot_id and appointment_date are provided, book directly
    if (payload.slot_id && payload.appointment_date) {
      try {
        const booking = await this.createBooking({
          doctor_id: payload.doctor_id,
          patient_id: payload.patient_id,
          patient_info: payload.patient_info,
          slot_id: payload.slot_id,
          appointment_date: payload.appointment_date,
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
        .map((s) => `${s.startTime} to ${s.endTime}`)
        .join(', ');

      return {
        reply_text: `Yes, we have ${availability.summary.available} slots available. Available times include: ${slotList}. Would you like to book one of these?`,
        suggested_slots: availability.availableSlots.slice(0, 3).map((s) => ({
          date:
            payload.requested_date || new Date().toISOString().split('T')[0],
          time: s.startTime,
          slotId: s.slotId,
        })),
        action: 'show_slots',
      };
    }

    return {
      reply_text:
        "Unfortunately, we're fully booked on that date. Would you like me to suggest alternative dates?",
      action: 'suggest_alternatives',
    };
  }

  private async handleRescheduleIntent(
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    // If all reschedule parameters provided, execute the reschedule
    if (payload.booking_id && payload.slot_id && payload.appointment_date) {
      try {
        const result = await this.updateBooking({
          booking_id: payload.booking_id,
          new_slot_id: payload.slot_id,
          new_date: payload.appointment_date,
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
    });

    if (slots.alternative_slots.length > 0) {
      const slotTexts = slots.alternative_slots
        .slice(0, 3)
        .map((s) => `${s.date} at ${s.time}`)
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
}
