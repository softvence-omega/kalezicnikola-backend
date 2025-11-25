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
CREATE TYPE "public"."EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN');

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

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "stripe_customer_id" VARCHAR,
    "stripe_subscription_id" VARCHAR,
    "plan" "public"."Plan",
    "status" "public"."SubscriptionStatus",
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "stripe_invoice_id" VARCHAR,
    "invoice_no" VARCHAR,
    "amount_due" INTEGER,
    "amount_paid" INTEGER,
    "currency" VARCHAR,
    "status" VARCHAR,
    "invoice_pdf_url" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_queues" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "type" "public"."NotificationType",
    "recipient" VARCHAR,
    "payload" JSON,
    "status" "public"."NotificationStatus",
    "sent_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clinics" (
    "id" UUID NOT NULL,
    "name" VARCHAR,
    "address" VARCHAR,
    "vat_id" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consent_versions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "type" "public"."ConsentType",
    "version" VARCHAR,
    "title" VARCHAR,
    "body" TEXT,
    "effective_date" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_consents" (
    "id" UUID NOT NULL,
    "patient_id" UUID,
    "consent_version_id" UUID,
    "type" "public"."ConsentType",
    "given" BOOLEAN,
    "given_at" TIMESTAMP(6),
    "withdrawn_at" TIMESTAMP(6),
    "ip" INET,
    "user_agent" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."key_managements" (
    "id" UUID NOT NULL,
    "version" VARCHAR,
    "dek_cipher" BYTEA,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMP(6),

    CONSTRAINT "key_managements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL,
    "table" VARCHAR,
    "row_id" UUID,
    "action" VARCHAR,
    "old_values" JSON,
    "new_values" JSON,
    "admin_id" UUID,
    "doctor_id" UUID,
    "clinic_id" UUID,
    "ip" INET,
    "user_agent" VARCHAR,
    "occurred_at" TIMESTAMPTZ(6),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_requests" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "patient_id" UUID,
    "type" "public"."DataRequestType",
    "status" "public"."DataRequestStatus",
    "request_reason" TEXT,
    "requested_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "download_url" VARCHAR,
    "download_expires_at" TIMESTAMP(6),

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointments" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "patient_id" UUID,
    "doctor_id" UUID,
    "start_at" TIMESTAMPTZ(6),
    "end_at" TIMESTAMPTZ(6),
    "status" "public"."AppointmentStatus",
    "note" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calls" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "patient_id" UUID,
    "doctor_id" UUID,
    "start_at" TIMESTAMPTZ(6),
    "end_at" TIMESTAMPTZ(6),
    "duration_seconds" INTEGER,
    "status" "public"."CallStatus",
    "recording_url_cipher" VARCHAR,
    "transcript" TEXT,
    "ai_summary" TEXT,
    "sentiment" "public"."Sentiment",
    "escalated" BOOLEAN,
    "minutes_used" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "ai_model_id" UUID,
    "ai_decision" VARCHAR,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diagnoses" (
    "id" UUID NOT NULL,
    "patient_id" UUID,
    "doctor_id" UUID,
    "diagnosis_code" VARCHAR,
    "diagnosis_name" VARCHAR,
    "description" TEXT,
    "status" VARCHAR,
    "diagnosed_date" DATE,
    "resolved_date" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."labs" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "patient_id" UUID,
    "test_date" DATE,
    "pdf_key_cipher" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "labs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lab_results" (
    "id" UUID NOT NULL,
    "lab_id" UUID,
    "test_name" VARCHAR,
    "result" VARCHAR,
    "unit" VARCHAR,
    "normal_min" DOUBLE PRECISION,
    "normal_max" DOUBLE PRECISION,
    "flag" "public"."Flag",

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prescriptions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "patient_id" UUID,
    "doctor_id" UUID,
    "prescription_no" INTEGER,
    "status" "public"."PrescriptionStatus",
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prescription_medicines" (
    "id" UUID NOT NULL,
    "prescription_id" UUID,
    "medicine" VARCHAR,
    "strength" VARCHAR,
    "dose" VARCHAR,
    "frequency" VARCHAR,
    "route" VARCHAR,
    "duration" VARCHAR,
    "refill" INTEGER,

    CONSTRAINT "prescription_medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patients" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "first_name_cipher" VARCHAR,
    "last_name_cipher" VARCHAR,
    "phone_cipher" VARCHAR,
    "email_cipher" VARCHAR,
    "insurance_id_cipher" VARCHAR,
    "address_cipher" VARCHAR,
    "emergency_contact_cipher" VARCHAR,
    "date_of_birth" TIMESTAMP(6),
    "gender" "public"."Gender",
    "blood_group" VARCHAR,
    "condition_name" VARCHAR,
    "diagnosed_date" DATE,
    "severity" VARCHAR,
    "status" VARCHAR,
    "retention_expires_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),
    "first_name_blind" VARCHAR,
    "last_name_blind" VARCHAR,
    "insurance_id_blind" VARCHAR,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emergency_contacts" (
    "id" UUID NOT NULL,
    "patient_id" UUID,
    "name_cipher" VARCHAR,
    "relationship" VARCHAR,
    "phone_cipher" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_personal_info" (
    "id" UUID NOT NULL,
    "doctor_id" UUID,
    "date_of_birth" DATE,
    "phone_cipher" VARCHAR,
    "address_cipher" VARCHAR,
    "state_province" VARCHAR,
    "postal_code" VARCHAR,
    "country" VARCHAR,
    "emergency_contact_name" VARCHAR,
    "emergency_contact_phone" VARCHAR,
    "emergency_contact_relationship" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "staff_personal_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_employment_info" (
    "id" UUID NOT NULL,
    "doctor_id" UUID,
    "employee_id" VARCHAR,
    "department" "public"."Department",
    "position" VARCHAR,
    "reporting_to" UUID,
    "join_date" DATE,
    "employment_type" "public"."EmploymentType",
    "work_schedule" VARCHAR,
    "weekly_hours" INTEGER,
    "salary_cipher" VARCHAR,
    "employment_status" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "staff_employment_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "title" VARCHAR,
    "description" TEXT,
    "status" "public"."TaskStatus",
    "priority" "public"."Priority",
    "due_date" DATE,
    "assignee_doctor_id" UUID,
    "assignee_admin_id" UUID,
    "patient_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_metrics" (
    "id" UUID NOT NULL,
    "service_name" "public"."ServiceName",
    "metric_type" "public"."MetricType",
    "value" DOUBLE PRECISION,
    "unit" VARCHAR,
    "recorded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "email" VARCHAR,
    "password_hash" VARCHAR,
    "first_name" VARCHAR,
    "last_name" VARCHAR,
    "otp" TEXT,
    "email_verified_at" TIMESTAMP(6),
    "two_factor_secret" VARCHAR,
    "two_factor_enabled" BOOLEAN,
    "last_login_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctors" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "email" VARCHAR,
    "password_hash" VARCHAR,
    "first_name" VARCHAR,
    "last_name" VARCHAR,
    "otp" TEXT,
    "licence_no" VARCHAR,
    "specialities" VARCHAR[],
    "email_verified_at" TIMESTAMP(6),
    "two_factor_secret" VARCHAR,
    "two_factor_enabled" BOOLEAN,
    "last_login_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" UUID NOT NULL,
    "admin_id" UUID,
    "doctor_id" UUID,
    "ip" INET,
    "user_agent" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_clinic_id_key" ON "public"."subscriptions"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "public"."subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "public"."subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripe_invoice_id_key" ON "public"."invoices"("stripe_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_vat_id_key" ON "public"."clinics"("vat_id");

-- CreateIndex
CREATE UNIQUE INDEX "key_managements_version_key" ON "public"."key_managements"("version");

-- CreateIndex
CREATE UNIQUE INDEX "staff_personal_info_doctor_id_key" ON "public"."staff_personal_info"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_employment_info_doctor_id_key" ON "public"."staff_employment_info"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_employment_info_employee_id_key" ON "public"."staff_employment_info"("employee_id");

-- CreateIndex
CREATE INDEX "staff_employment_info_employee_id_idx" ON "public"."staff_employment_info"("employee_id");

-- CreateIndex
CREATE INDEX "staff_employment_info_department_idx" ON "public"."staff_employment_info"("department");

-- CreateIndex
CREATE INDEX "staff_employment_info_employment_status_idx" ON "public"."staff_employment_info"("employment_status");

-- CreateIndex
CREATE INDEX "system_metrics_service_name_metric_type_recorded_at_idx" ON "public"."system_metrics"("service_name", "metric_type", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_email_key" ON "public"."doctors"("email");

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_queues" ADD CONSTRAINT "notification_queues_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consent_versions" ADD CONSTRAINT "consent_versions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_consents" ADD CONSTRAINT "patient_consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_consents" ADD CONSTRAINT "patient_consents_consent_version_id_fkey" FOREIGN KEY ("consent_version_id") REFERENCES "public"."consent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_requests" ADD CONSTRAINT "data_requests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_requests" ADD CONSTRAINT "data_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."labs" ADD CONSTRAINT "labs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."labs" ADD CONSTRAINT "labs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lab_results" ADD CONSTRAINT "lab_results_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescription_medicines" ADD CONSTRAINT "prescription_medicines_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emergency_contacts" ADD CONSTRAINT "emergency_contacts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_personal_info" ADD CONSTRAINT "staff_personal_info_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_employment_info" ADD CONSTRAINT "staff_employment_info_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_employment_info" ADD CONSTRAINT "staff_employment_info_reporting_to_fkey" FOREIGN KEY ("reporting_to") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assignee_doctor_id_fkey" FOREIGN KEY ("assignee_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assignee_admin_id_fkey" FOREIGN KEY ("assignee_admin_id") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctors" ADD CONSTRAINT "doctors_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
