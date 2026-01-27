export class NotificationSettingsDto {
  id: string;
  doctorId: string;
  appointmentReminders: boolean;
  patientUpdates: boolean;
  callLogs: boolean;
  taskDeadlines: boolean;
  securityAlerts: boolean;
  createdAt: Date;
  updatedAt: Date;
}
