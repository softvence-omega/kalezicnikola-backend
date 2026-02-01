import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from 'src/prisma/prisma.service';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/notifications',
})
@Injectable()
export class NotificationGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedDoctors: Map<string, string> = new Map(); // doctorId -> socketId

    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
    ) {
        console.log('🚀 NotificationGateway initialized');
    }

    /**
     * Handle client connection
     */
    async handleConnection(client: Socket) {
        console.log(`📡 Socket connection attempt on namespace: ${client.nsp.name}`);
        console.log(`🔑 Full handshake data:`, {
            auth: client.handshake.auth,
            query: client.handshake.query,
            headers: {
                authorization: client.handshake.headers.authorization,
                ...Object.fromEntries(
                    Object.entries(client.handshake.headers).filter(([key]) => 
                        key.toLowerCase().includes('auth') || key.toLowerCase().includes('token')
                    )
                )
            }
        });
        
        try {
            // Extract token from handshake auth, headers, OR query parameters
            const token =
                client.handshake.auth?.token ||
                client.handshake.headers.authorization?.split(' ')[1] ||
                client.handshake.query?.token;

            console.log(`🔑 Extracted token: ${token ? token.substring(0, 20) + '...' : 'NULL'}`);
            console.log(`🔑 Token sources: auth=${!!client.handshake.auth?.token}, headers=${!!client.handshake.headers.authorization}, query=${!!client.handshake.query?.token}`);

            if (!token) {
                console.log('❌ Connection attempt failed: No token provided');
                throw new UnauthorizedException('No token provided');
            }

            // Verify token using session lookup
            const session = await this.prisma.session.findUnique({
                where: { accessToken: token },
                include: { doctor: { select: { id: true, firstName: true, lastName: true } } }
            });

            console.log(`🔍 Session lookup result:`, session ? 'FOUND' : 'NOT FOUND');

            if (!session) {
                console.log(`❌ No session found for token: ${token.substring(0, 20)}...`);
                throw new UnauthorizedException('Invalid session');
            }

            if (!session.doctorId) {
                // console.log(`❌ Session found but doctorId is missing. ID: ${session.id}`);
                throw new UnauthorizedException('Not a doctor session');
            }

            const doctorId = session.doctorId;
            // console.log(`👤 Authenticated doctor: ${doctorId} (${session.doctor?.firstName})`);

            // Store connection
            this.connectedDoctors.set(doctorId, client.id);

            // Join doctor-specific room
            const roomName = `doctor:${doctorId}`;
            await client.join(roomName);
            client.data.doctorId = doctorId;

            console.log(`✅ Doctor ${doctorId} connected to notifications (socket: ${client.id}, room: ${roomName})`);

            // Send pending unread notifications
            const unreadNotifications = await this.notificationService.getUnreadNotifications(doctorId);

            if (unreadNotifications.length > 0) {
                client.emit('unread-notifications', {
                    notifications: unreadNotifications,
                    count: unreadNotifications.length,
                });
            }

            // Send unread count
            const unreadCount = await this.notificationService.getUnreadCount(doctorId);
            client.emit('unread-count', { count: unreadCount });

        } catch (error) {
            console.error('WebSocket connection error:', error.message);
            console.error('Full error:', error);
            client.emit('error', { message: 'Authentication failed' });
            client.disconnect();
        }
    }

    /**
     * Handle client disconnection
     */
    handleDisconnect(client: Socket) {
        const doctorId = client.data.doctorId;

        if (doctorId) {
            this.connectedDoctors.delete(doctorId);
            console.log(`❌ Doctor ${doctorId} disconnected from notifications`);
        }
    }

    /**
     * Emit notification to a specific doctor
     */
    async emitNotificationToDoctor(doctorId: string, notification: any) {
        const roomName = `doctor:${doctorId}`;
        console.log(`📣 Attempting to emit notification to room ${roomName}:`, notification.title);
        console.log(`📣 Notification data:`, JSON.stringify(notification, null, 2));

        // Check if doctor is connected
        const socketId = this.connectedDoctors.get(doctorId);
        console.log(`📣 Connected doctors:`, Array.from(this.connectedDoctors.entries()));
        console.log(`📣 Socket ID for doctor ${doctorId}:`, socketId || 'NOT CONNECTED');

        // Check room members - simplified logging
        console.log(`📣 Attempting to emit to room: ${roomName}`);

        // Emit to doctor's room
        const emitResult = this.server.to(roomName).emit('new-notification', notification);
        console.log(`📣 Emit result:`, emitResult);
        console.log(`📣 Emitted 'new-notification' to room ${roomName}`);

        // Update unread count
        const unreadCount = await this.notificationService.getUnreadCount(doctorId);
        console.log(`📣 Emitting unread-count update to room ${roomName}: ${unreadCount}`);
        this.server.to(roomName).emit('unread-count', { count: unreadCount });
    }

    /**
     * Update unread count for a doctor
     */
    async updateUnreadCount(doctorId: string) {
        const unreadCount = await this.notificationService.getUnreadCount(doctorId);
        this.server.to(`doctor:${doctorId}`).emit('unread-count', { count: unreadCount });
    }

    /**
     * Handle notification read event from client
     */
    @SubscribeMessage('mark-as-read')
    async handleMarkAsRead(client: Socket, payload: { notificationId: string }) {
        const doctorId = client.data.doctorId;

        try {
            await this.notificationService.markAsRead(payload.notificationId, doctorId);
            await this.updateUnreadCount(doctorId);

            client.emit('notification-read', { notificationId: payload.notificationId });
        } catch (error) {
            client.emit('error', { message: error.message });
        }
    }

    /**
     * Handle mark all as read event from client
     */
    @SubscribeMessage('mark-all-as-read')
    async handleMarkAllAsRead(client: Socket) {
        const doctorId = client.data.doctorId;

        try {
            const result = await this.notificationService.markAllAsRead(doctorId);
            await this.updateUnreadCount(doctorId);

            client.emit('all-notifications-read', { count: result.count });
        } catch (error) {
            client.emit('error', { message: error.message });
        }
    }
}
