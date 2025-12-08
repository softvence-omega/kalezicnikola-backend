import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { KbQueryDto } from './dto/kb-query.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { TranscriptionSaveDto } from './dto/transcription-save.dto';

@Injectable()
export class AiAgentService {
  private readonly twilioNumber: string;
  private readonly fallbackNumber: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.twilioNumber = '+15095091987'; // Twilio number from client
    this.fallbackNumber = '+8801742460399'; // Physical assistant number
  }

  // =============== MAIN WEBHOOK PROCESSOR ===============
  async processWebhook(payload: WebhookPayloadDto): Promise<WebhookResponseDto> {
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
          reply_text: 'I can help you with booking appointments, checking availability, or answering questions about our services. How can I assist you today?',
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
        answer: 'I don\'t have specific information about that at the moment. Would you like me to connect you with our team?',
        category: null,
      };
    }

    // Simple keyword matching (can be enhanced with vector search later)
    const queryLower = dto.query.toLowerCase();
    const matches = kbEntries.filter(entry => {
      const questionMatch = entry.question.toLowerCase().includes(queryLower);
      const answerMatch = entry.answer.toLowerCase().includes(queryLower);
      const keywordMatch = entry.keywords.some(kw => queryLower.includes(kw.toLowerCase()));
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
    const dayOfWeek = queryDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

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

    const availableSlots: Array<{ slotId: string; startTime: string; endTime: string }> = [];
    const unavailableSlots: Array<{ slotId: string; startTime: string; endTime: string; appointment: { id: string; patientName: string } }> = [];

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
            patientName: `${existingAppointment.patient?.firstName || ''} ${existingAppointment.patient?.lastName || ''}`.trim(),
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
    const requestedDate = (requested_slot && requested_slot.trim() !== '') 
      ? new Date(requested_slot) 
      : new Date();
    
    // Validate the date
    if (isNaN(requestedDate.getTime())) {
      // If invalid date, use current date
      requestedDate.setTime(Date.now());
    }

    const alternatives: Array<{ date: string; time: string; slotId: string }> = [];

    // Get next 7 days of schedules
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(requestedDate);
      checkDate.setDate(checkDate.getDate() + i);

      const dayOfWeek = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

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

            if (alternatives.length >= 5) break;
          }
        }
      }

      if (alternatives.length >= 5) break;
    }

    return { alternative_slots: alternatives };
  }

  // =============== CREATE BOOKING ===============
  async createBooking(dto: any) {
    const { doctor_id, patient_id, slot_id, appointment_date, patient_info } = dto;

    let patientId = patient_id;
    let isNewPatient = false;

    // HYBRID APPROACH: Handle both existing and new patients
    if (!patientId) {
      // No patient_id provided - need to find or create patient
      
      if (!patient_info || !patient_info.phone) {
        throw new BadRequestException('Patient phone number is required for booking');
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

  // =============== UPDATE BOOKING ===============
  async updateBooking(dto: { booking_id: string; new_slot_id?: string; new_date?: string }) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.booking_id },
    });

    if (!appointment) {
      throw new NotFoundException('Booking not found');
    }

    // If changing slot, verify availability
    if (dto.new_slot_id && dto.new_date) {
      const existingAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: appointment.doctorId,
          scheduleSlotId: dto.new_slot_id,
          appointmentDate: new Date(dto.new_date),
          status: 'SCHEDULED',
          id: { not: dto.booking_id },
        },
      });

      if (existingAppointment) {
        throw new BadRequestException('The new slot is already booked');
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id: dto.booking_id },
      data: {
        scheduleSlotId: dto.new_slot_id,
        appointmentDate: dto.new_date ? new Date(dto.new_date) : undefined,
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
      },
    };
  }

  // =============== CANCEL BOOKING ===============
  async cancelBooking(dto: { booking_id: string }) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.booking_id },
    });

    if (!appointment) {
      throw new NotFoundException('Booking not found');
    }

    await this.prisma.appointment.update({
      where: { id: dto.booking_id },
      data: { status: 'CANCELLED' },
    });

    return {
      success: true,
      message: 'Appointment cancelled successfully',
    };
  }

  // =============== GET BOOKING ===============
  async getBooking(bookingId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: bookingId },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialities: true } },
        patient: { select: { firstName: true, lastName: true, phone: true, email: true } },
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

  // =============== SAVE TRANSCRIPTION ===============
  async saveTranscription(dto: TranscriptionSaveDto) {
    let patientId = dto.patient_id;
    let appointmentId = dto.appointment_id;

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
            },
          });
          patientId = newPatient.id;
        }
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

    // STEP 3: Save transcription with linked patient and appointment
    const transcription = await this.prisma.callTranscription.create({
      data: {
        doctorId: dto.doctor_id,
        patientId: patientId,
        callSid: dto.call_sid,
        phoneNumber: dto.phone_number,
        duration: dto.duration,
        audioUrl: dto.audio_url,
        transcription: dto.transcription,
        intent: dto.intent?.toUpperCase() as any,
        sentiment: dto.sentiment?.toUpperCase() as any,
        summary: dto.summary, // Save full summary from ElevenLabs
        appointmentId: appointmentId,
        fallbackNumber: dto.fallback_number || this.fallbackNumber,
        wasTransferred: dto.was_transferred || false,
        callStartedAt: dto.call_started_at ? new Date(dto.call_started_at) : null,
        callEndedAt: dto.call_ended_at ? new Date(dto.call_ended_at) : null,
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

  // Helper method to extract patient info from conversation text
  private extractPatientInfoFromText(text: string): {
    firstName?: string;
    lastName?: string;
    email?: string;
  } {
    const result: { firstName?: string; lastName?: string; email?: string } = {};

    // Extract email using regex
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) {
      result.email = emailMatch[0];
    }

    // Extract name patterns like "I'm Rocky Hawk" or "my name is Rocky Hawk"
    const namePatterns = [
      /(?:I'm|I am|my name is|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:,|\s+and)/,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const nameParts = match[1].trim().split(/\s+/);
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
  private async handleBookingIntent(payload: WebhookPayloadDto): Promise<WebhookResponseDto> {
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
        // If booking fails (slot taken, etc.), suggest alternatives
        return {
          reply_text: `I'm sorry, that slot is no longer available. Let me find you another time.`,
          action: 'slot_unavailable',
        };
      }
    }

    // Otherwise, suggest available slots
    const slots = await this.suggestAlternativeSlots({
      doctor_id: payload.doctor_id,
      requested_slot: payload.requested_time || new Date().toISOString(),
    });

    if (slots.alternative_slots.length > 0) {
      const slotTexts = slots.alternative_slots
        .slice(0, 3)
        .map(s => `${s.date} at ${s.time}`)
        .join(', or ');

      return {
        reply_text: `I have availability on ${slotTexts}. Which time works best for you?`,
        suggested_slots: slots.alternative_slots.slice(0, 3),
        action: 'ask_slot',
      };
    }

    return {
      reply_text: 'I apologize, but we don\'t have availability in the near future. Would you like me to check next week, or connect you with our assistant?',
      action: 'no_availability',
      fallback_number: this.fallbackNumber,
    };
  }

  private async handleAvailabilityIntent(payload: WebhookPayloadDto): Promise<WebhookResponseDto> {
    const availability = await this.getAvailableSlots({
      doctor_id: payload.doctor_id,
      date: payload.requested_date || new Date().toISOString().split('T')[0],
    });

    if (availability.summary.available > 0) {
      const slotList = availability.availableSlots
        .slice(0, 3)
        .map(s => `${s.startTime} to ${s.endTime}`)
        .join(', ');

      return {
        reply_text: `Yes, we have ${availability.summary.available} slots available. Available times include: ${slotList}. Would you like to book one of these?`,
        suggested_slots: availability.availableSlots.slice(0, 3).map(s => ({
          date: payload.requested_date || new Date().toISOString().split('T')[0],
          time: s.startTime,
          slotId: s.slotId,
        })),
        action: 'show_slots',
      };
    }

    return {
      reply_text: 'Unfortunately, we\'re fully booked on that date. Would you like me to suggest alternative dates?',
      action: 'suggest_alternatives',
    };
  }

  private async handleRescheduleIntent(payload: WebhookPayloadDto): Promise<WebhookResponseDto> {
    if (!payload.booking_id) {
      return {
        reply_text: 'I can help you reschedule. Can you provide your appointment confirmation number or the date of your current appointment?',
        action: 'ask_booking_id',
      };
    }

    const slots = await this.suggestAlternativeSlots({
      doctor_id: payload.doctor_id,
      requested_slot: payload.requested_time || new Date().toISOString(),
    });

    if (slots.alternative_slots.length > 0) {
      const slotTexts = slots.alternative_slots
        .slice(0, 3)
        .map(s => `${s.date} at ${s.time}`)
        .join(', or ');

      return {
        reply_text: `I can reschedule your appointment. Available times are: ${slotTexts}. Which would you prefer?`,
        suggested_slots: slots.alternative_slots.slice(0, 3),
        action: 'ask_new_slot',
        booking_id: payload.booking_id,
      };
    }

    return {
      reply_text: 'I don\'t have immediate availability. Would you like me to connect you with our assistant to find a suitable time?',
      action: 'transfer_to_assistant',
      fallback_number: this.fallbackNumber,
    };
  }

  private async handleCancelIntent(payload: WebhookPayloadDto): Promise<WebhookResponseDto> {
    if (!payload.booking_id) {
      return {
        reply_text: 'I can help you cancel your appointment. Can you provide your appointment confirmation number or the date of your appointment?',
        action: 'ask_booking_id',
      };
    }

    return {
      reply_text: 'I understand you want to cancel your appointment. Are you sure you want to proceed with the cancellation?',
      action: 'confirm_cancellation',
      booking_id: payload.booking_id,
    };
  }

  private async handleInquiryIntent(payload: WebhookPayloadDto): Promise<WebhookResponseDto> {
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
