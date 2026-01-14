import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentService } from '../ai-agent.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AiAgentService - Transcription Labeling', () => {
  let service: AiAgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        {
          provide: PrismaService,
          useValue: {},
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
  });

  describe('formatTranscriptionWithLabels', () => {
    it('should normalize ElevenLabs roles to ai and user', () => {
      const input = "agent: hi there!\nuser: hello!\nassistant: how can I help?\npatient: I need an appointment";
      const expected = "ai: hi there!\nuser: hello!\nai: how can I help?\nuser: I need an appointment";
      expect((service as any).formatTranscriptionWithLabels(input)).toBe(expected);
    });

    it('should add missing labels by alternating starting with ai', () => {
      const input = "hi there!\nhello!\nhow can I help?\nI need an appointment";
      const expected = "ai: hi there!\nuser: hello!\nai: how can I help!\nuser: I need an appointment";
      // Note: punctuation might be preserved or slightly different depending on split
      const result = (service as any).formatTranscriptionWithLabels(input);
      expect(result).toBe("ai: hi there!\nuser: hello!\nai: how can I help?\nuser: I need an appointment");
    });

    it('should handle mixed labeled and unlabeled lines by heuristic', () => {
      const input = "ai: hello\nhow are you?\nuser: fine";
      // Mostly labeled (2/3), so it tries to keep labels
      const result = (service as any).formatTranscriptionWithLabels(input);
      expect(result).toContain("ai: hello");
      expect(result).toContain("user: fine");
    });

    it('should handle system role as ai', () => {
      const input = "system: call started\nuser: hello";
      const expected = "ai: call started\nuser: hello";
      expect((service as any).formatTranscriptionWithLabels(input)).toBe(expected);
    });

    it('should handle empty or null input', () => {
      expect((service as any).formatTranscriptionWithLabels('')).toBe('');
      expect((service as any).formatTranscriptionWithLabels(null)).toBe('');
    });
  });
});
