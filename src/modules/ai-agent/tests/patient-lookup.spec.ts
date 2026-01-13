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

      expect(prisma.patient.findUnique).toHaveBeenCalled();
      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { phone: '1234567890' }
      });
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
      
      expect(response.reply_text).toContain('I found multiple appointments for you');
      expect(response.action).toBe('ask_identity');
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
});
