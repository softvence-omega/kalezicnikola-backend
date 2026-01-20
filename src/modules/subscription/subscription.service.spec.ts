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
                findFirst: jest.fn(),
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

    describe('assignTrialPlan', () => {
        const userId = 'user-123';
        const adminId = 'admin-123';
        const mockUser = { id: userId, email: 'test@test.com', firstName: 'Test', lastName: 'User' };
        const mockTrialPlan = { minutes: 1000, features: {} };

        beforeEach(() => {
            prisma.doctor.findUnique.mockResolvedValue(mockUser);
            prisma.subscriptionPlan.findUnique.mockResolvedValue(mockTrialPlan);
            prisma.subscription.findUnique.mockResolvedValue(null);
            service['archiveCurrentSubscription'] = jest.fn(); // Mock private method
        });

        it('should assign LIFETIME trial by default when no type is specified', async () => {
            prisma.subscription.create.mockImplementation((args) => ({ ...args.data, id: 'sub-1' }));

            await service.assignTrialPlan(userId, adminId);

            expect(prisma.subscription.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    planType: 'TRIAL',
                    billingCycle: 'LIFETIME',
                    currentPeriodEnd: new Date('2099-12-31T23:59:59Z'),
                })
            }));
        });

        it('should assign LIFETIME trial explicitly', async () => {
            prisma.subscription.create.mockImplementation((args) => ({ ...args.data, id: 'sub-1' }));

            await service.assignTrialPlan(userId, adminId, { trialType: 'LIFETIME' });

            expect(prisma.subscription.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    planType: 'TRIAL',
                    billingCycle: 'LIFETIME',
                    currentPeriodEnd: new Date('2099-12-31T23:59:59Z'),
                })
            }));
        });

        it('should assign 7-DAY trial with correct dates', async () => {
            prisma.subscription.create.mockImplementation((args) => ({ ...args.data, id: 'sub-1' }));
            const startDate = '2024-01-01T00:00:00.000Z';

            await service.assignTrialPlan(userId, adminId, { trialType: 'SEVEN_DAYS', startDate });

            const expectedEndDate = new Date(startDate);
            expectedEndDate.setDate(expectedEndDate.getDate() + 7);

            expect(prisma.subscription.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    planType: 'TRIAL',
                    billingCycle: 'SEVEN_DAYS',
                    currentPeriodStart: new Date(startDate),
                    currentPeriodEnd: expectedEndDate,
                })
            }));
        });

        it('should update existing subscription correctly', async () => {
            prisma.subscription.findUnique.mockResolvedValue({ id: 'existing', userId });
            prisma.subscription.update.mockImplementation((args) => ({ ...args.data, id: 'existing' }));

            await service.assignTrialPlan(userId, adminId, { trialType: 'SEVEN_DAYS', startDate: '2024-01-01' });

            expect(service['archiveCurrentSubscription']).toHaveBeenCalledWith(userId);
            expect(prisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId },
                data: expect.objectContaining({
                    planType: 'TRIAL',
                    currentPeriodEnd: expect.any(Date),
                })
            }));
        });
    });

    describe('getCurrentSubscription', () => {
        const userId = 'user-123';

        it('should return subscription details for 7-DAY trial using LIFETIME plan details', async () => {
            const mockSubscription = {
                userId,
                planType: 'TRIAL',
                billingCycle: 'SEVEN_DAYS', // Matches new enum
                status: 'ACTIVE',
                minutesAllocated: 8000,
                currentPeriodEnd: new Date('2024-01-08'),
            };

            const mockPlanDetails = {
                planType: 'TRIAL',
                billingCycle: 'LIFETIME', // The plan in DB
                name: 'Trial Plan',
                price: 0,
                minutes: 8000,
                features: [],
            };

            prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
            // Verify it calls with correct search parameters
            prisma.subscriptionPlan.findFirst.mockImplementation((args) => {
                if (args.where.planType === 'TRIAL' && args.where.billingCycle === 'LIFETIME') {
                    return Promise.resolve(mockPlanDetails);
                }
                return Promise.resolve(null);
            });

            const result = await service.getCurrentSubscription(userId);

            expect(result.planType).toBe('TRIAL');
            expect(result.billingCycle).toBe('SEVEN_DAYS');
            expect(result.accessMessage).toContain('Trial ends on');
            expect(prisma.subscriptionPlan.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    planType: 'TRIAL',
                    billingCycle: 'LIFETIME', // Must have been swapped
                }
            }));
        });
    });
});
