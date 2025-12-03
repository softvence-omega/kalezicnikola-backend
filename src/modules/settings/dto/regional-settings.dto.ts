export class RegionalSettingsDto {
  id: string;
  doctorId: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  defaultCalendarView: string;
  defaultAppointmentDuration: string;
  allowOnlineBooking: boolean;
  requireApprovalForBooking: boolean;
  sendAppointmentReminders: boolean;
  reminderTime: string;
  bufferTimeBetween: string;
  createdAt: Date;
  updatedAt: Date;
}
