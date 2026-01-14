import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UpdateDoctorProfileDto } from './dto/update-profile.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CheckEmploymentIdDto } from './dto/check-employment-id.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto';
import { GetAllSchedulesDto } from './dto/get-all-schedules.dto';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { GetAllAbsencesDto } from './dto/get-all-absences.dto';
import { deleteFileFromUploads } from 'src/utils/file-delete.util';

@Injectable()
export class DoctorService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ----------------- GET ALL DOCTORS -------------------
  async getAllDoctors() {
    const doctors = await this.prisma.doctor.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        specialities: true,
        experience: true,
        photo: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return doctors;
  }

  // ----------------- SEARCH DOCTORS -------------------
  async searchDoctors(query: string) {
    const searchTerm = query.toLowerCase();

    const doctors = await this.prisma.doctor.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        specialities: true,
        experience: true,
        photo: true,
        createdAt: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    return doctors;
  }

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
    if (dto.specialities !== undefined)
      updateData.specialities = dto.specialities;
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
        throw new ConflictException(
          `Employment ID ${dto.employmentId} already exists`,
        );
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
        throw new BadRequestException(
          'Failed to generate unique employment ID. Please try again.',
        );
      }
    }

    // Check if email is already in use by another staff member
    const emailExists = await this.prisma.staff.findFirst({
      where: { email: dto.email },
    });

    if (emailExists) {
      throw new ConflictException(
        'Email is already in use by another staff member',
      );
    }

    // Check if phone is already in use by another staff member
    const phoneExists = await this.prisma.staff.findFirst({
      where: { phone: dto.phone },
    });

    if (phoneExists) {
      throw new ConflictException(
        'Phone number is already in use by another staff member',
      );
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
  async checkEmploymentIdAvailability(
    accessToken: string,
    employmentId: string,
  ) {
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
      throw new BadRequestException(
        'Employment ID must start with STF- followed by digits',
      );
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
        throw new BadRequestException(
          'Failed to generate a unique employment ID suggestion. Please try again.',
        );
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
      const hasFilters =
        query.search ||
        query.department ||
        query.position ||
        query.employmentStatus ||
        query.employmentType ||
        query.gender ||
        query.joinDateFrom ||
        query.joinDateTo;

      const message = hasFilters
        ? 'No staff members found matching your search criteria'
        : "No staff members found. You haven't added any staff yet.";

      return {
        staffs: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          previous: null,
          next: null,
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
      staffs,
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
      throw new UnauthorizedException(
        'You do not have permission to access this staff member',
      );
    }

    return {
      staff,
    };
  }

  // ----------------- UPDATE STAFF -------------------
  async updateStaff(accessToken: string, staffId: string, dto: UpdateStaffDto) {
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
    const existingStaff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!existingStaff) {
      throw new BadRequestException('Staff member not found');
    }

    if (existingStaff.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to update this staff member',
      );
    }

    // Check if employmentId is being updated and if it already exists
    if (dto.employmentId && dto.employmentId !== existingStaff.employmentId) {
      const employmentIdExists = await this.prisma.staff.findUnique({
        where: { employmentId: dto.employmentId },
      });

      if (employmentIdExists) {
        throw new ConflictException(
          `Employment ID ${dto.employmentId} already exists`,
        );
      }
    }

    // Check if email is being updated and if it's already in use
    if (dto.email && dto.email !== existingStaff.email) {
      const emailExists = await this.prisma.staff.findFirst({
        where: {
          email: dto.email,
          id: { not: staffId },
        },
      });

      if (emailExists) {
        throw new ConflictException(
          'Email is already in use by another staff member',
        );
      }
    }

    // Check if phone is being updated and if it's already in use
    if (dto.phone && dto.phone !== existingStaff.phone) {
      const phoneExists = await this.prisma.staff.findFirst({
        where: {
          phone: dto.phone,
          id: { not: staffId },
        },
      });

      if (phoneExists) {
        throw new ConflictException(
          'Phone number is already in use by another staff member',
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (dto.employmentId !== undefined)
      updateData.employmentId = dto.employmentId;
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.dob !== undefined) updateData.dob = new Date(dto.dob);
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.presentAddress !== undefined)
      updateData.presentAddress = dto.presentAddress;
    if (dto.permanentAddress !== undefined)
      updateData.permanentAddress = dto.permanentAddress;
    if (dto.maritalStatus !== undefined)
      updateData.maritalStatus = dto.maritalStatus;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.nationality !== undefined) updateData.nationality = dto.nationality;
    if (dto.nationalIdNumber !== undefined)
      updateData.nationalIdNumber = dto.nationalIdNumber;
    if (dto.department !== undefined) updateData.department = dto.department;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.joinDate !== undefined)
      updateData.joinDate = dto.joinDate ? new Date(dto.joinDate) : null;
    if (dto.employmentType !== undefined)
      updateData.employmentType = dto.employmentType;
    if (dto.workSchedule !== undefined)
      updateData.workSchedule = dto.workSchedule;
    if (dto.weeklyHours !== undefined) updateData.weeklyHours = dto.weeklyHours;
    if (dto.employmentStatus !== undefined)
      updateData.employmentStatus = dto.employmentStatus;

    // Handle photo update - delete old photo if new one is uploaded
    if (dto.photo !== undefined) {
      updateData.photo = dto.photo;

      // Delete old photo if it exists and a new one is being set
      if (
        existingStaff.photo &&
        dto.photo &&
        existingStaff.photo !== dto.photo
      ) {
        await deleteFileFromUploads(existingStaff.photo);
      }
    }

    // Update staff record
    const updatedStaff = await this.prisma.staff.update({
      where: { id: staffId },
      data: updateData,
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
      staff: updatedStaff,
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
      throw new UnauthorizedException(
        'You do not have permission to delete this staff member',
      );
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

  // ==================== SCHEDULE MANAGEMENT ====================

  // ----------------- CREATE SCHEDULE -------------------
  async createSchedule(accessToken: string, dto: CreateScheduleDto) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Helper to validate time range HH:mm
    const validateTimeRange = (startTime: string, endTime: string, label: string) => {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        throw new BadRequestException(
          `End time must be after start time for ${label}: ${startTime} - ${endTime}`,
        );
      }
      return { startMinutes, endMinutes };
    };

    // Validate halves if provided
    if (!dto.isClosed) {
      let firstRange, secondRange;
      if (dto.firstHalf) {
        firstRange = validateTimeRange(dto.firstHalf.startTime, dto.firstHalf.endTime, 'First Half');
      }
      if (dto.secondHalf) {
        secondRange = validateTimeRange(dto.secondHalf.startTime, dto.secondHalf.endTime, 'Second Half');
      }

      // Check for overlap between halves
      if (firstRange && secondRange) {
        if (
          (firstRange.startMinutes < secondRange.endMinutes && secondRange.startMinutes < firstRange.endMinutes)
        ) {
          throw new BadRequestException('First half and second half cannot overlap');
        }
      }
    }

    // Use transaction for bulk creation
    const results = await this.prisma.$transaction(async (tx) => {
      const createdSchedules: any[] = [];
      for (const day of dto.days) {
        // Upsert behavior: Delete existing and create new
        await tx.doctorWeeklySchedule.deleteMany({
          where: { doctorId, day },
        });

        const schedule = await tx.doctorWeeklySchedule.create({
          data: {
            doctorId,
            day,
            isClosed: dto.isClosed || false,
            firstHalfStartTime: dto.firstHalf?.startTime,
            firstHalfEndTime: dto.firstHalf?.endTime,
            secondHalfStartTime: dto.secondHalf?.startTime,
            secondHalfEndTime: dto.secondHalf?.endTime,
          },
        });
        createdSchedules.push(schedule);
      }
      return createdSchedules;
    });

    return {
      schedules: results,
    };
  }

  // ----------------- GET ALL SCHEDULES -------------------
  async getAllSchedules(accessToken: string, query: GetAllSchedulesDto) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    const where: any = { doctorId };
    if (query.day) where.day = query.day;
    if (query.isClosed !== undefined) where.isClosed = query.isClosed;

    const schedules = await this.prisma.doctorWeeklySchedule.findMany({
      where,
      orderBy: {
        day: 'asc',
      },
    });

    return {
      schedules,
      total: schedules.length,
    };
  }

  // ----------------- GET SINGLE SCHEDULE -------------------
  async getSingleSchedule(accessToken: string, scheduleId: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to access this schedule',
      );
    }

    return {
      schedule,
    };
  }

  // ----------------- UPDATE SCHEDULE -------------------
  async updateSchedule(
    accessToken: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    const existingSchedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existingSchedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (existingSchedule.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to update this schedule',
      );
    }

    // Helper to validate time range HH:mm
    const validateTimeRange = (startTime: string, endTime: string, label: string) => {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        throw new BadRequestException(
          `End time must be after start time for ${label}: ${startTime} - ${endTime}`,
        );
      }
      return { startMinutes, endMinutes };
    };

    // Prepare update data
    const updateData: any = {};
    if (dto.isClosed !== undefined) updateData.isClosed = dto.isClosed;

    if (!dto.isClosed) {
      // Validate and update halves
      let firstRange, secondRange;
      
      // Use existing values if not provided in dto but needed for overlap check
      const firstHalf = dto.firstHalf || (dto.isClosed === false ? { startTime: existingSchedule.firstHalfStartTime, endTime: existingSchedule.firstHalfEndTime } : null);
      const secondHalf = dto.secondHalf || (dto.isClosed === false ? { startTime: existingSchedule.secondHalfStartTime, endTime: existingSchedule.secondHalfEndTime } : null);

      if (dto.firstHalf) {
        validateTimeRange(dto.firstHalf.startTime, dto.firstHalf.endTime, 'First Half');
        updateData.firstHalfStartTime = dto.firstHalf.startTime;
        updateData.firstHalfEndTime = dto.firstHalf.endTime;
      }
      if (dto.secondHalf) {
        validateTimeRange(dto.secondHalf.startTime, dto.secondHalf.endTime, 'Second Half');
        updateData.secondHalfStartTime = dto.secondHalf.startTime;
        updateData.secondHalfEndTime = dto.secondHalf.endTime;
      }

      // Overlap check (needs both halves' current/new values)
      const currentFirst = {
        start: dto.firstHalf?.startTime || existingSchedule.firstHalfStartTime,
        end: dto.firstHalf?.endTime || existingSchedule.firstHalfEndTime
      };
      const currentSecond = {
        start: dto.secondHalf?.startTime || existingSchedule.secondHalfStartTime,
        end: dto.secondHalf?.endTime || existingSchedule.secondHalfEndTime
      };

      if (currentFirst.start && currentFirst.end && currentSecond.start && currentSecond.end) {
        const r1 = validateTimeRange(currentFirst.start, currentFirst.end, 'First Half');
        const r2 = validateTimeRange(currentSecond.start, currentSecond.end, 'Second Half');
        if (r1.startMinutes < r2.endMinutes && r2.startMinutes < r1.endMinutes) {
          throw new BadRequestException('First half and second half cannot overlap');
        }
      }
    } else {
      // If closed, clear halves
      updateData.firstHalfStartTime = null;
      updateData.firstHalfEndTime = null;
      updateData.secondHalfStartTime = null;
      updateData.secondHalfEndTime = null;
    }

    const updatedSchedule = await this.prisma.doctorWeeklySchedule.update({
      where: { id: scheduleId },
      data: updateData,
    });

    return {
      schedule: updatedSchedule,
    };
  }

  // ----------------- DELETE SCHEDULE -------------------
  async deleteSchedule(accessToken: string, scheduleId: string) {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Fetch schedule
    const schedule = await this.prisma.doctorWeeklySchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to delete this schedule',
      );
    }

    // Delete schedule (slots will be cascade deleted)
    await this.prisma.doctorWeeklySchedule.delete({
      where: { id: scheduleId },
    });

    return {
      message: 'Schedule deleted successfully',
    };
  }

  // ==================== KNOWLEDGE BASE MANAGEMENT ====================

  // ----------------- CREATE KB ENTRY -------------------
  async createKbEntry(accessToken: string, dto: any) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const kbEntry = await this.prisma.doctorKnowledgeBase.create({
      data: {
        doctorId: session.doctorId,
        category: dto.category || 'GENERAL',
        question: dto.question,
        answer: dto.answer,
        keywords: dto.keywords || [],
        priority: dto.priority || 0,
      },
    });

    return { success: true, data: kbEntry };
  }

  // ----------------- GET ALL KB ENTRIES -------------------
  async getAllKbEntries(accessToken: string, query: any) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const { category, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { doctorId: session.doctorId };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [entries, total] = await Promise.all([
      this.prisma.doctorKnowledgeBase.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { priority: 'desc' },
      }),
      this.prisma.doctorKnowledgeBase.count({ where }),
    ]);

    return {
      data: entries,
      pagination: {
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ----------------- UPDATE KB ENTRY -------------------
  async updateKbEntry(accessToken: string, kbId: string, dto: any) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    // Verify ownership
    const existing = await this.prisma.doctorKnowledgeBase.findFirst({
      where: { id: kbId, doctorId: session.doctorId },
    });

    if (!existing) {
      throw new NotFoundException('Knowledge base entry not found');
    }

    const updateData: any = {};
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.question !== undefined) updateData.question = dto.question;
    if (dto.answer !== undefined) updateData.answer = dto.answer;
    if (dto.keywords !== undefined) updateData.keywords = dto.keywords;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.doctorKnowledgeBase.update({
      where: { id: kbId },
      data: updateData,
    });

    return { success: true, data: updated };
  }

  // ----------------- DELETE KB ENTRY -------------------
  async deleteKbEntry(accessToken: string, kbId: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const existing = await this.prisma.doctorKnowledgeBase.findFirst({
      where: { id: kbId, doctorId: session.doctorId },
    });

    if (!existing) {
      throw new NotFoundException('Knowledge base entry not found');
    }

    await this.prisma.doctorKnowledgeBase.delete({ where: { id: kbId } });

    return { success: true, message: 'KB entry deleted successfully' };
  }

  // ==================== CALL HISTORY ====================

  // ----------------- GET CALL HISTORY -------------------
  async getCallHistory(accessToken: string, query: any) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const {
      page = 1,
      limit = 20,
      patientId,
      intent,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { doctorId: session.doctorId };
    if (patientId) where.patientId = patientId;
    if (intent) where.intent = intent;

    // Add date filtering (optional)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day to include the entire end date
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    const [calls, total] = await Promise.all([
      this.prisma.callTranscription.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              insuranceId: true,
            },
          },
          appointment: {
            select: { id: true, appointmentDate: true, status: true },
          },
        },
      }),
      this.prisma.callTranscription.count({ where }),
    ]);

    return {
      data: calls,
      pagination: {
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ----------------- GET CALL DETAILS -------------------
  async getCallDetails(accessToken: string, callId: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const call = await this.prisma.callTranscription.findFirst({
      where: { id: callId, doctorId: session.doctorId },
      include: {
        patient: true,
        appointment: true,
      },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return { data: call };
  }

  // ==================== DASHBOARD STATISTICS ====================

  // ----------------- GET DASHBOARD STATS -------------------
  async getDashboardStats(accessToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;

    // Get today's range (UTC)
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const commonWhere = {
      doctorId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    const overallWhere = { doctorId };

    // 1. Incoming Calls
    const todayIncomingCalls = await this.prisma.callTranscription.count({
      where: commonWhere,
    });
    const overallIncomingCalls = await this.prisma.callTranscription.count({
      where: overallWhere,
    });

    // 2. Successful Calls
    const todaySuccessfulCalls = await this.prisma.callTranscription.count({
      where: {
        ...commonWhere,
        callStatus: 'SUCCESSFUL',
      },
    });
    const overallSuccessfulCalls = await this.prisma.callTranscription.count({
      where: {
        ...overallWhere,
        callStatus: 'SUCCESSFUL',
      },
    });

    // 3. Average Call Duration
    const durationAggregateToday =
      await this.prisma.callTranscription.aggregate({
        where: commonWhere,
        _avg: {
          duration: true,
        },
      });
    const durationAggregateOverall =
      await this.prisma.callTranscription.aggregate({
        where: overallWhere,
        _avg: {
          duration: true,
        },
      });

    // 4. Tasks (Task model with status TODO)
    const todayTasks = await this.prisma.task.count({
      where: {
        doctorId,
        status: 'TODO',
        OR: [
          { dueDate: { gte: startOfDay, lte: endOfDay } },
          { createdAt: { gte: startOfDay, lte: endOfDay } },
        ],
      },
    });
    const overallTasks = await this.prisma.task.count({
      where: {
        doctorId,
        status: 'TODO',
      },
    });

    // 5. Requires a call back (Missed or Unsuccessful)
    const todayRequiresCallback = await this.prisma.callTranscription.count({
      where: {
        ...commonWhere,
        callStatus: {
          in: ['MISSED', 'UNSUCCESSFUL'],
        },
      },
    });
    const overallRequiresCallback = await this.prisma.callTranscription.count({
      where: {
        ...overallWhere,
        callStatus: {
          in: ['MISSED', 'UNSUCCESSFUL'],
        },
      },
    });

    return {
      today: {
        incomingCalls: todayIncomingCalls,
        successfulCalls: todaySuccessfulCalls,
        averageCallDuration: Math.round(
          durationAggregateToday._avg.duration || 0,
        ),
        tasks: todayTasks,
        requiresCallback: todayRequiresCallback,
      },
      overall: {
        incomingCalls: overallIncomingCalls,
        successfulCalls: overallSuccessfulCalls,
        averageCallDuration: Math.round(
          durationAggregateOverall._avg.duration || 0,
        ),
        tasks: overallTasks,
        requiresCallback: overallRequiresCallback,
      },
    };
  }

  // ==================== APPOINTMENT TYPE MANAGEMENT ====================

  async createAppointmentType(accessToken: string, dto: CreateAppointmentTypeDto) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const type = await this.prisma.appointmentType.create({
      data: {
        doctorId: session.doctorId,
        name: dto.name,
        duration: dto.duration,
      },
    });

    return { success: true, data: type };
  }

  async getAllAppointmentTypes(accessToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const types = await this.prisma.appointmentType.findMany({
      where: { doctorId: session.doctorId },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: types };
  }

  async updateAppointmentType(
    accessToken: string,
    typeId: string,
    dto: UpdateAppointmentTypeDto,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const existing = await this.prisma.appointmentType.findFirst({
      where: { id: typeId, doctorId: session.doctorId },
    });
    if (!existing) throw new NotFoundException('Appointment type not found');

    const updated = await this.prisma.appointmentType.update({
      where: { id: typeId },
      data: {
        name: dto.name,
        duration: dto.duration,
      },
    });

    return { success: true, data: updated };
  }

  async deleteAppointmentType(accessToken: string, typeId: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const existing = await this.prisma.appointmentType.findFirst({
      where: { id: typeId, doctorId: session.doctorId },
    });
    if (!existing) throw new NotFoundException('Appointment type not found');

    await this.prisma.appointmentType.delete({ where: { id: typeId } });

    return { success: true, message: 'Appointment type deleted successfully' };
  }

  // ==================== ABSENCE MANAGEMENT ====================

  // ----------------- CREATE ABSENCE -------------------
  async createAbsence(accessToken: string, dto: CreateAbsenceDto) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const doctorId = session.doctorId;

    // Validate date range
    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);

    if (fromDate > toDate) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    // Create absence period
    const absence = await this.prisma.doctorAbsence.create({
      data: {
        doctorId,
        fromDate,
        toDate,
        reason: dto.reason,
      },
    });

    return { absence };
  }

  // ----------------- GET ALL ABSENCES -------------------
  async getAllAbsences(accessToken: string, query: GetAllAbsencesDto) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const doctorId = session.doctorId;
    const filter = query.filter || 'all';

    // Build where clause based on filter
    const where: any = { doctorId };
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      where.toDate = { gte: now };
    } else if (filter === 'past') {
      where.toDate = { lt: now };
    }

    const absences = await this.prisma.doctorAbsence.findMany({
      where,
      orderBy: { fromDate: 'asc' },
    });

    return {
      absences,
      total: absences.length,
    };
  }

  // ----------------- GET SINGLE ABSENCE -------------------
  async getSingleAbsence(accessToken: string, absenceId: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const doctorId = session.doctorId;

    const absence = await this.prisma.doctorAbsence.findUnique({
      where: { id: absenceId },
    });

    if (!absence) {
      throw new NotFoundException('Absence period not found');
    }

    if (absence.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to access this absence period',
      );
    }

    return { absence };
  }

  // ----------------- UPDATE ABSENCE -------------------
  async updateAbsence(
    accessToken: string,
    absenceId: string,
    dto: UpdateAbsenceDto,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const doctorId = session.doctorId;

    const existingAbsence = await this.prisma.doctorAbsence.findUnique({
      where: { id: absenceId },
    });

    if (!existingAbsence) {
      throw new NotFoundException('Absence period not found');
    }

    if (existingAbsence.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to update this absence period',
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (dto.fromDate !== undefined) updateData.fromDate = new Date(dto.fromDate);
    if (dto.toDate !== undefined) updateData.toDate = new Date(dto.toDate);
    if (dto.reason !== undefined) updateData.reason = dto.reason;

    // Validate date range if either date is being updated
    if (dto.fromDate || dto.toDate) {
      const fromDate = dto.fromDate ? new Date(dto.fromDate) : existingAbsence.fromDate;
      const toDate = dto.toDate ? new Date(dto.toDate) : existingAbsence.toDate;

      if (fromDate > toDate) {
        throw new BadRequestException('fromDate must be before or equal to toDate');
      }
    }

    const updatedAbsence = await this.prisma.doctorAbsence.update({
      where: { id: absenceId },
      data: updateData,
    });

    return { absence: updatedAbsence };
  }

  // ----------------- DELETE ABSENCE -------------------
  async deleteAbsence(accessToken: string, absenceId: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });
    if (!session?.doctorId) throw new UnauthorizedException();

    const doctorId = session.doctorId;

    const absence = await this.prisma.doctorAbsence.findUnique({
      where: { id: absenceId },
    });

    if (!absence) {
      throw new NotFoundException('Absence period not found');
    }

    if (absence.doctorId !== doctorId) {
      throw new UnauthorizedException(
        'You do not have permission to delete this absence period',
      );
    }

    await this.prisma.doctorAbsence.delete({
      where: { id: absenceId },
    });

    return { message: 'Absence period deleted successfully' };
  }

  // ----------------- HELPER: CHECK IF DATE IS IN ABSENCE PERIOD -------------------
  async isDateInAbsencePeriod(doctorId: string, date: Date): Promise<boolean> {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const absences = await this.prisma.doctorAbsence.findMany({
      where: {
        doctorId,
        fromDate: { lte: checkDate },
        toDate: { gte: checkDate },
      },
    });

    return absences.length > 0;
  }

  // ----------------- HELPER: GET NEXT AVAILABLE DATE -------------------
  async getNextAvailableDate(doctorId: string, startDate: Date): Promise<Date | null> {
    const checkDate = new Date(startDate);
    checkDate.setHours(0, 0, 0, 0);

    // Get all future absence periods
    const absences = await this.prisma.doctorAbsence.findMany({
      where: {
        doctorId,
        toDate: { gte: checkDate },
      },
      orderBy: { fromDate: 'asc' },
    });

    if (absences.length === 0) {
      return checkDate;
    }

    // Find the first date that's not in any absence period
    let currentDate = new Date(checkDate);
    const maxDaysToCheck = 365; // Check up to 1 year ahead
    let daysChecked = 0;

    while (daysChecked < maxDaysToCheck) {
      const isInAbsence = absences.some(absence => {
        const from = new Date(absence.fromDate);
        const to = new Date(absence.toDate);
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        return currentDate >= from && currentDate <= to;
      });

      if (!isInAbsence) {
        return currentDate;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
    }

    return null; // No available date found within 1 year
  }

  // ----------------- HELPER: GET ABSENCE INFO FOR DATE -------------------
  async getAbsenceInfoForDate(doctorId: string, date: Date): Promise<{ isAbsent: boolean; absence?: any; nextAvailableDate?: Date }> {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const absence = await this.prisma.doctorAbsence.findFirst({
      where: {
        doctorId,
        fromDate: { lte: checkDate },
        toDate: { gte: checkDate },
      },
    });

    if (absence) {
      const nextDate = await this.getNextAvailableDate(doctorId, checkDate);
      return {
        isAbsent: true,
        absence,
        nextAvailableDate: nextDate || undefined,
      };
    }

    return { isAbsent: false };
  }
}
