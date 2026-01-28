import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { DoctorNotificationType } from 'generated/prisma';

/**
 * Helper service to trigger notifications from other modules
 */
@Injectable()
export class NotificationHelperService {
    constructor(
        private notificationService: NotificationService,
        private notificationGateway: NotificationGateway,
    ) { }

    /**
     * Trigger appointment reminder notification
     */
    async notifyAppointmentReminder(
        doctorId: string,
        appointmentData: {
            appointmentId: string;
            patientName: string;
            appointmentTime: Date;
        },
    ): Promise<void> {
        const notification = await this.notificationService.createNotification({
            doctorId,
            type: DoctorNotificationType.APPOINTMENT_REMINDER,
            title: 'Upcoming Appointment',
            message: `You have an appointment with ${appointmentData.patientName} at ${appointmentData.appointmentTime.toLocaleString()}`,
            metadata: {
                appointmentId: appointmentData.appointmentId,
                patientName: appointmentData.patientName,
                appointmentTime: appointmentData.appointmentTime.toISOString(),
            },
        });

        if (notification) {
            await this.notificationGateway.emitNotificationToDoctor(doctorId, notification);
        }
    }

    /**
     * Trigger patient update notification
     */
    async notifyPatientUpdate(
        doctorId: string,
        patientData: {
            patientId: string;
            patientName: string;
            action: 'added' | 'updated';
        },
    ): Promise<void> {
        const notification = await this.notificationService.createNotification({
            doctorId,
            type: DoctorNotificationType.PATIENT_UPDATE,
            title: 'Patient Update',
            message: `New patient ${patientData.patientName} has been ${patientData.action === 'added' ? 'added' : 'updated'}`,
            metadata: {
                patientId: patientData.patientId,
                patientName: patientData.patientName,
                action: patientData.action,
            },
        });

        if (notification) {
            await this.notificationGateway.emitNotificationToDoctor(doctorId, notification);
        }
    }

    /**
     * Trigger call log notification
     */
    async notifyCallLog(
        doctorId: string,
        callData: {
            callId: string;
            callerName?: string;
            callType: string;
            timestamp: Date;
        },
    ): Promise<void> {
        const notification = await this.notificationService.createNotification({
            doctorId,
            type: DoctorNotificationType.CALL_LOG,
            title: 'New Call Log',
            message: `New ${callData.callType} call ${callData.callerName ? `from ${callData.callerName}` : ''} logged`,
            metadata: {
                callId: callData.callId,
                callerName: callData.callerName,
                callType: callData.callType,
                timestamp: callData.timestamp.toISOString(),
            },
        });

        if (notification) {
            await this.notificationGateway.emitNotificationToDoctor(doctorId, notification);
        }
    }

    /**
     * Trigger task deadline notification
     */
    async notifyTaskDeadline(
        doctorId: string,
        taskData: {
            taskId: string;
            taskTitle: string;
            deadline: Date;
            priority?: string;
        },
    ): Promise<void> {
        const notification = await this.notificationService.createNotification({
            doctorId,
            type: DoctorNotificationType.TASK_DEADLINE,
            title: 'Task Deadline Approaching',
            message: `Task "${taskData.taskTitle}" is due on ${taskData.deadline.toLocaleString()}`,
            metadata: {
                taskId: taskData.taskId,
                taskTitle: taskData.taskTitle,
                deadline: taskData.deadline.toISOString(),
                priority: taskData.priority,
            },
        });

        if (notification) {
            await this.notificationGateway.emitNotificationToDoctor(doctorId, notification);
        }
    }
}
