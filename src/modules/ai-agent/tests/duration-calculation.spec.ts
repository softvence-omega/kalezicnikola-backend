import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentService } from '../ai-agent.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AiAgentService - Call Duration', () => {
  let service: AiAgentService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        {
          provide: PrismaService,
          useValue: {
            callTranscription: {
              create: jest.fn(),
            },
            patient: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            appointment: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('saveTranscription - Duration Calculation', () => {
    it('should use duration when provided directly', async () => {
      const dto = {
        doctor_id: 'doctor-123',
        duration: 129, // 2 minutes 9 seconds
        phone_number: '01742460390',
        transcription: 'Test transcription',
        intent: 'BOOK_APPOINTMENT',
        sentiment: 'POSITIVE',
        summary: 'Test summary',
      };

      jest.spyOn(prisma.callTranscription, 'create').mockResolvedValue({
        id: 'test-id',
        duration: 129,
      } as any);

      await service.saveTranscription(dto);

      expect(prisma.callTranscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duration: 129,
          }),
        }),
      );
    });

    it('should calculate duration from timestamps when duration not provided', async () => {
      const startTime = '2025-12-19T18:20:00.000Z';
      const endTime = '2025-12-19T18:22:09.000Z'; // 2 minutes 9 seconds later

      const dto = {
        doctor_id: 'doctor-123',
        phone_number: '01742460390',
        call_started_at: startTime,
        call_ended_at: endTime,
        transcription: 'Test transcription',
        intent: 'BOOK_APPOINTMENT',
        sentiment: 'POSITIVE',
        summary: 'Test summary',
      };

      jest.spyOn(prisma.callTranscription, 'create').mockResolvedValue({
        id: 'test-id',
        duration: 129,
      } as any);

      await service.saveTranscription(dto);

      // Should calculate: (endTime - startTime) / 1000 = 129 seconds
      expect(prisma.callTranscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duration: 129,
          }),
        }),
      );
    });

    it('should save null duration when neither duration nor timestamps provided', async () => {
      const dto = {
        doctor_id: 'doctor-123',
        phone_number: '01742460390',
        transcription: 'Test transcription',
        intent: 'BOOK_APPOINTMENT',
        sentiment: 'POSITIVE',
        summary: 'Test summary',
      };

      jest.spyOn(prisma.callTranscription, 'create').mockResolvedValue({
        id: 'test-id',
        duration: null,
      } as any);

      await service.saveTranscription(dto);

      expect(prisma.callTranscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duration: undefined,
          }),
        }),
      );
    });

    it('should prefer direct duration over calculated duration', async () => {
      const dto = {
        doctor_id: 'doctor-123',
        duration: 100, // Direct duration
        phone_number: '01742460390',
        call_started_at: '2025-12-19T18:20:00.000Z',
        call_ended_at: '2025-12-19T18:22:09.000Z', // Would calculate to 129
        transcription: 'Test transcription',
        intent: 'BOOK_APPOINTMENT',
        sentiment: 'POSITIVE',
        summary: 'Test summary',
      };

      jest.spyOn(prisma.callTranscription, 'create').mockResolvedValue({
        id: 'test-id',
        duration: 100,
      } as any);

      await service.saveTranscription(dto);

      // Should use direct duration (100), not calculated (129)
      expect(prisma.callTranscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duration: 100,
          }),
        }),
      );
    });
  });
});
