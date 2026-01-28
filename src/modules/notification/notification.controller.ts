import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Query,
    Headers,
    Body,
    UseGuards,
    UnauthorizedException,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { MarkMultipleAsReadDto } from './dto/mark-multiple-as-read.dto';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('notifications')
@UseGuards(DoctorGuard)
export class NotificationController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Extract doctorId from session token
     */
    private async extractDoctorId(authorization: string): Promise<string> {
        if (!authorization) {
            throw new UnauthorizedException('Authorization header is required');
        }

        const token = authorization.split(' ')[1];
        if (!token) {
            throw new UnauthorizedException('Invalid authorization format');
        }

        // Get doctor ID from session
        const session = await this.prisma.session.findUnique({
            where: { accessToken: token },
        });

        if (!session || !session.doctorId) {
            throw new UnauthorizedException('Invalid session or doctor not found');
        }

        return session.doctorId;
    }

    /**
     * GET /api/v1/notifications
     * Get notification history with pagination and filters
     */
    @Get()
    async getNotifications(
        @Headers('authorization') authorization: string,
        @Query() query: GetNotificationsQueryDto,
    ) {
        const doctorId = await this.extractDoctorId(authorization);
        const result = await this.notificationService.getNotifications(doctorId, query);

        return {
            statusCode: 200,
            success: true,
            message: 'Notifications retrieved successfully',
            data: result,
        };
    }

    /**
     * GET /api/v1/notifications/unread-count
     * Get unread notification count
     */
    @Get('unread-count')
    async getUnreadCount(@Headers('authorization') authorization: string) {
        const doctorId = await this.extractDoctorId(authorization);
        const count = await this.notificationService.getUnreadCount(doctorId);

        return {
            statusCode: 200,
            success: true,
            message: 'Unread count retrieved successfully',
            data: { count },
        };
    }

    /**
     * PATCH /api/v1/notifications/:id/read
     * Mark a single notification as read
     */
    @Patch(':id/read')
    async markAsRead(
        @Headers('authorization') authorization: string,
        @Param('id') notificationId: string,
    ) {
        const doctorId = await this.extractDoctorId(authorization);
        const notification = await this.notificationService.markAsRead(
            notificationId,
            doctorId,
        );

        return {
            statusCode: 200,
            success: true,
            message: 'Notification marked as read',
            data: notification,
        };
    }

    /**
     * PATCH /api/v1/notifications/read-multiple
     * Mark multiple notifications as read
     */
    @Patch('read-multiple')
    async markMultipleAsRead(
        @Headers('authorization') authorization: string,
        @Body() dto: MarkMultipleAsReadDto,
    ) {
        const doctorId = await this.extractDoctorId(authorization);
        const result = await this.notificationService.markMultipleAsRead(
            dto.notificationIds,
            doctorId,
        );

        return {
            statusCode: 200,
            success: true,
            message: `${result.count} notifications marked as read`,
            data: result,
        };
    }

    /**
     * PATCH /api/v1/notifications/read-all
     * Mark all notifications as read
     */
    @Patch('read-all')
    async markAllAsRead(@Headers('authorization') authorization: string) {
        const doctorId = await this.extractDoctorId(authorization);
        const result = await this.notificationService.markAllAsRead(doctorId);

        return {
            statusCode: 200,
            success: true,
            message: `${result.count} notifications marked as read`,
            data: result,
        };
    }

    /**
     * DELETE /api/v1/notifications/:id
     * Delete a notification
     */
    @Delete(':id')
    async deleteNotification(
        @Headers('authorization') authorization: string,
        @Param('id') notificationId: string,
    ) {
        const doctorId = await this.extractDoctorId(authorization);
        await this.notificationService.deleteNotification(notificationId, doctorId);

        return {
            statusCode: 200,
            success: true,
            message: 'Notification deleted successfully',
        };
    }
}
