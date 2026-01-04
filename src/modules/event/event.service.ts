import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { GetAllEventsDto } from './dto/get-all-events.dto';

@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  // ==================== HELPER METHODS ====================

  private async validateToken(accessToken: string): Promise<string> {
    // Find session to get doctor ID
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    return session.doctorId; // Returns doctorId
  }

  private async validateEventOwnership(
    eventId: string,
    doctorId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true, deletedAt: true },
    });

    if (!event || event.deletedAt) {
      throw new NotFoundException('Event not found');
    }

    if (event.createdById !== doctorId) {
      throw new ForbiddenException(
        'You do not have permission to access this event',
      );
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // ==================== CREATE EVENT ====================

  async createEvent(
    accessToken: string,
    dto: CreateEventDto,
    photo?: Express.Multer.File,
  ) {
    const doctorId = await this.validateToken(accessToken);

    // Validate that end time is after start time (only if both provided)
    if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Create the event
    const event = await this.prisma.event.create({
      data: {
        title: dto.title || 'Untitled Event',
        eventType: dto.eventType || 'EVENT',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        startTime: dto.startTime || '09:00',
        endTime: dto.endTime || '10:00',
        isAllDay: dto.isAllDay || false,
        locationType: dto.locationType || 'OFFLINE',
        location: dto.location,
        meetingLink: dto.meetingLink,
        description: dto.description,
        coverImage: photo ? `/api/v1/uploads/${photo.filename}` : null,
        createdById: doctorId,
      },
      include: {
        guests: true,
        attachments: true,
      },
    });

    // Create guest records if provided
    if (dto.guestEmails && dto.guestEmails.length > 0) {
      await this.prisma.eventGuest.createMany({
        data: dto.guestEmails.map((email) => ({
          eventId: event.id,
          email: email,
        })),
      });

      // Send invitation emails to all guests
      const eventDetails = {
        title: event.title,
        eventType: event.eventType,
        startDate: this.formatDate(event.startDate.toISOString()),
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location ?? undefined,
        meetingLink: event.meetingLink ?? undefined,
        description: event.description ?? undefined,
      };

      for (const email of dto.guestEmails) {
        await this.emailService.sendEventInvitationEmail(email, eventDetails);
      }

      // Update notification sent status
      await this.prisma.eventGuest.updateMany({
        where: { eventId: event.id },
        data: { notificationSent: true },
      });
    }

    // Create attachment records if provided
    if (dto.attachmentLinks && dto.attachmentLinks.length > 0) {
      await this.prisma.eventAttachment.createMany({
        data: dto.attachmentLinks.map((url) => ({
          eventId: event.id,
          url: url,
        })),
      });
    }

    // Fetch and return the complete event with relations
    return await this.prisma.event.findUnique({
      where: { id: event.id },
      include: {
        guests: true,
        attachments: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  // ==================== GET ALL EVENTS ====================

  async getAllEvents(accessToken: string, query: GetAllEventsDto) {
    const doctorId = await this.validateToken(accessToken);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'startDate';
    const sortOrder = query.sortOrder || 'ASC';

    // Build where clause
    const where: any = {
      createdById: doctorId,
      deletedAt: null,
    };

    // Filter by event type
    if (query.eventType) {
      where.eventType = query.eventType;
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.startDate = {};
      if (query.startDate) {
        where.startDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startDate.lte = new Date(query.endDate);
      }
    }

    // Search in title, description, location
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const total = await this.prisma.event.count({ where });

    // Fetch events with pagination and sorting
    const events = await this.prisma.event.findMany({
      where,
      include: {
        guests: true,
        attachments: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder.toLowerCase() },
      skip,
      take: limit,
    });

    return {
      data: events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== GET SINGLE EVENT ====================

  async getSingleEvent(accessToken: string, eventId: string) {
    const doctorId = await this.validateToken(accessToken);
    await this.validateEventOwnership(eventId, doctorId);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        guests: true,
        attachments: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return event;
  }

  // ==================== UPDATE EVENT ====================

  async updateEvent(
    accessToken: string,
    eventId: string,
    dto: UpdateEventDto,
    photo?: Express.Multer.File,
  ) {
    const doctorId = await this.validateToken(accessToken);
    await this.validateEventOwnership(eventId, doctorId);

    // Validate time if both are provided
    if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Build update data
    const updateData: any = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.eventType) updateData.eventType = dto.eventType;
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.startTime) updateData.startTime = dto.startTime;
    if (dto.endTime) updateData.endTime = dto.endTime;
    if (dto.isAllDay !== undefined) updateData.isAllDay = dto.isAllDay;
    if (dto.locationType) updateData.locationType = dto.locationType;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.meetingLink !== undefined) updateData.meetingLink = dto.meetingLink;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (photo) updateData.coverImage = `/api/v1/uploads/${photo.filename}`;

    // Update the event
    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        guests: true,
        attachments: true,
      },
    });

    // Handle guest additions
    if (dto.addGuestEmails && dto.addGuestEmails.length > 0) {
      await this.prisma.eventGuest.createMany({
        data: dto.addGuestEmails.map((email) => ({
          eventId: event.id,
          email: email,
        })),
      });
    }

    // Handle guest removals
    if (dto.removeGuestIds && dto.removeGuestIds.length > 0) {
      await this.prisma.eventGuest.deleteMany({
        where: {
          id: { in: dto.removeGuestIds },
          eventId: event.id,
        },
      });
    }

    // Handle attachment additions
    if (dto.addAttachmentLinks && dto.addAttachmentLinks.length > 0) {
      await this.prisma.eventAttachment.createMany({
        data: dto.addAttachmentLinks.map((url) => ({
          eventId: event.id,
          url: url,
        })),
      });
    }

    // Handle attachment removals
    if (dto.removeAttachmentIds && dto.removeAttachmentIds.length > 0) {
      await this.prisma.eventAttachment.deleteMany({
        where: {
          id: { in: dto.removeAttachmentIds },
          eventId: event.id,
        },
      });
    }

    // Fetch all current guests
    const currentGuests = await this.prisma.eventGuest.findMany({
      where: { eventId: event.id },
    });

    // Send update emails to all current guests
    if (currentGuests.length > 0) {
      const eventDetails = {
        title: event.title,
        eventType: event.eventType,
        startDate: this.formatDate(event.startDate.toISOString()),
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location ?? undefined,
        meetingLink: event.meetingLink ?? undefined,
        description: event.description ?? undefined,
      };

      for (const guest of currentGuests) {
        await this.emailService.sendEventUpdateEmail(guest.email, eventDetails);
      }
    }

    // Return updated event with all relations
    return await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        guests: true,
        attachments: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  // ==================== DELETE EVENT ====================

  async deleteEvent(accessToken: string, eventId: string, reason: string) {
    const doctorId = await this.validateToken(accessToken);
    await this.validateEventOwnership(eventId, doctorId);

    // Fetch event details before deletion
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { guests: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Send cancellation emails to all guests
    if (event.guests.length > 0) {
      const eventDetails = {
        title: event.title,
        eventType: event.eventType,
        startDate: this.formatDate(event.startDate.toISOString()),
        startTime: event.startTime,
      };

      for (const guest of event.guests) {
        await this.emailService.sendEventCancellationEmail(
          guest.email,
          eventDetails,
          reason,
        );
      }
    }

    // Soft delete the event
    await this.prisma.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Event deleted successfully',
      eventId: eventId,
    };
  }
}
