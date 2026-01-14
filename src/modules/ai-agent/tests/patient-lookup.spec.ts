import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentService } from '../ai-agent.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AiAgentService - Patient Lookup', () => {
  let service: AiAgentService;
  let prisma: PrismaService;

  const mockPrisma = {
    patient: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    appointmentType: {
      findUnique: jest.fn(),
    },
    doctor: {
      findUnique: jest.fn(),
    },
    doctorWeeklySchedule: {
      findUnique: jest.fn(),
    },
    doctorRegionalSettings: {
      findUnique: jest.fn(),
    },
    callTranscription: {
      create: jest.fn(),
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('createBooking - Patient Lookup Priority', () => {
    const dtoBase = {
      doctor_id: 'doctor-1',
      appointment_type_id: 'type-1',
      appointment_date: '2026-01-14',
      start_time: '10:00 AM',
      patient_info: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        insuranceId: '1234567890'
      }
    };

    it('should prioritize lookup by insuranceId', async () => {
      const mockPatient = { id: 'patient-unique', insuranceId: '1234567890' };
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointmentType.findUnique as jest.Mock).mockResolvedValue({ id: 'type-1', duration: 30 });
      (prisma.doctor.findUnique as jest.Mock).mockResolvedValue({ id: 'doctor-1' });
      (prisma.doctorWeeklySchedule.findUnique as jest.Mock).mockResolvedValue({ day: 'WEDNESDAY', firstHalfStartTime: '08:00', firstHalfEndTime: '12:00' });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({ id: 101, appointmentDate: new Date(), startTime: '10:00 AM', patient: mockPatient });

      await service.createBooking(dtoBase);

      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { insuranceId: '1234567890' }
      });
      expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    });

    it('should fallback to phone if insuranceId lookup fails', async () => {
      const mockPatient = { id: 'patient-phone', phone: '1234567890' };
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointmentType.findUnique as jest.Mock).mockResolvedValue({ id: 'type-1', duration: 30 });
      (prisma.doctor.findUnique as jest.Mock).mockResolvedValue({ id: 'doctor-1' });
      (prisma.doctorWeeklySchedule.findUnique as jest.Mock).mockResolvedValue({ day: 'WEDNESDAY', firstHalfStartTime: '08:00', firstHalfEndTime: '12:00' });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({ id: 101, appointmentDate: new Date(), startTime: '10:00 AM', patient: mockPatient });

      await service.createBooking(dtoBase);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { phone: '1234567890' }
      });
    });

    it('should fallback to caller_phone_number if both insuranceId and info phone fails', async () => {
      const mockPatient = { id: 'patient-caller', phone: '0987654321' };
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.patient.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // info phone
        .mockResolvedValueOnce(mockPatient); // caller phone
      
      (prisma.appointmentType.findUnique as jest.Mock).mockResolvedValue({ id: 'type-1', duration: 30 });
      (prisma.doctor.findUnique as jest.Mock).mockResolvedValue({ id: 'doctor-1' });
      (prisma.doctorWeeklySchedule.findUnique as jest.Mock).mockResolvedValue({ day: 'WEDNESDAY', firstHalfStartTime: '08:00', firstHalfEndTime: '12:00' });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({ id: 101, appointmentDate: new Date(), startTime: '10:00 AM', patient: mockPatient });

      await service.createBooking({ ...dtoBase, caller_phone_number: '0987654321' });

      expect(prisma.patient.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.patient.findFirst).toHaveBeenLastCalledWith({
        where: { phone: '0987654321' }
      });
    });

    it('should sync insuranceId if missing from existing patient during booking', async () => {
      const mockPatient = { id: 'patient-123', insuranceId: null, phone: '1234567890' };
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.patient.update as jest.Mock).mockResolvedValue({ ...mockPatient, insuranceId: 'INS-999' });
      
      (prisma.appointmentType.findUnique as jest.Mock).mockResolvedValue({ id: 'type-1', duration: 30 });
      (prisma.doctor.findUnique as jest.Mock).mockResolvedValue({ id: 'doctor-1' });
      (prisma.doctorWeeklySchedule.findUnique as jest.Mock).mockResolvedValue({ day: 'WEDNESDAY', firstHalfStartTime: '08:00', firstHalfEndTime: '12:00' });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({ id: 101, appointmentDate: new Date(), startTime: '10:00 AM', patient: mockPatient });

      const dto = { ...dtoBase, patient_info: { ...dtoBase.patient_info, insuranceId: 'INS-999' } };
      await service.createBooking(dto);

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-123' },
        data: { insuranceId: 'INS-999' }
      });
    });

    it('should normalize insuranceId (remove spaces) before lookup', async () => {
      const mockPatient = { id: 'patient-unique', insuranceId: '1234567890' };
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointmentType.findUnique as jest.Mock).mockResolvedValue({ id: 'type-1', duration: 30 });
      (prisma.doctor.findUnique as jest.Mock).mockResolvedValue({ id: 'doctor-1' });
      (prisma.doctorWeeklySchedule.findUnique as jest.Mock).mockResolvedValue({ day: 'WEDNESDAY', firstHalfStartTime: '08:00', firstHalfEndTime: '12:00' });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({ id: 101, appointmentDate: new Date(), startTime: '10:00 AM', patient: mockPatient });

      const dto = { ...dtoBase, patient_info: { ...dtoBase.patient_info, insuranceId: '12345 67890' } };
      await service.createBooking(dto);

      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { insuranceId: '1234567890' }
      });
    });

    it('should allow registration with ONLY insuranceId (no phone)', async () => {
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.patient.create as jest.Mock).mockResolvedValue({ id: 'new-patient-id', insuranceId: '9999999999' });
      (prisma.appointmentType.findUnique as jest.Mock).mockResolvedValue({ id: 'type-1', duration: 30 });
      (prisma.doctor.findUnique as jest.Mock).mockResolvedValue({ id: 'doctor-1' });
      (prisma.doctorWeeklySchedule.findUnique as jest.Mock).mockResolvedValue({ day: 'WEDNESDAY', firstHalfStartTime: '08:00', firstHalfEndTime: '12:00' });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({ id: 101, appointmentDate: new Date(), startTime: '10:00 AM', patient: { id: 'new-patient-id' } });

      const dto = { ...dtoBase, patient_info: { firstName: 'New', lastName: 'Patient', insuranceId: '9999999999' } };
      delete (dto.patient_info as any).phone;
      
      await service.createBooking(dto);

      expect(prisma.patient.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          insuranceId: '9999999999'
        })
      }));
    });
  });

  describe('saveTranscription - Patient Lookup Priority', () => {
    const dtoBase = {
      doctor_id: 'doctor-1',
      insurance_id: '1234567890',
      phone_number: '1234567890',
      transcription: 'test',
      intent: 'GENERAL'
    };

    it('should prioritize lookup by insuranceId in transcription save', async () => {
      const mockPatient = { id: 'patient-unique', insuranceId: '1234567890' };
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.callTranscription.create as jest.Mock).mockResolvedValue({ id: 'call-1' });

      await service.saveTranscription(dtoBase);

      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { insuranceId: '1234567890' }
      });
      expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    });

    it('should fallback to phone in transcription save if insuranceId fails', async () => {
      const mockPatient = { id: 'patient-phone', phone: '1234567890' };
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.callTranscription.create as jest.Mock).mockResolvedValue({ id: 'call-1' });

      await service.saveTranscription(dtoBase);

      expect(prisma.patient.findUnique).toHaveBeenCalled();
      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { phone: '1234567890' }
      });
    });
  });

  describe('Intelligent Appointment Resolution (Reschedule/Cancel)', () => {
    const patientId = 'patient-123';
    const doctorId = 'doctor-1';
    
    it('should resolve unique appointment without booking_id using insuranceId', async () => {
      const mockPatient = { id: patientId, insuranceId: '1234567890' };
      const mockAppointment = { id: 101, appointmentDate: new Date(), startTime: '10:00 AM', status: 'SCHEDULED', doctorId };
      
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);
      jest.spyOn(service, 'suggestAlternativeSlots').mockResolvedValue({ alternative_slots: [{ date: '2026-01-20', time: '11:00 AM' }] } as any);
      
      const payload = {
        doctor_id: doctorId,
        patient_info: { insuranceId: '1234567890' },
        intent: 'RESCHEDULE',
        requested_time: '10:00 AM'
      } as any;
      
      const response = await (service as any).handleRescheduleIntent(payload);
      
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({ where: { insuranceId: '1234567890' }});
      expect(response.action).toBe('ask_new_slot');
    });

    it('should normalize insuranceId with spaces in handleRescheduleIntent', async () => {
      const mockPatient = { id: patientId, insuranceId: '1234567890' };
      const mockAppointment = { id: 101, appointmentDate: new Date(), startTime: '10:00 AM', status: 'SCHEDULED', doctorId };
      
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);
      jest.spyOn(service, 'suggestAlternativeSlots').mockResolvedValue({ alternative_slots: [{ date: '2026-01-20', time: '11:00 AM' }] } as any);
      
      const payload = {
        doctor_id: doctorId,
        patient_info: { insuranceId: '12345 67890' }, // Space included
        intent: 'RESCHEDULE',
        requested_time: '10:00 AM'
      } as any;
      
      await (service as any).handleRescheduleIntent(payload);
      
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({ where: { insuranceId: '1234567890' }});
    });

    it('should return multiple options if user has multiple scheduled appointments', async () => {
      const mockPatient = { id: patientId, insuranceId: '1234567890' };
      const appointments = [
        { id: 101, appointmentDate: new Date('2026-01-20'), startTime: '10:00 AM', status: 'SCHEDULED' },
        { id: 102, appointmentDate: new Date('2026-01-25'), startTime: '11:00 AM', status: 'SCHEDULED' }
      ];
      
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(appointments);
      
      const payload = {
        doctor_id: doctorId,
        patient_info: { insuranceId: '1234567890' },
        intent: 'CANCEL'
      } as any;
      
      const response = await (service as any).handleCancelIntent(payload);
      
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({ where: { insuranceId: '1234567890' }});
      expect(response.action).toBe('ask_identity');
    });

    it('should fallback to name-based lookup in resolveTargetAppointment', async () => {
      const mockPatient = { id: patientId, firstName: 'Ria', lastName: 'Jahan' };
      const mockAppointment = { id: 101, appointmentDate: new Date(), startTime: '10:00 AM', status: 'SCHEDULED', doctorId };
      
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.patient.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // Phone check
        .mockResolvedValueOnce(mockPatient); // Name check
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);
      jest.spyOn(service, 'suggestAlternativeSlots').mockResolvedValue({ alternative_slots: [{ date: '2026-01-20', time: '11:00 AM' }] } as any);

      const payload = {
        doctor_id: doctorId,
        patient_info: { firstName: 'Ria', lastName: 'Jahan' },
        intent: 'RESCHEDULE'
      } as any;

      await (service as any).handleRescheduleIntent(payload);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          firstName: { contains: 'Ria', mode: 'insensitive' },
          lastName: { contains: 'Jahan', mode: 'insensitive' }
        })
      }));
    });

    it('should include RESCHEDULED appointments in resolution', async () => {
      const mockPatient = { id: patientId, insuranceId: '1234567890' };
      const mockAppointment = { id: 101, appointmentDate: new Date(), startTime: '10:00 AM', status: 'RESCHEDULED', doctorId };
      
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);
      jest.spyOn(service, 'suggestAlternativeSlots').mockResolvedValue({ alternative_slots: [{ date: '2026-01-20', time: '11:00 AM' }] } as any);

      const payload = {
        doctor_id: doctorId,
        patient_info: { insuranceId: '1234567890' },
        intent: 'RESCHEDULE'
      } as any;

      const response = await (service as any).handleRescheduleIntent(payload);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['SCHEDULED', 'RESCHEDULED'] }
        })
      }));
      expect(response.action).toBe('ask_new_slot'); // Successfully found the rescheduled one
    });

    it('should set status to RESCHEDULED when successfully rescheduling', async () => {
      const mockPatient = { id: patientId, insuranceId: '1234567890' };
      const targetDate = '2026-01-20';
      const mockAppointment = { id: 101, appointmentDate: new Date(targetDate), startTime: '10:00 AM', status: 'SCHEDULED', doctorId };
      
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
      (prisma.appointment.findMany as jest.Mock)
        .mockResolvedValueOnce([mockAppointment]) // For resolveTargetAppointment
        .mockResolvedValue([]); // For updateBooking conflict check
      (prisma.appointmentType.findUnique as jest.Mock).mockResolvedValue({ id: 'type-1', duration: 30 });
      (prisma.doctor.findUnique as jest.Mock).mockResolvedValue({ id: doctorId });
      (prisma.doctorWeeklySchedule.findUnique as jest.Mock).mockResolvedValue({ 
        day: 'TUESDAY', 
        firstHalfStartTime: '08:00', 
        firstHalfEndTime: '12:00' 
      });
      (prisma.appointment.update as jest.Mock).mockResolvedValue({ 
        id: 101, 
        appointmentDate: new Date(targetDate), 
        startTime: '11:00 AM', 
        status: 'RESCHEDULED' 
      });

      const payload = {
        doctor_id: doctorId,
        patient_info: { insuranceId: '1234567890' },
        appointment_date: targetDate, // The "old" date
        requested_date: '2026-01-20', // The "new" date
        start_time: '11:00 AM',
        intent: 'RESCHEDULE'
      } as any;
      
      const response = await (service as any).handleRescheduleIntent(payload);
      
      expect(response.action).toBe('reschedule_confirmed');
      expect(prisma.appointment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'RESCHEDULED' })
      }));
    });

    it('should resolve to specific appointment for cancel if date context is provided', async () => {
      const mockPatient = { id: patientId, insuranceId: '1234567890' };
      const targetDate = '2026-01-20';
      const appointments = [
        { id: 101, appointmentDate: new Date(targetDate), startTime: '10:00 AM', status: 'SCHEDULED' },
        { id: 102, appointmentDate: new Date('2026-01-25'), startTime: '11:00 AM', status: 'SCHEDULED' }
      ];
      
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(appointments);
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(appointments[0]);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({ id: 101, status: 'CANCELLED', appointmentDate: new Date(targetDate) });

      const payload = {
        doctor_id: doctorId,
        patient_info: { insuranceId: '1234567890' },
        requested_date: targetDate,
        intent: 'CANCEL'
      } as any;
      
      const response = await (service as any).handleCancelIntent(payload);
      
      expect(response.action).toBe('cancellation_confirmed');
      expect(response.reply_text).toContain('successfully found your appointment');
    });

    it('should resolve to specific appointment if month name is provided in query', async () => {
      const mockPatient = { id: patientId, insuranceId: '1234567890' };
      const targetDate = '2026-03-06';
      const appointments = [
        { id: 101, appointmentDate: new Date(targetDate), startTime: '10:00 AM', status: 'SCHEDULED' },
        { id: 102, appointmentDate: new Date('2026-04-13'), startTime: '11:00 AM', status: 'SCHEDULED' }
      ];
      
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue(appointments);
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(appointments[0]);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({ id: 101, status: 'CANCELLED', appointmentDate: new Date(targetDate) });

      const payload = {
        doctor_id: doctorId,
        patient_info: { insuranceId: '1234567890' },
        query: 'cancel my appointment in march',
        transcription: 'i want to cancel my appointment in march',
        intent: 'CANCEL'
      } as any;

      const response = await (service as any).handleCancelIntent(payload);
      
      expect(response.action).toBe('cancellation_confirmed');
      expect(response.reply_text).toContain('Mar 06 2026');
    });
  });

  describe('suggestAlternativeSlots - Proximity Sorting', () => {
    it('should sort slots by proximity to requested time', async () => {
      const doctorId = 'doctor-1';
      const requestedSlot = '2026-01-14T15:30:00Z'; // 3:30 PM
      
      (prisma.doctor.findUnique as jest.Mock).mockResolvedValue({ 
        id: doctorId,
        doctorRegionalSettings: { bufferTimeBetween: 'Minutes_10', defaultAppointmentDuration: 'Minutes_30' }
      });
      (prisma.doctorWeeklySchedule.findUnique as jest.Mock).mockResolvedValue({ 
        day: 'WEDNESDAY', 
        firstHalfStartTime: '08:00', 
        firstHalfEndTime: '17:00' 
      });
      (prisma.appointmentType.findUnique as jest.Mock).mockResolvedValue({ id: 'type-1', duration: 30 });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.suggestAlternativeSlots({
        doctor_id: doctorId,
        requested_slot: requestedSlot,
        appointment_type_id: 'type-1'
      });

      // Requested: 15:30
      // Proximity sorting should have 15:30 first
      expect(result.alternative_slots[0].time).toBe('15:30');
      // 15:00 and 16:00 are equally close (30 mins). Either order is fine, but current sort is stable.
      const nextTimes = [result.alternative_slots[1].time, result.alternative_slots[2].time];
      expect(nextTimes).toContain('16:00');
      expect(nextTimes).toContain('15:00');
    });
  });
});
