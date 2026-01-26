export class RegionalSettingsDto {
  id: string;
  doctorId: string;
  defaultCalendarView: string;
  defaultAppointmentDuration: string;
  sendAppointmentReminders: boolean;
  reminderTime: string;
  bufferTimeBetween: string;
  createdAt: Date;
  updatedAt: Date;
}
