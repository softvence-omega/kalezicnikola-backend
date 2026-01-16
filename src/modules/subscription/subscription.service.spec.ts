import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockStripe = {
    subscriptions: {
        create: jest.fn(),
    },
    customers: {
        create: jest.fn(),
    }
};

jest.mock('stripe', () => {
    return {
        default: jest.fn().mockImplementation(() => mockStripe),
        __esModule: true,
    };
});

describe('SubscriptionService', () => {
    let service: SubscriptionService;
    let prisma: any;

    beforeEach(async () => {
        const prismaMock = {
            doctor: {
                findUnique: jest.fn(),
            },
            subscription: {
                findUnique: jest.fn(),
                update: jest.fn(),
                create: jest.fn(),
            },
            subscriptionPlan: {
                findUnique: jest.fn(),
            },
        };

        const configMock = {
            get: jest.fn().mockReturnValue('fake_key'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: ConfigService, useValue: configMock },
            ],
        }).compile();

        service = module.get<SubscriptionService>(SubscriptionService);
        prisma = module.get<PrismaService>(PrismaService);

        // Silence console logs
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        // Mock seedSubscriptionPlans to avoid errors during init if it's called
        // (It's called in onModuleInit, which might not run in unit tests unless explicit, but good to be safe if constructor calls it - constructor doesn't call it)
    });

    describe('cancelTrialPlan', () => {
        const userId = 'user-123';
        const adminId = 'admin-123';

        it('should throw NotFoundException if user not found', async () => {
            prisma.doctor.findUnique.mockResolvedValue(null);
            await expect(service.cancelTrialPlan(userId, adminId)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw NotFoundException if subscription not found', async () => {
            prisma.doctor.findUnique.mockResolvedValue({ id: userId, email: 'test@test.com' });
            prisma.subscription.findUnique.mockResolvedValue(null);
            await expect(service.cancelTrialPlan(userId, adminId)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw BadRequestException if not a trial plan', async () => {
            prisma.doctor.findUnique.mockResolvedValue({ id: userId, email: 'test@test.com' });
            prisma.subscription.findUnique.mockResolvedValue({
                userId,
                planType: 'PRO',
            });
            await expect(service.cancelTrialPlan(userId, adminId)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should cancel trial plan successfully', async () => {
            prisma.doctor.findUnique.mockResolvedValue({ id: userId, email: 'test@test.com' });
            prisma.subscription.findUnique.mockResolvedValue({
                userId,
                planType: 'TRIAL',
                status: 'ACTIVE',
            });

            const mockUpdated = {
                userId,
                status: 'CANCELLED',
                planType: 'TRIAL',
                cancelledAt: new Date(),
            };
            prisma.subscription.update.mockResolvedValue(mockUpdated);

            const result = await service.cancelTrialPlan(userId, adminId);

            expect(prisma.subscription.update).toHaveBeenCalledWith({
                where: { userId },
                data: expect.objectContaining({
                    status: 'CANCELLED',
                    isActive: false,
                }),
            });
            expect(result.success).toBe(true);
        });
    });
});
