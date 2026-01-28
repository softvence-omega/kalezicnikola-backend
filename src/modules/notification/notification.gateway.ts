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
        origin: [
            'http://localhost:3000',
            'http://localhost:8080',
            'https://docline.ai',
            'https://kalezicnikola-frontend.vercel.app',
        ],
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
    ) { }

    /**
     * Handle client connection
     */
    async handleConnection(client: Socket) {
        try {
            // Extract token from handshake auth, headers, OR query parameters
            const token =
                client.handshake.auth?.token ||
                client.handshake.headers.authorization?.split(' ')[1] ||
                client.handshake.query?.token;

            if (!token) {
                console.log('❌ Connection attempt failed: No token provided');
                throw new UnauthorizedException('No token provided');
            }

            // Verify token using session lookup
            const session = await this.prisma.session.findUnique({
                where: { accessToken: token },
            });

            if (!session || !session.doctorId) {
                throw new UnauthorizedException('Invalid session or not a doctor');
            }

            const doctorId = session.doctorId;

            // Store connection
            this.connectedDoctors.set(doctorId, client.id);

            // Join doctor-specific room
            client.join(`doctor:${doctorId}`);
            client.data.doctorId = doctorId;

            console.log(`✅ Doctor ${doctorId} connected to notifications (socket: ${client.id})`);

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
        // Emit to doctor's room
        this.server.to(`doctor:${doctorId}`).emit('new-notification', notification);

        // Update unread count
        const unreadCount = await this.notificationService.getUnreadCount(doctorId);
        this.server.to(`doctor:${doctorId}`).emit('unread-count', { count: unreadCount });
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
