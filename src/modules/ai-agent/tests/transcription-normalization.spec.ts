import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentService } from '../ai-agent.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AiAgentService - Transcription Normalization', () => {
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

  describe('wordsToDigits - Normalization', () => {
    it('should join comma-separated digits', () => {
      const input = 'my phone number is 0, 6, 6, 0, 4, 8, 9, 5, 2, 5, 2';
      const expected = 'my phone number is 06604895252';
      expect((service as any).wordsToDigits(input)).toBe(expected);
    });

    it('should join space-separated digits', () => {
      const input = 'insurance id is 1 2 3 4 5 6 7 8 9 0';
      const expected = 'insurance id is 1234567890';
      expect((service as any).wordsToDigits(input)).toBe(expected);
    });

    it('should join mixed spoken words and digit sequences', () => {
      const input = 'uh, zero, 6, 6, 0, 4, eight, 9, 5, 2, 5, 2';
      const expected = 'uh, 06604895252';
      expect((service as any).wordsToDigits(input)).toBe(expected);
    });

    it('should leave standalone digits or other numbers alone', () => {
      const input = 'i have 2 apples and 10 oranges';
      const expected = 'i have 2 apples and 10 oranges';
      expect((service as any).wordsToDigits(input)).toBe(expected);
    });

    it('should handle multiple sequences in one text', () => {
      const input = 'phone 0, 6, 6 and id 1 2 3';
      const expected = 'phone 066 and id 123';
      expect((service as any).wordsToDigits(input)).toBe(expected);
    });

    it('should handle large transcription provided in the request', () => {
        const input = "hi there! i can help you schedule, reschedule, or cancel appointments. what would you like to do?\ni would like to cancel, uh, to sh- schedule appointment.\ni'd be happy to help you book an appointment. may i have your full name, please?\nnikola kolezic.\nthank you, nikola. and what's your phone number, please?\nuh, 0, 6, 6, 0, 4, 8, 9, 5, 2, 5, 2.\nthank you, nikola. i have your phone number as 0 6 6 0 4 8 9 5 2 5 2. what is the reason for your visit today?\nuh, it's a blood test.\nokay, a blood test. do you have an email address i can add to your file? it's optional, but recommended.\ntest@gmail.com.\nthank you. and could you please provide your 10-digit insurance id?\n...\ni noticed you didn't provide your insurance id. could you please provide your 10-digit insurance id?\n...\nthe insurance id must be exactly 10 digits. please provide a 10-digit insurance id.\n1, 2, 3, 4, 5, 6, 7, 8, 9, 0.\nthank you. now that i have your insurance id, what date would you like to book your blood test appointment?\ntomorrow at 10:00 am.\nlet me check the availability for a blood test tomorrow at 10 am for you.\nyes, we have many slots available tomorrow, january thirteenth, including ten am. would you like to book your blood test for tomorrow at ten am?\nyes.\ngreat, i'm now booking your blood test appointment for tomorrow at 10 am.\nyour blood test appointment for tomorrow, january thirteenth, at ten am has been successfully booked.\n\nis there anything else i can help you with today?";
        
        const result = (service as any).wordsToDigits(input);
        
        expect(result).toContain('phone number as 06604895252');
        expect(result).toContain('provide a 10-digit insurance id.\n1234567890');
    });
  });
});
