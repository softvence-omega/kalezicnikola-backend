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

  constructor(private chatService: ChatService) {}

  async handleConnection(client: AuthenticatedSocket) {
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

      console.log(`User ${userId} connected to chat`);

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
      console.log(`User ${client.userId} disconnected from chat`);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    try {
      if (!client.userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const message = await this.chatService.sendMessage(client.userId, data);

      // Get conversation to find recipient
      const conversation = await this.chatService.getConversationById(
        data.conversationId,
      );

      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }

      // Emit to conversation room
      this.server.to(`conversation:${data.conversationId}`).emit('new_message', {
        message,
        conversation,
      });

      // Also emit to admin room if message from doctor
      if (client.userRole === 'DOCTOR' && conversation.adminId) {
        this.server.to(`user:${conversation.adminId}`).emit('new_message', {
          message,
          conversation,
        });
      }

      // Emit to doctor if message from admin
      if (client.userRole === 'ADMIN') {
        this.server.to(`user:${conversation.userId}`).emit('new_message', {
          message,
          conversation,
        });
      }

      return { success: true, message };
    } catch (error) {
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
