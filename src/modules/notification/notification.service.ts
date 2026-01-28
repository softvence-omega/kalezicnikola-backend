import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { DoctorNotificationType } from 'generated/prisma';

@Injectable()
export class NotificationService {
    constructor(private prisma: PrismaService) { }

    /**
     * Check if notification should be sent based on doctor's settings
     */
    async shouldSendNotification(
        doctorId: string,
        type: DoctorNotificationType,
    ): Promise<boolean> {
        const settings = await this.prisma.doctorNotificationSettings.findUnique({
            where: { doctorId },
        });

        if (!settings) {
            return true; // Default to sending if no settings found
        }

        switch (type) {
            case 'APPOINTMENT_REMINDER':
                return settings.appointmentReminders;
            case 'PATIENT_UPDATE':
                return settings.patientUpdates;
            case 'CALL_LOG':
                return settings.callLogs;
            case 'TASK_DEADLINE':
                return settings.taskDeadlines;
            default:
                return true;
        }
    }

    /**
     * Create a new notification
     */
    async createNotification(
        dto: CreateNotificationDto,
    ): Promise<NotificationResponseDto | null> {
        // Ensure doctorId is provided
        if (!dto.doctorId) {
            throw new Error('doctorId is required');
        }

        // Check if notification should be sent based on settings
        const shouldSend = await this.shouldSendNotification(dto.doctorId, dto.type);

        if (!shouldSend) {
            return null; // Don't create notification if disabled
        }

        const notification = await this.prisma.doctorNotification.create({
            data: {
                doctorId: dto.doctorId,
                type: dto.type,
                title: dto.title,
                message: dto.message,
                metadata: dto.metadata || {},
            },
        });

        return notification as NotificationResponseDto;
    }

    /**
     * Get notifications for a doctor with pagination and filters
     */
    async getNotifications(
        doctorId: string,
        query: GetNotificationsQueryDto,
    ): Promise<{
        notifications: NotificationResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { page = 1, limit = 20, unreadOnly, type } = query;
        const skip = (page - 1) * limit;

        const where: any = { doctorId };

        if (unreadOnly) {
            where.isRead = false;
        }

        if (type) {
            where.type = type;
        }

        const [notifications, total] = await Promise.all([
            this.prisma.doctorNotification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.doctorNotification.count({ where }),
        ]);

        return {
            notifications: notifications as NotificationResponseDto[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get unread notification count for a doctor
     */
    async getUnreadCount(doctorId: string): Promise<number> {
        return this.prisma.doctorNotification.count({
            where: {
                doctorId,
                isRead: false,
            },
        });
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(
        notificationId: string,
        doctorId: string,
    ): Promise<NotificationResponseDto> {
        // Verify notification belongs to doctor
        const notification = await this.prisma.doctorNotification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        if (notification.doctorId !== doctorId) {
            throw new ForbiddenException('You do not have access to this notification');
        }

        const updated = await this.prisma.doctorNotification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });

        return updated as NotificationResponseDto;
    }

    /**
     * Mark multiple notifications as read
     */
    async markMultipleAsRead(
        notificationIds: string[],
        doctorId: string,
    ): Promise<{ count: number }> {
        // Verify all notifications belong to the doctor
        const notifications = await this.prisma.doctorNotification.findMany({
            where: {
                id: { in: notificationIds },
            },
            select: { id: true, doctorId: true },
        });

        // Check if all notifications belong to the doctor
        const allBelongToDoctor = notifications.every(
            (n) => n.doctorId === doctorId,
        );

        if (!allBelongToDoctor) {
            throw new ForbiddenException(
                'Some notifications do not belong to you',
            );
        }

        const result = await this.prisma.doctorNotification.updateMany({
            where: {
                id: { in: notificationIds },
                doctorId,
            },
            data: { isRead: true },
        });

        return { count: result.count };
    }

    /**
     * Mark all notifications as read for a doctor
     */
    async markAllAsRead(doctorId: string): Promise<{ count: number }> {
        const result = await this.prisma.doctorNotification.updateMany({
            where: {
                doctorId,
                isRead: false,
            },
            data: { isRead: true },
        });

        return { count: result.count };
    }

    /**
     * Delete a notification
     */
    async deleteNotification(
        notificationId: string,
        doctorId: string,
    ): Promise<void> {
        // Verify notification belongs to doctor
        const notification = await this.prisma.doctorNotification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        if (notification.doctorId !== doctorId) {
            throw new ForbiddenException('You do not have access to this notification');
        }

        await this.prisma.doctorNotification.delete({
            where: { id: notificationId },
        });
    }

    /**
     * Get unread notifications for a doctor (used when connecting to socket)
     */
    async getUnreadNotifications(
        doctorId: string,
    ): Promise<NotificationResponseDto[]> {
        const notifications = await this.prisma.doctorNotification.findMany({
            where: {
                doctorId,
                isRead: false,
            },
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit to last 50 unread
        });

        return notifications as NotificationResponseDto[];
    }

    /**
     * Cleanup notifications older than 30 days
     * Runs daily at 2 AM
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async cleanupOldNotifications(): Promise<void> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await this.prisma.doctorNotification.deleteMany({
            where: {
                createdAt: {
                    lt: thirtyDaysAgo,
                },
            },
        });

        console.log(`🧹 Cleaned up ${result.count} notifications older than 30 days`);
    }
}
