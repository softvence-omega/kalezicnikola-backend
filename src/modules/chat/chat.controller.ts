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

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('user-id/:accountId')
  async getUserId(
    @Param('accountId') accountId: string,
    @Query('role') role: string,
  ) {
    const userId = await this.chatService.getOrCreateUserId(
      accountId,
      role as 'ADMIN' | 'DOCTOR',
    );
    return { userId };
  }

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: any,
  ) {
    // Extract userId and userRole from JWT token
    const userId = await this.chatService.getOrCreateUserId(
      user.id,
      user.role as 'ADMIN' | 'DOCTOR',
    );
    
    // Merge with DTO
    const conversationDto = {
      ...dto,
      userId,
      userRole: user.role,
    };
    
    return this.chatService.createConversation(conversationDto);
  }

  @Get('conversations')
  async getAllConversations(@Query('adminId') adminId?: string) {
    return this.chatService.getAllConversations(adminId);
  }

  @Get('my-conversations')
  @UseGuards(JwtAuthGuard)
  async getMyConversations(@CurrentUser() user: any) {
    // Get chat user ID from JWT token
    const userId = await this.chatService.getOrCreateUserId(
      user.id,
      user.role as 'ADMIN' | 'DOCTOR',
    );
    return this.chatService.getUserConversations(userId);
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
