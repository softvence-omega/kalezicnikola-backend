import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto';
import { UseGuards } from '@nestjs/common';
import { omit } from 'src/utils/functions';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this based on your frontend URL
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(private chatService: ChatService) { }

  async handleConnection(client: AuthenticatedSocket) {
    console.log(`💬 Chat connection attempt on namespace ${client.nsp.name}: ${client.id}`);
    try {
      // Extract userId from handshake query or auth token
      const userId = client.handshake.query.userId as string;
      const userRole = client.handshake.query.userRole as string;

      if (!userId) {
        client.disconnect();
        return;
      }

      client.userId = userId;
      client.userRole = userRole;
      this.connectedUsers.set(userId, client.id);

      // Join user to their personal room
      client.join(`user:${userId}`);

      // console.log(`User ${userId} connected to chat`);

      // Broadcast user online status
      this.server.emit('user_online', { userId, userRole });

      // Send unread count
      const unreadCount = await this.chatService.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Broadcast user offline status
      this.server.emit('user_offline', { userId: client.userId, userRole: client.userRole });

      this.connectedUsers.delete(client.userId);
      // console.log(`User ${client.userId} disconnected from chat`);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    try {
      if (!client.userId) {
        console.error('❌ User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }

      // console.log('📨 Sending message from userId:', client.userId, 'Role:', client.userRole);
      // console.log('📨 Message data:', JSON.stringify(data, null, 2));

      // Save message to database first
      // console.log('💾 Saving message to database...');
      let message;
      try {
        message = await this.chatService.sendMessage(client.userId, data);
        // console.log('✅ Message saved to database:', message.id);
      } catch (dbError) {
        console.error('❌ Database error while saving message:', dbError);
        return { success: false, error: 'Failed to save message: ' + dbError.message };
      }

      // Get conversation to find recipients
      // console.log('🔍 Fetching conversation details...');
      const conversation = await this.chatService.getConversationById(
        data.conversationId,
      );

      if (!conversation) {
        console.error('❌ Conversation not found:', data.conversationId);
        return { success: false, error: 'Conversation not found' };
      }

      // console.log('✅ Conversation found:', conversation.id);

      const messagePayload = {
        message,
        conversation,
      };

      // console.log('📤 Broadcasting message to conversation:', data.conversationId);

      // Emit to conversation room (for users who joined the room)
      this.server.to(`conversation:${data.conversationId}`).emit('new_message', messagePayload);

      // ALWAYS emit to sender's room (so they see their own message)
      this.server.to(`user:${client.userId}`).emit('new_message', messagePayload);

      // ONE-CONVERSATION-PER-DOCTOR MODEL:
      // - If DOCTOR sends: broadcast to ALL admins
      // - If ADMIN sends: send to the specific doctor

      if (client.userRole === 'DOCTOR') {
        // Doctor sending message - broadcast to ALL admins
        // console.log('👨‍⚕️ Doctor sending message - broadcasting to all admins');

        // Get all admin user IDs
        const allAdmins = await this.chatService.getAllAdminUserIds();
        // console.log(`📋 Found ${allAdmins.length} admins:`, allAdmins);

        // Send to each admin's room
        for (const adminUserId of allAdmins) {
          // console.log('📬 Sending to admin userId:', adminUserId);
          this.server.to(`user:${adminUserId}`).emit('new_message', messagePayload);
        }

        // console.log(`✅ Message sent to ${allAdmins.length} admins`);
      } else if (client.userRole === 'ADMIN' && conversation.userId) {
        // Admin sending to Doctor
        // console.log('👨‍💼 Admin sending message to doctor userId:', conversation.userId);
        this.server.to(`user:${conversation.userId}`).emit('new_message', messagePayload);
        // console.log('✅ Message sent to doctor');
      } else {
        console.warn('⚠️ Unknown user role or missing conversation.userId');
      }

      // console.log('✅ Message broadcast complete');
      const msg = omit(messagePayload, ['conversation'])

      return { success: true, msg };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      if (!client.userId) {
        return { success: false, error: 'User not authenticated' };
      }

      client.join(`conversation:${data.conversationId}`);

      // Mark messages as read
      await this.chatService.markMessagesAsRead(
        data.conversationId,
        client.userId,
      );

      // Get conversation details
      const conversation = await this.chatService.getConversationById(
        data.conversationId,
      );

      return { success: true, conversation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // Broadcast typing status to others in the conversation
    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      if (!client.userId) {
        return { success: false, error: 'User not authenticated' };
      }

      await this.chatService.markMessagesAsRead(
        data.conversationId,
        client.userId,
      );

      // Notify other user
      this.server.to(`conversation:${data.conversationId}`).emit('messages_read', {
        conversationId: data.conversationId,
        userId: client.userId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper method to notify specific user
  notifyUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get online users
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
