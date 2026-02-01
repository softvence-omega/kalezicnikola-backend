import { DoctorNotificationType } from 'generated/prisma';

export class NotificationResponseDto {
    id: string;
    doctorId: string;
    type: DoctorNotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
    isRead: boolean;
    createdAt: Date;
}
