import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UpdateDoctorProfileDto } from './dto/update-profile.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CheckEmploymentIdDto } from './dto/check-employment-id.dto';
import { deleteFileFromUploads } from 'src/utils/file-delete.util';

@Injectable()
export class DoctorService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ----------------- GET MY PROFILE -------------------
  async getMyProfile(accessToken: string) {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    // Get complete doctor profile
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: session.doctorId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        licenceNo: true,
        specialities: true,
        experience: true,
        dob: true,
        photo: true,
        gender: true,
        address: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // Include clinic information if available
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new UnauthorizedException('Doctor profile not found');
    }

    return {
      profile: doctor,
    };
  }

  // ----------------- UPDATE MY PROFILE -------------------
  async updateMyProfile(accessToken: string, dto: UpdateDoctorProfileDto) {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Check if email is being updated and if it's already in use
    if (dto.email && dto.email !== session.doctor.email) {
      const emailExists = await this.prisma.doctor.findFirst({
        where: {
          email: dto.email,
          id: { not: doctorId },
        },
      });

      if (emailExists) {
        throw new BadRequestException('Email is already in use');
      }

      // Also check in admin table
      const adminEmailExists = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (adminEmailExists) {
        throw new BadRequestException('Email is already in use');
      }
    }

    // Check if phone is being updated and if it's already in use
    if (dto.phone && dto.phone !== session.doctor.phone) {
      const phoneExists = await this.prisma.doctor.findFirst({
        where: {
          phone: dto.phone,
          id: { not: doctorId },
        },
      });

      if (phoneExists) {
        throw new BadRequestException('Phone number is already in use');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.licenceNo !== undefined) updateData.licenceNo = dto.licenceNo;
    if (dto.specialities !== undefined) updateData.specialities = dto.specialities;
    if (dto.experience !== undefined) updateData.experience = dto.experience;
    if (dto.dob !== undefined) updateData.dob = new Date(dto.dob);
    if (dto.photo !== undefined) updateData.photo = dto.photo;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.address !== undefined) updateData.address = dto.address;

    // Update doctor profile
    const updatedDoctor = await this.prisma.doctor.update({
      where: { id: doctorId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        licenceNo: true,
        specialities: true,
        experience: true,
        dob: true,
        photo: true,
        gender: true,
        address: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return {
      profile: updatedDoctor,
    };
  }

  // ----------------- ADD STAFF -------------------
  async addStaff(accessToken: string, dto: CreateStaffDto) {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Handle employmentId - use provided one or generate new one
    let employmentId: string = '';

    if (dto.employmentId) {
      // If employmentId is provided, check if it already exists
      const existingStaff = await this.prisma.staff.findUnique({
        where: { employmentId: dto.employmentId },
      });

      if (existingStaff) {
        throw new ConflictException(`Employment ID ${dto.employmentId} already exists`);
      }

      employmentId = dto.employmentId;
    } else {
      // Generate unique employmentId in pattern STF-XXXXXXXX
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        // Generate 8 random digits
        const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
        employmentId = `STF-${randomDigits}`;

        // Check if employmentId already exists
        const existingStaff = await this.prisma.staff.findUnique({
          where: { employmentId },
        });

        if (!existingStaff) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new BadRequestException('Failed to generate unique employment ID. Please try again.');
      }
    }

    // Check if email is already in use by another staff member
    const emailExists = await this.prisma.staff.findFirst({
      where: { email: dto.email },
    });

    if (emailExists) {
      throw new ConflictException('Email is already in use by another staff member');
    }

    // Check if phone is already in use by another staff member
    const phoneExists = await this.prisma.staff.findFirst({
      where: { phone: dto.phone },
    });

    if (phoneExists) {
      throw new ConflictException('Phone number is already in use by another staff member');
    }

    // Create staff record
    const staff = await this.prisma.staff.create({
      data: {
        employmentId,
        doctorId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dob: new Date(dto.dob),
        gender: dto.gender,
        photo: dto.photo,
        email: dto.email,
        phone: dto.phone,
        presentAddress: dto.presentAddress,
        permanentAddress: dto.permanentAddress,
        maritalStatus: dto.maritalStatus,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        nationality: dto.nationality,
        nationalIdNumber: dto.nationalIdNumber,
        department: dto.department,
        position: dto.position,
        description: dto.description,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : null,
        employmentType: dto.employmentType,
        workSchedule: dto.workSchedule,
        weeklyHours: dto.weeklyHours,
        employmentStatus: dto.employmentStatus,
      },
      select: {
        id: true,
        employmentId: true,
        firstName: true,
        lastName: true,
        dob: true,
        gender: true,
        photo: true,
        email: true,
        phone: true,
        presentAddress: true,
        permanentAddress: true,
        maritalStatus: true,
        state: true,
        postalCode: true,
        country: true,
        nationality: true,
        nationalIdNumber: true,
        department: true,
        position: true,
        description: true,
        joinDate: true,
        employmentType: true,
        workSchedule: true,
        weeklyHours: true,
        employmentStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      staff,
    };
  }

  // ----------------- CHECK EMPLOYMENT ID AVAILABILITY -------------------
  async checkEmploymentIdAvailability(accessToken: string, employmentId: string) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    // Validate employmentId format
    const employmentIdPattern = /^STF-\d+$/;
    if (!employmentIdPattern.test(employmentId)) {
      throw new BadRequestException('Employment ID must start with STF- followed by digits');
    }

    // Check if the provided employment ID exists
    const existingStaff = await this.prisma.staff.findUnique({
      where: { employmentId },
    });

    if (existingStaff) {
      // Employment ID already exists - generate a suggestion
      let suggestedId: string = '';
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        // Generate 8 random digits
        const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
        suggestedId = `STF-${randomDigits}`;

        // Check if suggested ID already exists
        const existingSuggestion = await this.prisma.staff.findUnique({
          where: { employmentId: suggestedId },
        });

        if (!existingSuggestion) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new BadRequestException('Failed to generate a unique employment ID suggestion. Please try again.');
      }

      return {
        exists: true,
        requestedId: employmentId,
        suggestedId: suggestedId,
        message: `Employment ID ${employmentId} already exists. Suggested new ID: ${suggestedId}`,
      };
    } else {
      // Employment ID is available - no suggestion needed
      return {
        exists: false,
        requestedId: employmentId,
        message: `Employment ID ${employmentId} is available`,
      };
    }
  }

  // ----------------- GET ALL STAFFS -------------------
  async getAllStaffs(accessToken: string, query: any) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Extract pagination parameters
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Build where clause for filtering
    const where: any = { doctorId };

    // Search functionality - searches across multiple fields
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { employmentId: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filter by department
    if (query.department) {
      where.department = query.department;
    }

    // Filter by position
    if (query.position) {
      where.position = { contains: query.position, mode: 'insensitive' };
    }

    // Filter by employment status
    if (query.employmentStatus) {
      where.employmentStatus = query.employmentStatus;
    }

    // Filter by employment type
    if (query.employmentType) {
      where.employmentType = query.employmentType;
    }

    // Filter by gender
    if (query.gender) {
      where.gender = query.gender;
    }

    // Filter by join date range
    if (query.joinDateFrom || query.joinDateTo) {
      where.joinDate = {};
      if (query.joinDateFrom) {
        where.joinDate.gte = new Date(query.joinDateFrom);
      }
      if (query.joinDateTo) {
        where.joinDate.lte = new Date(query.joinDateTo);
      }
    }

    // Get total count for pagination metadata
    const total = await this.prisma.staff.count({ where });

    // Check if no staff found and return with message
    if (total === 0) {
      const hasFilters = query.search || query.department || query.position || 
                         query.employmentStatus || query.employmentType || 
                         query.gender || query.joinDateFrom || query.joinDateTo;

      const message = hasFilters 
        ? 'No staff members found matching your search criteria'
        : 'No staff members found. You haven\'t added any staff yet.';

      return {
        staffs: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        message, // This will be used by controller for top-level message
      };
    }

    // Fetch staffs with pagination and sorting
    const staffs = await this.prisma.staff.findMany({
      where,
      select: {
        id: true,
        employmentId: true,
        firstName: true,
        lastName: true,
        joinDate: true,
        position: true,
        phone: true,
        email: true,
        department: true,
        employmentStatus: true,
        employmentType: true,
        gender: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    return {
      staffs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ----------------- GET SINGLE STAFF -------------------
  async getSingleStaff(accessToken: string, staffId: string) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Fetch staff by ID and verify it belongs to this doctor
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new BadRequestException('Staff member not found');
    }

    if (staff.doctorId !== doctorId) {
      throw new UnauthorizedException('You do not have permission to access this staff member');
    }

    return {
      staff,
    };
  }

  // ----------------- DELETE STAFF -------------------
  async deleteStaff(accessToken: string, staffId: string) {
    // Find session to verify doctor authentication
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Fetch staff by ID and verify it belongs to this doctor
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new BadRequestException('Staff member not found');
    }

    if (staff.doctorId !== doctorId) {
      throw new UnauthorizedException('You do not have permission to delete this staff member');
    }

    // Delete the staff
    await this.prisma.staff.delete({
      where: { id: staffId },
    });

    // Delete the staff photo if it exists
    if (staff.photo) {
      await deleteFileFromUploads(staff.photo);
    }

    return {
      message: 'Staff member deleted successfully',
    };
  }
}

