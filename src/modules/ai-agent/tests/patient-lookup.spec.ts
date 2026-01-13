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
      create: jest.fn(),
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
});
