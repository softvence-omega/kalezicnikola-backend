export class SecuritySettingsDto {
  id: string;
  doctorId: string;
  enforceTwoFA: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  encryptSensitiveData: boolean;
  enableAuditLogs: boolean;
  createdAt: Date;
  updatedAt: Date;
}
