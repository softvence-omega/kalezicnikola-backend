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
import { fileStorage, imageFileFilter, allFileFilter } from 'src/utils/file-upload.util';
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
      console.log('📥 Create conversation request:', { dto, user });
      
      // If adminId is provided in body, it means admin is starting chat with a doctor
      // In this case, adminId from body is actually the doctor's chat user ID
      // Check if user is admin by checking if they have admin fields (firstName, lastName) and no doctor-specific fields
      const isAdmin = user.role?.toUpperCase() === 'ADMIN' || 
                     user.userType?.toUpperCase() === 'ADMIN' || 
                     user.type?.toUpperCase() === 'ADMIN';
      
      if (dto.adminId && isAdmin) {
        // Admin creating conversation with doctor
        // adminId in DTO is actually the doctor's chat user ID
        console.log('🔀 Admin initiating chat with doctor. Doctor chat user ID:', dto.adminId);
        
        const adminChatUserId = await this.chatService.getOrCreateUserId(
          user.id,
          'ADMIN',
        );
        
        console.log('✅ Admin chat user ID:', adminChatUserId);
        
        const conversationData = {
          userId: dto.adminId,  // Doctor's chat user ID
          userRole: UserRole.DOCTOR,
          subject: dto.subject,
          adminId: adminChatUserId,  // Admin's chat user ID
        };
        
        console.log('📤 Creating conversation with data:', conversationData);
        
        return this.chatService.createConversation(conversationData);
      }
      
      // Normal flow: user creating their own conversation
      const userId = await this.chatService.getOrCreateUserId(
        user.id,
        user.role?.toUpperCase() as 'ADMIN' | 'DOCTOR',
      );
      
      const userRole = user.role?.toUpperCase() === 'ADMIN' ? UserRole.ADMIN : UserRole.DOCTOR;
      
      // POOL MODEL: adminId is optional for doctors
      // - If adminId provided: conversation with specific admin
      // - If adminId null: conversation available to all admins (team pool)
      
      // Merge with DTO
      const conversationDto = {
        ...dto,
        userId,
        // If adminId is provided, resolve it to Chat User ID
        adminId: dto.adminId 
          ? await this.chatService.getOrCreateUserId(dto.adminId, 'ADMIN')
          : null, // null = available to all admins
        userRole,
      };
      
      return this.chatService.createConversation(conversationDto);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new BadRequestException(error.message || 'Failed to create conversation');
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
      console.log('🔍 getMyConversations - Full user object:', JSON.stringify(user, null, 2));
      
      // ROLE DETECTION:
      // JWT contains admin/doctor table data, not User table data
      // Infer role from payload structure:
      // - Doctors have: licenceNo, specialities, experience (medical fields)
      // - Admins don't have these fields
      let userRole: 'ADMIN' | 'DOCTOR';
      
      if ('licenceNo' in user || 'specialities' in user || 'experience' in user) {
        userRole = 'DOCTOR';
      } else {
        userRole = 'ADMIN';
      }
      
      console.log('📋 Detected role:', userRole);
      console.log('📋 Account ID:', user.id);
      
      const chatUserId = await this.chatService.getOrCreateUserId(user.id, userRole);
      
      console.log('✅ Chat user ID:', chatUserId);
      
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

  @Put('conversations/:id')
  async updateConversation(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(id, dto);
  }

  @Post('messages')
  async sendMessage(
    @Body() dto: SendMessageDto & { senderId: string },
  ) {
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
}
