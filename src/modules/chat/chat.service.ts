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
    console.log(`Getting user ID for accountId: ${accountId}, role: ${role}`);

    const whereClause =
      role === UserRole.ADMIN
        ? { adminId: accountId }
        : { doctorId: accountId };

    let user = await this.prisma.user.findFirst({ where: whereClause });

    if (!user) {
      // Verify that the account actually exists before creating User
      if (role === UserRole.ADMIN) {
        const admin = await this.prisma.admin.findUnique({
          where: { id: accountId },
        });
        if (!admin) {
          throw new Error(`Admin with ID ${accountId} does not exist`);
        }
      } else if (role === UserRole.DOCTOR) {
        const doctor = await this.prisma.doctor.findUnique({
          where: { id: accountId },
        });
        if (!doctor) {
          throw new Error(`Doctor with ID ${accountId} does not exist`);
        }
      }

      // Create user if doesn't exist
      console.log('User not found, creating new user...');
      user = await this.prisma.user.create({
        data: {
          ...whereClause,
          role,
        },
      });
      console.log('Created user:', user.id);
    } else {
      console.log('Found existing user:', user.id);
    }

    return user.id;
  }

  // Public method to get or create User ID
  async getOrCreateUserId(
    accountId: string,
    role: 'ADMIN' | 'DOCTOR',
  ): Promise<string> {
    // Validate inputs
    if (!accountId) {
      throw new Error('accountId is required');
    }
    if (!role || (role !== 'ADMIN' && role !== 'DOCTOR')) {
      throw new Error(`Invalid role: ${role}. Must be 'ADMIN' or 'DOCTOR'`);
    }

    return this.getUserId(
      accountId,
      role === 'ADMIN' ? UserRole.ADMIN : UserRole.DOCTOR,
    );
  }

  // Create or get existing conversation
  async createConversation(dto: CreateConversationDto) {
    console.log('Creating conversation with DTO:', dto);

    // TEAM-BASED POOL MODEL:
    // - Doctors can create multiple OPEN conversations (different topics)
    // - adminId can be null (no specific admin assigned)
    // - All admins can see and reply to conversations
    // - No uniqueness constraint - always create new conversation

    // Create new conversation
    console.log('Creating new conversation in pool model...');
    const newConversation = await this.prisma.adminConversation.create({
      data: {
        userId: dto.userId!,
        userRole: dto.userRole!,
        subject: dto.subject,
        adminId: dto.adminId || null, // null = available to all admins
      },
      include: {
        messages: true,
        admin: dto.adminId
          ? {
              include: {
                admin: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    photo: true,
                    email: true,
                  },
                },
                doctor: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    photo: true,
                    email: true,
                  },
                },
              },
            }
          : undefined,
      },
    });

    console.log('Created conversation:', newConversation.id);
    return newConversation;
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
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
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
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        admin: {
          include: {
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
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
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              include: {
                admin: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    photo: true,
                    email: true,
                  },
                },
                doctor: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    photo: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        admin: {
          include: {
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  // Get only messages from a conversation
  async getConversationMessages(conversationId: string) {
    const messages = await this.prisma.supportMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        message: true,
        imageUrl: true,
        attachments: true,
        isRead: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            role: true,
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photo: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photo: true,
              },
            },
          },
        },
      },
    });

    return messages;
  }

  // Get user conversations
  async getUserConversations(userId: string) {
    // First, determine if this user is an admin or doctor
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // POOL MODEL:
    // - Admins see ALL conversations (not filtered by adminId)
    // - Doctors see only their own conversations
    const whereClause =
      user.role === 'ADMIN'
        ? {} // Admins see everything
        : { userId }; // Doctors see only their conversations

    return this.prisma.adminConversation.findMany({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        user: {
          include: {
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
          },
        },
        admin: {
          include: {
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
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
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
                email: true,
              },
            },
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
