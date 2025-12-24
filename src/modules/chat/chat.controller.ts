import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  fileStorage,
  imageFileFilter,
  allFileFilter,
} from 'src/utils/file-upload.util';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  SendMessageDto,
  UpdateConversationDto,
} from './dto';
import { JwtAuthGuard } from 'src/common/guard/auth.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { UserRole } from '../../../generated/prisma';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('user-id/:accountId')
  async getUserId(
    @Param('accountId') accountId: string,
    @Query('role') role: string,
  ) {
    try {
      const userId = await this.chatService.getOrCreateUserId(
        accountId,
        role.toUpperCase() as 'ADMIN' | 'DOCTOR',
      );
      return { userId };
    } catch (error) {
      console.error('Error getting user ID:', error);
      throw new BadRequestException(error.message || 'Failed to get user ID');
    }
  }

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: any,
  ) {
    try {
      // console.log('📥 Create conversation request:', { dto, user });

      // ROLE DETECTION: Determine role from user object
      let detectedRole: 'ADMIN' | 'DOCTOR';

      if (user.role) {
        detectedRole = user.role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'DOCTOR';
        // console.log('✅ Role from JWT:', detectedRole);
      } else {
        // Fallback: Detect from user object structure
        if (
          'licenceNo' in user ||
          'specialities' in user ||
          'experience' in user
        ) {
          detectedRole = 'DOCTOR';
        } else {
          detectedRole = 'ADMIN';
        }
        // console.log(
        //   '⚠️ Role detected from user fields (JWT role missing):',
        //   detectedRole,
        // );
      }

      // Get chat user ID
      const userId = await this.chatService.getOrCreateUserId(
        user.id,
        detectedRole,
      );
      // console.log('✅ Chat user ID:', userId);

      let doctorId: string;

      if (detectedRole === 'DOCTOR') {
        // Doctor creating conversation - use their own ID
        doctorId = user.id;
        // console.log('�‍⚕️ Doctor creating conversation, doctorId:', doctorId);
      } else {
        // Admin creating conversation - require doctorId in body
        if (!dto.doctorId) {
          throw new BadRequestException(
            'doctorId is required when admin creates conversation',
          );
        }
        doctorId = dto.doctorId;
        // console.log('👨‍💼 Admin creating conversation with doctor:', doctorId);
      }

      // Prepare conversation data
      const conversationDto = {
        userId,
        userRole: detectedRole === 'DOCTOR' ? UserRole.DOCTOR : UserRole.ADMIN,
        doctorId,
        subject: dto.subject,
      };

      // console.log('📤 Final conversation DTO:', conversationDto);

      return this.chatService.createConversation(conversationDto);
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      throw new BadRequestException(
        error.message || 'Failed to create conversation',
      );
    }
  }

  @Get('conversations')
  async getAllConversations(@Query('adminId') adminId?: string) {
    return this.chatService.getAllConversations(adminId);
  }

  @Get('my-conversations')
  @UseGuards(JwtAuthGuard)
  async getMyConversations(@CurrentUser() user: any) {
    try {
      // console.log(
      //   '🔍 getMyConversations - Full user object:',
      //   JSON.stringify(user, null, 2),
      // );

      // ROLE DETECTION:
      // JWT contains admin/doctor table data, not User table data
      // Infer role from payload structure:
      // - Doctors have: licenceNo, specialities, experience (medical fields)
      // - Admins don't have these fields
      let userRole: 'ADMIN' | 'DOCTOR';

      if (
        'licenceNo' in user ||
        'specialities' in user ||
        'experience' in user
      ) {
        userRole = 'DOCTOR';
      } else {
        userRole = 'ADMIN';
      }

      // console.log('📋 Detected role:', userRole);
      // console.log('📋 Account ID:', user.id);

      const chatUserId = await this.chatService.getOrCreateUserId(
        user.id,
        userRole,
      );

      // console.log('✅ Chat user ID:', chatUserId);

      return this.chatService.getUserConversations(chatUserId);
    } catch (error) {
      console.error('❌ Error in getMyConversations:', error);
      throw error;
    }
  }

  @Get('conversations/user/:userId')
  async getUserConversations(@Param('userId') userId: string) {
    return this.chatService.getUserConversations(userId);
  }

  @Get('conversations/:id')
  async getConversationById(@Param('id') id: string) {
    return this.chatService.getConversationById(id);
  }

  @Get('conversations/:id/messages')
  async getConversationMessages(@Param('id') id: string) {
    return this.chatService.getConversationMessages(id);
  }

  @Put('conversations/:id')
  async updateConversation(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(id, dto);
  }

  @Post('messages')
  async sendMessage(@Body() dto: SendMessageDto & { senderId: string }) {
    const { senderId, ...messageDto } = dto;
    return this.chatService.sendMessage(senderId, messageDto);
  }

  @Put('conversations/:id/read')
  async markAsRead(
    @Param('id') conversationId: string,
    @Body('userId') userId: string,
  ) {
    return this.chatService.markMessagesAsRead(conversationId, userId);
  }

  @Get('unread/:userId')
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.chatService.getUnreadCount(userId);
    return { count };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: fileStorage,
      fileFilter: allFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!conversationId) {
      throw new BadRequestException('conversationId is required');
    }

    const fileUrl = `/uploads/${file.filename}`;

    return {
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  @Get('online/:userId')
  async isUserOnline(@Param('userId') userId: string) {
    const isOnline = this.chatService.isUserOnline(userId);
    return { userId, isOnline };
  }

  @Get('conversations/:id/participants')
  async getConversationParticipants(@Param('id') conversationId: string) {
    return this.chatService.getConversationParticipants(conversationId);
  }
}
