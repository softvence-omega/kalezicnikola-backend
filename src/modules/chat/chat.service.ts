import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateConversationDto,
  SendMessageDto,
  UpdateConversationDto,
} from './dto';
import { ConversationStatus, UserRole } from '../../../generated/prisma';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Helper to get User ID from admin/doctor ID
  private async getUserId(accountId: string, role: UserRole): Promise<string> {
    const whereClause = role === UserRole.ADMIN 
      ? { adminId: accountId }
      : { doctorId: accountId };

    let user = await this.prisma.user.findFirst({ where: whereClause });

    if (!user) {
      // Create user if doesn't exist
      user = await this.prisma.user.create({
        data: {
          ...whereClause,
          role,
        },
      });
    }

    return user.id;
  }

  // Public method to get or create User ID
  async getOrCreateUserId(accountId: string, role: 'ADMIN' | 'DOCTOR'): Promise<string> {
    return this.getUserId(accountId, role === 'ADMIN' ? UserRole.ADMIN : UserRole.DOCTOR);
  }

  // Create or get existing conversation
  async createConversation(dto: CreateConversationDto) {
    // Check if conversation already exists for this user
    const existing = await this.prisma.adminConversation.findFirst({
      where: {
        userId: dto.userId,
        userRole: dto.userRole,
        status: { not: ConversationStatus.CLOSED },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        admin: {
          include: {
            admin: true,
            doctor: true,
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new conversation
    return this.prisma.adminConversation.create({
      data: {
        userId: dto.userId!,
        userRole: dto.userRole!,
        subject: dto.subject,
        adminId: dto.adminId,
      },
      include: {
        messages: true,
        admin: {
          include: {
            admin: true,
            doctor: true,
          },
        },
      },
    });
  }

  // Send message
  async sendMessage(senderId: string, dto: SendMessageDto) {
    const message = await this.prisma.supportMessage.create({
      data: {
        conversationId: dto.conversationId,
        senderId,
        message: dto.message,
        imageUrl: dto.imageUrl,
        attachments: dto.attachments || [],
      },
      include: {
        sender: {
          include: {
            admin: true,
            doctor: true,
          },
        },
        conversation: true,
      },
    });

    // Update conversation timestamp
    await this.prisma.adminConversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // Get all conversations (for admins)
  async getAllConversations(adminId?: string) {
    return this.prisma.adminConversation.findMany({
      where: adminId ? { adminId } : {},
      include: {
        user: {
          include: {
            admin: true,
            doctor: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        admin: {
          include: {
            admin: true,
            doctor: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Get conversation by ID
  async getConversationById(id: string) {
    return this.prisma.adminConversation.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            admin: true,
            doctor: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              include: {
                admin: true,
                doctor: true,
              },
            },
          },
        },
        admin: {
          include: {
            admin: true,
            doctor: true,
          },
        },
      },
    });
  }

  // Get user conversations
  async getUserConversations(userId: string) {
    return this.prisma.adminConversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        user: {
          include: {
            admin: true,
            doctor: true,
          },
        },
        admin: {
          include: {
            admin: true,
            doctor: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Update conversation
  async updateConversation(id: string, dto: UpdateConversationDto) {
    return this.prisma.adminConversation.update({
      where: { id },
      data: dto,
      include: {
        messages: true,
        admin: {
          include: {
            admin: true,
            doctor: true,
          },
        },
      },
    });
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string) {
    return this.prisma.supportMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  // Get unread message count
  async getUnreadCount(userId: string) {
    const conversations = await this.prisma.adminConversation.findMany({
      where: {
        OR: [{ userId }, { adminId: userId }],
      },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    return this.prisma.supportMessage.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isRead: false,
      },
    });
  }
}
