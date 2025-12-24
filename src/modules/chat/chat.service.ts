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
    // console.log(`Getting user ID for accountId: ${accountId}, role: ${role}`);

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
      // console.log('User not found, creating new user...');
      user = await this.prisma.user.create({
        data: {
          ...whereClause,
          role,
        },
      });
      // console.log('Created user:', user.id);
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

  // Create or get existing conversation (ONE conversation per doctor)
  async createConversation(dto: CreateConversationDto) {
    // console.log('Creating conversation with DTO:', dto);

    // ONE-CONVERSATION-PER-DOCTOR MODEL:
    // - Each doctor has ONE ongoing conversation with the admin team
    // - If conversation exists, return it (reuse)
    // - If not, create new conversation
    // - Response includes all admin IDs in the system

    // Validate that we have doctorId
    if (!dto.doctorId) {
      throw new Error('doctorId is required');
    }

    // Check if conversation already exists for this doctor
    let conversation = await this.prisma.adminConversation.findUnique({
      where: { doctorId: dto.doctorId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        user: {
          include: {
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
    });

    if (conversation) {
      console.log('Found existing conversation:', conversation.id);
    } else {
      // Create new conversation
      console.log('Creating new conversation for doctor:', dto.doctorId);
      conversation = await this.prisma.adminConversation.create({
        data: {
          userId: dto.userId!,
          userRole: dto.userRole!,
          doctorId: dto.doctorId,
          subject: dto.subject,
          adminId: null, // Always null - available to all admins
        },
        include: {
          messages: true,
          user: {
            include: {
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
      });
      // console.log('Created conversation:', conversation.id);
    }

    // Get all admin IDs in the system
    const allAdmins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
            email: true,
          },
        },
      },
    });

    // Return conversation with all admin IDs
    return {
      ...conversation,
      adminIds: allAdmins.map((admin) => admin.id), // Array of all admin user IDs
      admins: allAdmins.map((admin) => admin.admin), // Array of all admin details
    };
  }

  // Get all admin user IDs (for WebSocket broadcasting)
  async getAllAdminUserIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    return admins.map((admin) => admin.id);
  }

  // Send message
  async sendMessage(senderId: string, dto: SendMessageDto) {
    const sender = await this.prisma.user.findUnique({ where: {id: senderId}, include: {admin: true, doctor: true, conversations: true}})
    // console.log(sender)
    
    // console.log(dto, senderId);

    const message = await this.prisma.supportMessage.create({
      data: {
        conversationId: dto.conversationId,
        senderId,
        message: dto.message,
        imageUrl: dto.imageUrl || null,
        attachments: dto.attachments || [],
      },
      // include: {
      //   sender: {
      //     include: {
      //       admin: {
      //         select: {
      //           id: true,
      //           firstName: true,
      //           lastName: true,
      //           photo: true,
      //           email: true,
      //         },
      //       },
      //       doctor: {
      //         select: {
      //           id: true,
      //           firstName: true,
      //           lastName: true,
      //           photo: true,
      //           email: true,
      //         },
      //       },
      //     },
      //   },
      //   conversation: true,
      // },
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

  // Check if user is online (requires gateway integration)
  isUserOnline(userId: string): boolean {
    // This will be connected to the WebSocket gateway
    // For now, return false - will be enhanced with gateway injection
    return false;
  }

  // Get conversation participants with their online status
  async getConversationParticipants(conversationId: string) {
    const conversation = await this.prisma.adminConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          include: {
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
        admin: {
          include: {
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

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get unread count for each participant
    const userUnreadCount = await this.prisma.supportMessage.count({
      where: {
        conversationId,
        senderId: { not: conversation.userId },
        isRead: false,
      },
    });

    const adminUnreadCount = conversation.adminId
      ? await this.prisma.supportMessage.count({
          where: {
            conversationId,
            senderId: { not: conversation.adminId },
            isRead: false,
          },
        })
      : 0;

    return {
      conversationId,
      participants: [
        {
          chatUserId: conversation.userId,
          role: conversation.userRole,
          user: conversation.user,
          isOnline: this.isUserOnline(conversation.userId),
          unreadCount: userUnreadCount,
        },
        ...(conversation.adminId
          ? [
              {
                chatUserId: conversation.adminId,
                role: 'ADMIN',
                user: conversation.admin,
                isOnline: this.isUserOnline(conversation.adminId),
                unreadCount: adminUnreadCount,
              },
            ]
          : []),
      ],
    };
  }
}
