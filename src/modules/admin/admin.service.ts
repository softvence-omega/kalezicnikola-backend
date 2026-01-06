import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetDoctorsDto } from './dto/get-doctors.dto';
import { GetDoctorSubscriptionsDto } from './dto/get-doctor-subscriptions.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
        // Determine subscription status
        if (subscription.isActive) {
          if (subscription.status === 'ACTIVE') {
            status = 'Active';
          } else if (subscription.planType === 'TRIAL') {
            status = 'Trial';
          } else {
            status = 'Active';
          }
        } else {
          status = 'Inactive';
        }

        plan = subscription.planType || 'N/A';
        mrr = subscription.minutesAllocated || 0;
      }

      // Apply status filter if provided
      if (query.status) {
        const normalizedStatus = query.status.toLowerCase();
        if (normalizedStatus === 'active' && status !== 'Active' && status !== 'Trial') {
          return null;
        } else if (normalizedStatus === 'inactive' && status !== 'Inactive' && status !== 'No Subscription') {
          return null;
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
}
