import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetDoctorsDto } from './dto/get-doctors.dto';

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
}
