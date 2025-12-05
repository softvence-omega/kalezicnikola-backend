-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'DOCTOR');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHERS');

-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CallStatus" AS ENUM ('STARTED', 'ENDED', 'MISSED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."Sentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "public"."Flag" AS ENUM ('LOW', 'HIGH', 'NORMAL');

-- CreateEnum
CREATE TYPE "public"."PrescriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('IN_APP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ConsentType" AS ENUM ('MARKETING', 'CARE_ANALYTICS');

-- CreateEnum
CREATE TYPE "public"."DataRequestType" AS ENUM ('EXPORT', 'ERASURE');

-- CreateEnum
CREATE TYPE "public"."DataRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."Department" AS ENUM ('CARDIOLOGY', 'NEUROLOGY', 'PEDIATRICS', 'ORTHOPEDICS', 'DERMATOLOGY', 'RADIOLOGY', 'PHARMACY', 'ADMINISTRATION', 'RECEPTION', 'NURSING', 'LABORATORY');

-- CreateEnum
CREATE TYPE "public"."EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN', 'TRAINEE');

-- CreateEnum
CREATE TYPE "public"."MetricType" AS ENUM ('CPU', 'MEMORY', 'DISK', 'NETWORK', 'DATABASE_CONNECTIONS', 'REQUEST_RATE', 'ERROR_RATE');

-- CreateEnum
CREATE TYPE "public"."ServiceName" AS ENUM ('API_GATEWAY', 'DATABASE_PRIMARY', 'DATABASE_REPLICA', 'VOICEBOT_SERVICE', 'AUTHENTICATION_SERVICE', 'PAYMENT_GATEWAY', 'NOTIFICATION_SERVICE', 'PRESCRIPTION_SERVICE', 'APPOINTMENT_SERVICE', 'PATIENT_SERVICE', 'LAB_SERVICE');

-- CreateEnum
CREATE TYPE "public"."ServiceStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."IncidentSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "public"."IncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'POSTMORTEM');

-- CreateEnum
CREATE TYPE "public"."HealthCheckStatus" AS ENUM ('HEALTHY', 'UNHEALTHY', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "public"."Timezone" AS ENUM ('UTC', 'Africa_Cairo', 'Africa_Johannesburg', 'America_New_York', 'America_Chicago', 'America_Denver', 'America_Los_Angeles', 'America_Toronto', 'America_Sao_Paulo', 'Asia_Dhaka', 'Asia_Dubai', 'Asia_Riyadh', 'Asia_Singapore', 'Asia_Kuala_Lumpur', 'Asia_Tokyo', 'Europe_London', 'Europe_Berlin', 'Europe_Paris', 'Europe_Madrid', 'Europe_Rome', 'Australia_Sydney');

-- CreateEnum
CREATE TYPE "public"."DateFormat" AS ENUM ('DD_MM_YYYY', 'MM_DD_YYYY', 'YYYY_MM_DD', 'DD_MMM_YYYY', 'MMM_DD_YYYY');

-- CreateEnum
CREATE TYPE "public"."TimeFormat" AS ENUM ('HOUR_12', 'HOUR_24');

-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('English', 'Arabic', 'Bengali', 'French', 'German', 'Spanish', 'Italian', 'Hindi', 'Chinese');

-- CreateEnum
CREATE TYPE "public"."CalendarView" AS ENUM ('DayView', 'WeekView', 'MonthView', 'AgendaView');

-- CreateEnum
CREATE TYPE "public"."AppointmentDuration" AS ENUM ('Minutes_10', 'Minutes_15', 'Minutes_20', 'Minutes_30', 'Minutes_45', 'Minutes_60');

-- CreateEnum
CREATE TYPE "public"."ReminderTime" AS ENUM ('Minutes_10_Before', 'Minutes_30_Before', 'Hour_1_Before', 'Hours_2_Before', 'Hours_6_Before', 'Hours_12_Before', 'Hours_24_Before');

-- CreateEnum
CREATE TYPE "public"."BufferTime" AS ENUM ('Minutes_5', 'Minutes_10', 'Minutes_15', 'Minutes_20', 'Minutes_30');

-- CreateEnum
CREATE TYPE "public"."StaffRole" AS ENUM ('CARDIOLOGIST', 'NEUROLOGIST', 'HEAD_NURSE', 'LAB_TECHNICIAN', 'PHARMACIST', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "public"."StaffStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "public"."MaritalStatus" AS ENUM ('MARRIED', 'UNMARRIED');

-- CreateEnum
CREATE TYPE "public"."PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "public"."BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" "public"."Plan",
    "status" "public"."SubscriptionStatus",
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "invoiceNo" TEXT,
    "amountDue" INTEGER,
    "amountPaid" INTEGER,
    "currency" TEXT,
    "status" TEXT,
    "invoicePdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_queues" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType",
    "recipient" TEXT,
    "payload" JSONB,
    "status" "public"."NotificationStatus",
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consent_versions" (
    "id" TEXT NOT NULL,
    "type" "public"."ConsentType",
    "version" TEXT,
    "title" TEXT,
    "body" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "consentVersionId" TEXT,
    "type" "public"."ConsentType",
    "given" BOOLEAN,
    "givenAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."key_managements" (
    "id" TEXT NOT NULL,
    "version" TEXT,
    "dekCipher" BYTEA,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "key_managements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "table" TEXT,
    "rowId" TEXT,
    "action" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "adminId" TEXT,
    "doctorId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_requests" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "type" "public"."DataRequestType",
    "status" "public"."DataRequestStatus",
    "requestReason" TEXT,
    "requestedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "downloadUrl" TEXT,
    "downloadExpiresAt" TIMESTAMP(3),

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "insuranceId" TEXT,
    "doctorId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "dob" TIMESTAMP(3),
    "gender" "public"."Gender",
    "bloodGroup" "public"."BloodGroup",
    "scheduleId" TEXT,
    "appointmentDetails" TEXT,
    "address" TEXT,
    "status" "public"."AppointmentStatus" DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calls" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "doctorId" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "status" "public"."CallStatus",
    "recordingUrlCipher" TEXT,
    "transcript" TEXT,
    "aiSummary" TEXT,
    "sentiment" "public"."Sentiment",
    "escalated" BOOLEAN,
    "minutesUsed" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "aiModelId" TEXT,
    "aiDecision" TEXT,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diagnoses" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "doctorId" TEXT,
    "diagnosisCode" TEXT,
    "diagnosisName" TEXT,
    "description" TEXT,
    "status" TEXT,
    "diagnosedDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."labs" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "testDate" TIMESTAMP(3),
    "pdfKeyCipher" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "labs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lab_results" (
    "id" TEXT NOT NULL,
    "labId" TEXT,
    "testName" TEXT,
    "result" TEXT,
    "unit" TEXT,
    "normalMin" DOUBLE PRECISION,
    "normalMax" DOUBLE PRECISION,
    "flag" "public"."Flag",

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prescriptions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "doctorId" TEXT,
    "prescriptionNo" INTEGER,
    "status" "public"."PrescriptionStatus",
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prescription_medicines" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "medicine" TEXT,
    "strength" TEXT,
    "dose" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "duration" TEXT,
    "refill" INTEGER,

    CONSTRAINT "prescription_medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patients" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "photo" TEXT,
    "phone" TEXT,
    "alternativePhone" TEXT,
    "email" TEXT,
    "insuranceId" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "dob" TIMESTAMP(3),
    "maritalStatus" "public"."MaritalStatus",
    "city" TEXT,
    "gender" "public"."Gender",
    "bloodGroup" "public"."BloodGroup",
    "conditionName" TEXT,
    "diagnosedDate" TIMESTAMP(3),
    "severity" TEXT,
    "status" "public"."PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "retentionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelationship" TEXT,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctor_notification_settings" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "patientUpdates" BOOLEAN NOT NULL DEFAULT false,
    "callLogs" BOOLEAN NOT NULL DEFAULT true,
    "taskDeadlines" BOOLEAN NOT NULL DEFAULT false,
    "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctor_regional_settings" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "timezone" "public"."Timezone" NOT NULL DEFAULT 'Asia_Dhaka',
    "dateFormat" "public"."DateFormat" NOT NULL DEFAULT 'DD_MM_YYYY',
    "timeFormat" "public"."TimeFormat" NOT NULL DEFAULT 'HOUR_24',
    "language" "public"."Language" NOT NULL DEFAULT 'English',
    "defaultCalendarView" "public"."CalendarView" NOT NULL DEFAULT 'DayView',
    "defaultAppointmentDuration" "public"."AppointmentDuration" NOT NULL DEFAULT 'Minutes_20',
    "allowOnlineBooking" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovalForBooking" BOOLEAN NOT NULL DEFAULT false,
    "sendAppointmentReminders" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" "public"."ReminderTime" NOT NULL DEFAULT 'Minutes_30_Before',
    "bufferTimeBetween" "public"."BufferTime" NOT NULL DEFAULT 'Minutes_10',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_regional_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctor_security_settings" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "enforceTwoFA" BOOLEAN NOT NULL DEFAULT true,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "encryptSensitiveData" BOOLEAN NOT NULL DEFAULT true,
    "enableAuditLogs" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_security_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staffs" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT,
    "employmentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "public"."Gender" NOT NULL,
    "photo" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "presentAddress" TEXT NOT NULL,
    "permanentAddress" TEXT,
    "maritalStatus" "public"."MaritalStatus",
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "nationalIdNumber" TEXT,
    "department" "public"."Department",
    "position" TEXT,
    "description" TEXT,
    "joinDate" TIMESTAMP(3),
    "employmentType" "public"."EmploymentType",
    "workSchedule" TEXT,
    "weeklyHours" INTEGER,
    "employmentStatus" "public"."StaffStatus",
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "staffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" "public"."TaskStatus",
    "priority" "public"."Priority",
    "time" TEXT,
    "dueDate" TIMESTAMP(3),
    "patientId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_metrics" (
    "id" TEXT NOT NULL,
    "serviceName" "public"."ServiceName",
    "metricType" "public"."MetricType",
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "recordedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "photo" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctors" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "licenceNo" TEXT,
    "specialities" TEXT[],
    "experience" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "dob" TIMESTAMP(3),
    "photo" TEXT,
    "gender" "public"."Gender",
    "address" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "doctorId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "token" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT,
    "doctorId" TEXT,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "public"."subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "public"."subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeInvoiceId_key" ON "public"."invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "key_managements_version_key" ON "public"."key_managements"("version");

-- CreateIndex
CREATE UNIQUE INDEX "patients_insuranceId_key" ON "public"."patients"("insuranceId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_notification_settings_doctorId_key" ON "public"."doctor_notification_settings"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_regional_settings_doctorId_key" ON "public"."doctor_regional_settings"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_security_settings_doctorId_key" ON "public"."doctor_security_settings"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "staffs_employmentId_key" ON "public"."staffs"("employmentId");

-- CreateIndex
CREATE UNIQUE INDEX "staffs_email_key" ON "public"."staffs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staffs_phone_key" ON "public"."staffs"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_email_key" ON "public"."doctors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_phone_key" ON "public"."doctors"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_accessToken_key" ON "public"."sessions"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "public"."sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "public"."password_resets"("token");

-- AddForeignKey
ALTER TABLE "public"."patient_consents" ADD CONSTRAINT "patient_consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_consents" ADD CONSTRAINT "patient_consents_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "public"."consent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_requests" ADD CONSTRAINT "data_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."labs" ADD CONSTRAINT "labs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lab_results" ADD CONSTRAINT "lab_results_labId_fkey" FOREIGN KEY ("labId") REFERENCES "public"."labs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescription_medicines" ADD CONSTRAINT "prescription_medicines_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_notification_settings" ADD CONSTRAINT "doctor_notification_settings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_regional_settings" ADD CONSTRAINT "doctor_regional_settings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_security_settings" ADD CONSTRAINT "doctor_security_settings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staffs" ADD CONSTRAINT "staffs_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_resets" ADD CONSTRAINT "password_resets_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_resets" ADD CONSTRAINT "password_resets_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
