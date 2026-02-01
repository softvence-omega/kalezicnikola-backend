import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { deleteFileFromUploads } from 'src/utils/file-delete.util';
import { GetDoctorsDto } from './dto/get-doctors.dto';
import { GetDoctorSubscriptionsDto } from './dto/get-doctor-subscriptions.dto';
import { GetDashboardStatsDto } from './dto/get-dashboard-stats.dto';
import { GetRevenueGraphDto } from './dto/get-revenue-graph.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  async getAllDoctors(query: GetDoctorsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.speciality && query.speciality.length > 0) {
      where.specialities = { hasSome: query.speciality };
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    if (query.experience) {
      where.experience = { contains: query.experience, mode: 'insensitive' };
    }

    // Filter for doctors added in the last 7 days
    if (query.last7Days) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.createdAt = {
        gte: sevenDaysAgo
      };
    }

    const total = await this.prisma.doctor.count({ where });

    if (total === 0) {
      return {
        doctors: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          previous: null,
          next: null,
        },
        message: 'No doctors found matching your criteria.',
      };
    }

    const doctors = await this.prisma.doctor.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        specialities: true,
        experience: true,
        photo: true,
        gender: true,
        address: true,
        createdAt: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        previous: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
      },
      doctors,
    };
  }

  async getAllUsers(query: GetUsersDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    let adminWhere: any = {};
    let doctorWhere: any = {};

    // Apply search filter
    if (query.search) {
      const searchCondition = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ]
      };
      adminWhere = { ...adminWhere, ...searchCondition };
      doctorWhere = { ...doctorWhere, ...searchCondition };
    }

    // Apply email verified filter
    if (query.emailVerified !== undefined) {
      if (query.emailVerified) {
        adminWhere.emailVerifiedAt = { not: null };
        doctorWhere.emailVerifiedAt = { not: null };
      } else {
        adminWhere.emailVerifiedAt = null;
        doctorWhere.emailVerifiedAt = null;
      }
    }

    // Apply two factor enabled filter
    if (query.twoFactorEnabled !== undefined) {
      adminWhere.twoFactorEnabled = query.twoFactorEnabled;
      doctorWhere.twoFactorEnabled = query.twoFactorEnabled;
    }

    // Get counts
    let total = 0;
    if (!query.role || query.role === 'ADMIN') {
      total += await this.prisma.admin.count({ where: adminWhere });
    }
    if (!query.role || query.role === 'DOCTOR') {
      total += await this.prisma.doctor.count({ where: doctorWhere });
    }

    // Get data
    const users: any[] = [];

    if (!query.role || query.role === 'ADMIN') {
      const admins = await this.prisma.admin.findMany({
        where: adminWhere,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          photo: true,
          emailVerifiedAt: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: users.length,
        take: Math.max(0, limit - users.length),
      });

      users.push(...admins.map(admin => ({
        id: admin.id,
        role: 'ADMIN',
        userId: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: null,
        photo: admin.photo,
        specialities: null,
        emailVerified: !!admin.emailVerifiedAt,
        twoFactorEnabled: admin.twoFactorEnabled || false,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      })));
    }

    if ((!query.role || query.role === 'DOCTOR') && users.length < limit) {
      const doctors = await this.prisma.doctor.findMany({
        where: doctorWhere,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          photo: true,
          specialities: true,
          emailVerifiedAt: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: Math.max(0, skip - (query.role === 'DOCTOR' ? 0 : await this.prisma.admin.count({ where: adminWhere }))),
        take: Math.max(0, limit - users.length),
      });

      users.push(...doctors.map(doctor => ({
        id: doctor.id,
        role: 'DOCTOR',
        userId: doctor.id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        phone: doctor.phone,
        photo: doctor.photo,
        specialities: doctor.specialities,
        emailVerified: !!doctor.emailVerifiedAt,
        twoFactorEnabled: doctor.twoFactorEnabled || false,
        lastLoginAt: doctor.lastLoginAt,
        createdAt: doctor.createdAt,
      })));
    }

    const totalPages = Math.ceil(total / limit);

    return {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        previous: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
      },
      users,
    };
  }

  async deleteUser(id: string) {
    try {
      // First try to find the user as an admin
      const admin = await this.prisma.admin.findUnique({
        where: { id },
        include: { user: true }
      });

      if (admin) {
        // Delete admin and related user record
        await this.prisma.admin.delete({
          where: { id }
        });

        if (admin.user) {
          await this.prisma.user.delete({
            where: { id: admin.user.id }
          });
        }

        return {
          statusCode: 200,
          success: true,
          message: `ADMIN with ID ${id} deleted successfully`,
        };
      }

      // If not found as admin, try to find as doctor
      const doctor = await this.prisma.doctor.findUnique({
        where: { id },
        include: { user: true }
      });

      if (doctor) {
        // Delete doctor and all related records first
        await this.prisma.doctorNotificationSettings.deleteMany({
          where: { doctorId: id }
        });

        await this.prisma.doctorRegionalSettings.deleteMany({
          where: { doctorId: id }
        });

        await this.prisma.doctorSecuritySettings.deleteMany({
          where: { doctorId: id }
        });

        await this.prisma.doctorWeeklySchedule.deleteMany({
          where: { doctorId: id }
        });

        await this.prisma.staff.deleteMany({
          where: { doctorId: id }
        });

        await this.prisma.subscriptionHistory.deleteMany({
          where: { userId: id }
        });

        // Delete subscription if exists
        const subscription = await this.prisma.subscription.findFirst({
          where: { userId: id }
        });
        if (subscription) {
          await this.prisma.subscription.delete({
            where: { id: subscription.id }
          });
        }

        // Delete the doctor record
        await this.prisma.doctor.delete({
          where: { id }
        });

        if (doctor.user) {
          await this.prisma.user.delete({
            where: { id: doctor.user.id }
          });
        }

        return {
          statusCode: 200,
          success: true,
          message: `DOCTOR with ID ${id} deleted successfully`,
        };
      }

      // User not found in either table
      return {
        statusCode: 404,
        success: false,
        message: `User with ID ${id} not found`,
      };

    } catch (error) {
      // Handle foreign key constraint errors
      if (error.code === 'P2002') {
        return {
          statusCode: 400,
          success: false,
          message: `Cannot delete user due to existing dependencies`,
        };
      }

      if (error.code === 'P2025') {
        return {
          statusCode: 404,
          success: false,
          message: `User with ID ${id} not found`,
        };
      }

      return {
        statusCode: 500,
        success: false,
        message: `Failed to delete user: ${error.message}`,
      };
    }
  }

  async getDoctorSubscriptionSummary() {
    const totalDoctors = await this.prisma.doctor.count();

    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        isActive: true,
        status: 'ACTIVE'
      }
    });

    const trialSubscriptions = await this.prisma.subscription.count({
      where: {
        isActive: true,
        planType: 'TRIAL'
      }
    });

    const totalMRR = await this.prisma.subscription.aggregate({
      where: {
        isActive: true,
        status: 'ACTIVE'
      },
      _sum: {
        minutesAllocated: true
      }
    });

    return {
      totalCustomers: totalDoctors,
      active: activeSubscriptions,
      trial: trialSubscriptions,
      activeMRR: totalMRR._sum.minutesAllocated || 0
    };
  }

  async getDoctorSubscriptions(query: GetDoctorSubscriptionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.doctor.count({ where });

    if (total === 0) {
      return {
        subscriptions: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          previous: null,
          next: null,
        },
        message: 'No doctors found matching your criteria.',
      };
    }

    const doctors = await this.prisma.doctor.findMany({
      where,
      include: {
        subscription: true
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    const formattedSubscriptions = doctors.map(doctor => {
      const subscription = doctor.subscription;

      let status = 'No Subscription';
      let plan = 'No Plan';
      let mrr = 0;

      if (subscription) {
        // Show actual subscription status
        status = subscription.status || 'Unknown';

        // For trial plans, show "Trial" regardless of status
        if (subscription.planType === 'TRIAL') {
          status = 'Trial';
        }

        plan = subscription.planType || 'N/A';
        mrr = subscription.minutesAllocated || 0;
      }

      // Apply status filter if provided
      if (query.status) {
        const normalizedStatus = query.status.toLowerCase();
        if (normalizedStatus === 'active') {
          // Keep ACTIVE and TRIAL subscriptions
          if (status !== 'ACTIVE' && status !== 'Trial') {
            return null;
          }
        } else if (normalizedStatus === 'inactive') {
          // Keep CANCELLED, PAST_DUE, PENDING and No Subscription
          if (status === 'ACTIVE' || status === 'Trial') {
            return null;
          }
        }
      }

      return {
        doctorName: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Unknown',
        doctorId: doctor.id || 'N/A',
        plan,
        status,
        mrr,
        subscriptionId: subscription?.id || null,
        createdAt: subscription?.createdAt || doctor.createdAt,
        currentPeriodEnd: subscription?.currentPeriodEnd || null
      };
    }).filter(item => item !== null);

    const totalPages = Math.ceil(total / limit);

    return {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        previous: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
      },
      subscriptions: formattedSubscriptions,
    };
  }

  async getDoctorSubscriptionDetails(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        subscription: true,
        appointments: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        calls: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        prescriptions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!doctor) {
      return {
        statusCode: 404,
        message: 'Doctor not found',
        data: null
      };
    }

    const subscription = doctor.subscription;
    let subscriptionDetails: any = null;

    if (subscription) {
      subscriptionDetails = {
        id: subscription.id,
        planType: subscription.planType,
        status: subscription.status,
        isActive: subscription.isActive,
        minutesAllocated: subscription.minutesAllocated,
        minutesUsed: subscription.minutesUsed,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      };
    }

    return {
      statusCode: 200,
      message: 'Doctor subscription details retrieved successfully',
      data: {
        doctor: {
          id: doctor.id,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          email: doctor.email,
          phone: doctor.phone,
          photo: doctor.photo,
          specialities: doctor.specialities,
          experience: doctor.experience,
          gender: doctor.gender,
          address: doctor.address,
          licenceNo: doctor.licenceNo,
          createdAt: doctor.createdAt,
          updatedAt: doctor.updatedAt
        },
        subscription: subscriptionDetails,
        recentActivities: {
          appointments: doctor.appointments.map(apt => ({
            id: apt.id,
            status: apt.status,
            createdAt: apt.createdAt
          })),
          calls: doctor.calls.map(call => ({
            id: call.id,
            status: call.status,
            createdAt: call.createdAt
          })),
          prescriptions: doctor.prescriptions.map(pres => ({
            id: pres.id,
            status: pres.status,
            createdAt: pres.createdAt
          }))
        }
      }
    };
  }

  async getDashboardStats(query: GetDashboardStatsDto) {
    const { startDate, endDate } = query;
    const now = new Date();

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Previous month for comparison
    const previousStart = new Date(start);
    previousStart.setMonth(previousStart.getMonth() - 1);
    const previousEnd = new Date(start);
    previousEnd.setDate(0); // Last day of previous month

    // Helper function to get plan price
    const getPlanPrice = async (planType: string, billingCycle: string) => {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: {
          planType_billingCycle: {
            planType: planType as any,
            billingCycle: billingCycle as any
          }
        }
      });
      return plan?.price || 0;
    };

    // 1. Total MRR - Active subscriptions
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE'
      }
    });

    // Calculate total MRR by fetching plan prices
    let totalMrr = 0;
    for (const sub of activeSubscriptions) {
      if (sub.planType && sub.billingCycle) {
        const price = await getPlanPrice(sub.planType, sub.billingCycle);
        totalMrr += price;
      }
    }

    // 2. New MRR (Subscriptions created in the date range)
    const newSubscriptions = await this.prisma.subscription.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        isActive: true,
        status: 'ACTIVE'
      }
    });

    let newMrr = 0;
    for (const sub of newSubscriptions) {
      if (sub.planType && sub.billingCycle) {
        const price = await getPlanPrice(sub.planType, sub.billingCycle);
        newMrr += price;
      }
    }

    // 3. Churn MRR (Subscriptions cancelled in the date range)
    const churnedSubscriptions = await this.prisma.subscription.findMany({
      where: {
        cancelledAt: {
          gte: start,
          lte: end
        }
      }
    });

    let churnMrr = 0;
    for (const sub of churnedSubscriptions) {
      if (sub.planType && sub.billingCycle) {
        const price = await getPlanPrice(sub.planType, sub.billingCycle);
        churnMrr += price;
      }
    }

    // 4. Net Expansion MRR 
    const netExpansionMrr = newMrr - churnMrr;

    // 5. Customer Churn Rate
    const totalCustomersAtStart = await this.prisma.doctor.count({
      where: {
        createdAt: {
          lt: start
        }
      }
    });

    const churnedCount = churnedSubscriptions.length;
    const churnRate = totalCustomersAtStart > 0 ? (churnedCount / totalCustomersAtStart) * 100 : 0;

    // 6. Revenue Graph (Last 30 days or selected period)
    // Try to get revenue from invoices first
    let invoices = await this.prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        amountPaid: {
          gt: 0
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const revenueMap = new Map<string, number>();

    // If we have invoices, use them
    if (invoices.length > 0) {
      invoices.forEach(inv => {
        if (inv.createdAt) {
          const dateKey = inv.createdAt.toISOString().split('T')[0];
          const amount = (inv.amountPaid || 0) / 100; // Amount in cents
          revenueMap.set(dateKey, (revenueMap.get(dateKey) || 0) + amount);
        }
      });
    } else {
      // Fallback: Use subscription data to estimate revenue
      const subscriptionsInRange = await this.prisma.subscription.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          },
          status: 'ACTIVE'
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Calculate revenue based on subscription creation dates
      for (const sub of subscriptionsInRange) {
        if (sub.createdAt && sub.planType && sub.billingCycle) {
          const dateKey = sub.createdAt.toISOString().split('T')[0];
          const price = await getPlanPrice(sub.planType, sub.billingCycle);
          const amount = price / 100; // Convert to dollars
          revenueMap.set(dateKey, (revenueMap.get(dateKey) || 0) + amount);
        }
      }
    }

    const revenueGraph = Array.from(revenueMap.entries()).map(([date, amount]) => ({ date, amount }));

    // 7. Acquisition vs Churn (Percentages)
    const acquisitionCount = newSubscriptions.length;
    const totalCustomers = await this.prisma.doctor.count();

    // Calculate percentages
    const acquisitionPercentage = totalCustomers > 0 ? (acquisitionCount / totalCustomers) * 100 : 0;
    const churnPercentage = totalCustomers > 0 ? (churnedCount / totalCustomers) * 100 : 0;

    // 8. Calculate previous month metrics for growth percentages
    const previousActiveSubscriptions = await this.prisma.subscription.findMany({
      where: {
        createdAt: { lte: previousEnd },
        OR: [
          { cancelledAt: null },
          { cancelledAt: { gt: previousEnd } }
        ],
        status: 'ACTIVE'
      }
    });

    let previousTotalMrr = 0;
    for (const sub of previousActiveSubscriptions) {
      if (sub.planType && sub.billingCycle) {
        const price = await getPlanPrice(sub.planType, sub.billingCycle);
        previousTotalMrr += price;
      }
    }

    // Previous month New MRR
    const previousNewSubscriptions = await this.prisma.subscription.findMany({
      where: {
        createdAt: {
          gte: previousStart,
          lte: previousEnd
        },
        isActive: true,
        status: 'ACTIVE'
      }
    });

    let previousNewMrr = 0;
    for (const sub of previousNewSubscriptions) {
      if (sub.planType && sub.billingCycle) {
        const price = await getPlanPrice(sub.planType, sub.billingCycle);
        previousNewMrr += price;
      }
    }

    // Previous month Churn MRR
    const previousChurnedSubscriptions = await this.prisma.subscription.findMany({
      where: {
        cancelledAt: {
          gte: previousStart,
          lte: previousEnd
        }
      }
    });

    let previousChurnMrr = 0;
    for (const sub of previousChurnedSubscriptions) {
      if (sub.planType && sub.billingCycle) {
        const price = await getPlanPrice(sub.planType, sub.billingCycle);
        previousChurnMrr += price;
      }
    }

    // Previous month Net Expansion MRR
    const previousNetExpansionMrr = previousNewMrr - previousChurnMrr;

    // Previous month Customer Churn Rate
    const previousTotalCustomersAtStart = await this.prisma.doctor.count({
      where: {
        createdAt: {
          lt: previousStart
        }
      }
    });

    const previousChurnedCount = previousChurnedSubscriptions.length;
    const previousChurnRate = previousTotalCustomersAtStart > 0 ? (previousChurnedCount / previousTotalCustomersAtStart) * 100 : 0;

    // Calculate growth percentages
    const totalMrrGrowth = previousTotalMrr > 0 ? ((totalMrr - previousTotalMrr) / previousTotalMrr) * 100 : 0;
    const newMrrGrowth = previousNewMrr > 0 ? ((newMrr - previousNewMrr) / previousNewMrr) * 100 : 0;
    const churnMrrGrowth = previousChurnMrr > 0 ? ((churnMrr - previousChurnMrr) / previousChurnMrr) * 100 : 0;
    const netExpansionMrrGrowth = previousNetExpansionMrr !== 0 ? ((netExpansionMrr - previousNetExpansionMrr) / Math.abs(previousNetExpansionMrr)) * 100 : 0;
    const churnRateGrowth = previousChurnRate > 0 ? ((churnRate - previousChurnRate) / previousChurnRate) * 100 : 0;


    return {
      totalMrr,
      totalMrrGrowth,
      newMrr,
      newMrrGrowth,
      churnMrr,
      churnMrrGrowth,
      netExpansionMrr,
      netExpansionMrrGrowth,
      customerChurnRate: churnRate,
      customerChurnRateGrowth: churnRateGrowth,
      acquisitionVsChurn: {
        acquisition: acquisitionPercentage,
        churn: churnPercentage
      }
    };
  }


  async getRevenueGraph(query: GetRevenueGraphDto) {
    const { startDate, endDate } = query;
    const now = new Date();

    // Use provided dates or default to current month
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Helper to get all dates in a range
    const getAllDatesInRange = (start: Date, end: Date): string[] => {
      const dates: string[] = [];
      const current = new Date(start);

      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      return dates;
    };

    // Get revenue data for the period
    let invoices = await this.prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        amountPaid: {
          gt: 0
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const revenueMap = new Map<string, number>();

    if (invoices.length > 0) {
      invoices.forEach(inv => {
        if (inv.createdAt) {
          const dateKey = inv.createdAt.toISOString().split('T')[0];
          const amount = (inv.amountPaid || 0) / 100;
          revenueMap.set(dateKey, (revenueMap.get(dateKey) || 0) + amount);
        }
      });
    } else {
      // Fallback: Use subscription data
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          },
          status: 'ACTIVE'
        }
      });

      for (const sub of subscriptions) {
        if (sub.createdAt && sub.planType && sub.billingCycle) {
          const dateKey = sub.createdAt.toISOString().split('T')[0];
          const plan = await this.prisma.subscriptionPlan.findUnique({
            where: {
              planType_billingCycle: {
                planType: sub.planType as any,
                billingCycle: sub.billingCycle as any
              }
            }
          });
          const amount = (plan?.price || 0) / 100;
          revenueMap.set(dateKey, (revenueMap.get(dateKey) || 0) + amount);
        }
      }
    }

    // Calculate total revenue
    const totalRevenue = Array.from(revenueMap.values()).reduce((acc, val) => acc + val, 0);

    // Fill in all dates with 0 if missing and calculate percentages
    const allDates = getAllDatesInRange(start, end);
    const data = allDates.map(date => {
      const amount = revenueMap.get(date) || 0;
      const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;

      return {
        date,
        amount,
        percentage
      };
    });

    return {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      totalRevenue,
      data
    };
  }

  async getMyProfile(adminId: string) {
    // Validate adminId parameter
    if (!adminId) {
      throw new BadRequestException('Admin ID is required');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        photo: true,
        phone: true,
        dob: true,
        address: true,
        gender: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        failedLoginAttempts: true,
        lastPasswordChangeAt: true,
        user: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
    });

    if (!admin) {
      return {
        statusCode: 404,
        success: false,
        message: 'Admin not found',
      };
    }

    return {
      statusCode: 200,
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        ...admin,
        isEmailVerified: !!admin.emailVerifiedAt,

      }
    };
  }

  async updateMyProfile(adminId: string, dto: any, file?: Express.Multer.File) {
    console.log(`[AdminService] Updating profile for admin: ${adminId}`);
    console.log(`[AdminService] Received data:`, dto);
    console.log(`[AdminService] File uploaded:`, file ? file.filename : 'No file');

    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return {
        statusCode: 404,
        success: false,
        message: 'Admin not found',
      };
    }

    console.log(`[AdminService] Found admin:`, admin.email);

    // Check if email is being changed and if it's already in use
    if (dto.email && dto.email !== admin.email) {
      const existingEmail = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (existingEmail) {
        return {
          statusCode: 400,
          success: false,
          message: 'Email already in use',
        };
      }
    }

    // Build update data object, only including defined fields
    const updateData: any = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.dob !== undefined) updateData.dob = dto.dob ? new Date(dto.dob) : null;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.photo !== undefined) updateData.photo = dto.photo;

    console.log(`[AdminService] Update data:`, updateData);

    const updatedAdmin = await this.prisma.admin.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        photo: true,
        phone: true,
        dob: true,
        address: true,
        gender: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Handle photo deletion - delete old photo if new one is successfully saved
    if (dto.photo !== undefined) {
      // Delete old photo if it exists and is different from the new one
      if (admin.photo && admin.photo !== updatedAdmin.photo) {
        console.log(`[AdminService] Deleting old photo: ${admin.photo}`);
        await deleteFileFromUploads(admin.photo);
      }
    }

    console.log(`[AdminService] Profile updated successfully for:`, updatedAdmin.email);

    return {
      statusCode: 200,
      success: true,
      message: 'Profile updated successfully',
      data: updatedAdmin,
    };
  }
}
