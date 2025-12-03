/*
  Warnings:

  - The primary key for the `admins` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `email_verified_at` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `last_login_at` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `otp` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_enabled` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_secret` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `admins` table. All the data in the column will be lost.
  - The primary key for the `appointments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `end_at` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `start_at` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `appointments` table. All the data in the column will be lost.
  - The primary key for the `audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `admin_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `clinic_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `new_values` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `occurred_at` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `old_values` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `row_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `user_agent` on the `audit_logs` table. All the data in the column will be lost.
  - The primary key for the `calls` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `ai_decision` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `ai_model_id` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `ai_summary` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `clinic_id` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `duration_seconds` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `end_at` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `minutes_used` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `recording_url_cipher` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `start_at` on the `calls` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `calls` table. All the data in the column will be lost.
  - The primary key for the `clinics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `vat_id` on the `clinics` table. All the data in the column will be lost.
  - The primary key for the `consent_versions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `consent_versions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `consent_versions` table. All the data in the column will be lost.
  - You are about to drop the column `effective_date` on the `consent_versions` table. All the data in the column will be lost.
  - The primary key for the `data_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `data_requests` table. All the data in the column will be lost.
  - You are about to drop the column `completed_at` on the `data_requests` table. All the data in the column will be lost.
  - You are about to drop the column `download_expires_at` on the `data_requests` table. All the data in the column will be lost.
  - You are about to drop the column `download_url` on the `data_requests` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `data_requests` table. All the data in the column will be lost.
  - You are about to drop the column `request_reason` on the `data_requests` table. All the data in the column will be lost.
  - You are about to drop the column `requested_at` on the `data_requests` table. All the data in the column will be lost.
  - The primary key for the `diagnoses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosed_date` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosis_code` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosis_name` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `resolved_date` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `diagnoses` table. All the data in the column will be lost.
  - The primary key for the `doctors` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `email_verified_at` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `last_login_at` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `licence_no` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `otp` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_enabled` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_secret` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `doctors` table. All the data in the column will be lost.
  - The primary key for the `emergency_contacts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `emergency_contacts` table. All the data in the column will be lost.
  - You are about to drop the column `name_cipher` on the `emergency_contacts` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `emergency_contacts` table. All the data in the column will be lost.
  - You are about to drop the column `phone_cipher` on the `emergency_contacts` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `emergency_contacts` table. All the data in the column will be lost.
  - The primary key for the `invoices` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `amount_due` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `amount_paid` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clinic_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_no` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_pdf_url` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_invoice_id` on the `invoices` table. All the data in the column will be lost.
  - The primary key for the `key_managements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `key_managements` table. All the data in the column will be lost.
  - You are about to drop the column `dek_cipher` on the `key_managements` table. All the data in the column will be lost.
  - You are about to drop the column `rotated_at` on the `key_managements` table. All the data in the column will be lost.
  - The primary key for the `lab_results` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `lab_id` on the `lab_results` table. All the data in the column will be lost.
  - You are about to drop the column `normal_max` on the `lab_results` table. All the data in the column will be lost.
  - You are about to drop the column `normal_min` on the `lab_results` table. All the data in the column will be lost.
  - You are about to drop the column `test_name` on the `lab_results` table. All the data in the column will be lost.
  - The primary key for the `labs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `labs` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `labs` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `labs` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `labs` table. All the data in the column will be lost.
  - You are about to drop the column `pdf_key_cipher` on the `labs` table. All the data in the column will be lost.
  - You are about to drop the column `test_date` on the `labs` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `labs` table. All the data in the column will be lost.
  - The primary key for the `notification_queues` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `notification_queues` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `notification_queues` table. All the data in the column will be lost.
  - You are about to drop the column `sent_at` on the `notification_queues` table. All the data in the column will be lost.
  - The primary key for the `patient_consents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `consent_version_id` on the `patient_consents` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `patient_consents` table. All the data in the column will be lost.
  - You are about to drop the column `given_at` on the `patient_consents` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `patient_consents` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `patient_consents` table. All the data in the column will be lost.
  - You are about to drop the column `user_agent` on the `patient_consents` table. All the data in the column will be lost.
  - You are about to drop the column `withdrawn_at` on the `patient_consents` table. All the data in the column will be lost.
  - The primary key for the `patients` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `address_cipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `blood_group` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `clinic_id` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `condition_name` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `date_of_birth` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosed_date` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `email_cipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_cipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `first_name_blind` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `first_name_cipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `insurance_id_blind` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `insurance_id_cipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `last_name_blind` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `last_name_cipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `phone_cipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `retention_expires_at` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `patients` table. All the data in the column will be lost.
  - The primary key for the `prescription_medicines` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `prescription_id` on the `prescription_medicines` table. All the data in the column will be lost.
  - The primary key for the `prescriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `prescription_no` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `prescriptions` table. All the data in the column will be lost.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `admin_id` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `ip` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `user_agent` on the `sessions` table. All the data in the column will be lost.
  - The primary key for the `staff_employment_info` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `employment_status` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `employment_type` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `join_date` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `reporting_to` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `salary_cipher` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `weekly_hours` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `work_schedule` on the `staff_employment_info` table. All the data in the column will be lost.
  - The primary key for the `staff_personal_info` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `address_cipher` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `date_of_birth` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_name` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_phone` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_relationship` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `phone_cipher` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `postal_code` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `state_province` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `staff_personal_info` table. All the data in the column will be lost.
  - The primary key for the `subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinic_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `current_period_end` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `current_period_start` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_customer_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `subscriptions` table. All the data in the column will be lost.
  - The primary key for the `system_metrics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `system_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `metric_type` on the `system_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `recorded_at` on the `system_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `service_name` on the `system_metrics` table. All the data in the column will be lost.
  - The primary key for the `tasks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assignee_admin_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `assignee_doctor_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `clinic_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `due_date` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `tasks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vatId]` on the table `clinics` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `doctors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeInvoiceId]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accessToken]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refreshToken]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doctorId]` on the table `staff_employment_info` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeId]` on the table `staff_employment_info` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doctorId]` on the table `staff_personal_info` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clinicId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `admins` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `accessToken` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshTokenExpiresAt` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'DOCTOR');

-- DropForeignKey
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."appointments" DROP CONSTRAINT "appointments_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."appointments" DROP CONSTRAINT "appointments_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."appointments" DROP CONSTRAINT "appointments_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."calls" DROP CONSTRAINT "calls_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."calls" DROP CONSTRAINT "calls_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."calls" DROP CONSTRAINT "calls_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."consent_versions" DROP CONSTRAINT "consent_versions_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."data_requests" DROP CONSTRAINT "data_requests_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."data_requests" DROP CONSTRAINT "data_requests_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."diagnoses" DROP CONSTRAINT "diagnoses_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."diagnoses" DROP CONSTRAINT "diagnoses_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."doctors" DROP CONSTRAINT "doctors_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."emergency_contacts" DROP CONSTRAINT "emergency_contacts_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."invoices" DROP CONSTRAINT "invoices_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."lab_results" DROP CONSTRAINT "lab_results_lab_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."labs" DROP CONSTRAINT "labs_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."labs" DROP CONSTRAINT "labs_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."notification_queues" DROP CONSTRAINT "notification_queues_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."patient_consents" DROP CONSTRAINT "patient_consents_consent_version_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."patient_consents" DROP CONSTRAINT "patient_consents_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."patients" DROP CONSTRAINT "patients_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."prescription_medicines" DROP CONSTRAINT "prescription_medicines_prescription_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."prescriptions" DROP CONSTRAINT "prescriptions_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."prescriptions" DROP CONSTRAINT "prescriptions_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."prescriptions" DROP CONSTRAINT "prescriptions_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."staff_employment_info" DROP CONSTRAINT "staff_employment_info_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."staff_employment_info" DROP CONSTRAINT "staff_employment_info_reporting_to_fkey";

-- DropForeignKey
ALTER TABLE "public"."staff_personal_info" DROP CONSTRAINT "staff_personal_info_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_assignee_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_assignee_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_patient_id_fkey";

-- DropIndex
DROP INDEX "public"."clinics_vat_id_key";

-- DropIndex
DROP INDEX "public"."invoices_stripe_invoice_id_key";

-- DropIndex
DROP INDEX "public"."staff_employment_info_department_idx";

-- DropIndex
DROP INDEX "public"."staff_employment_info_doctor_id_key";

-- DropIndex
DROP INDEX "public"."staff_employment_info_employee_id_idx";

-- DropIndex
DROP INDEX "public"."staff_employment_info_employee_id_key";

-- DropIndex
DROP INDEX "public"."staff_employment_info_employment_status_idx";

-- DropIndex
DROP INDEX "public"."staff_personal_info_doctor_id_key";

-- DropIndex
DROP INDEX "public"."subscriptions_clinic_id_key";

-- DropIndex
DROP INDEX "public"."subscriptions_stripe_customer_id_key";

-- DropIndex
DROP INDEX "public"."subscriptions_stripe_subscription_id_key";

-- DropIndex
DROP INDEX "public"."system_metrics_service_name_metric_type_recorded_at_idx";

-- AlterTable
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "email_verified_at",
DROP COLUMN "first_name",
DROP COLUMN "last_login_at",
DROP COLUMN "last_name",
DROP COLUMN "otp",
DROP COLUMN "password_hash",
DROP COLUMN "two_factor_enabled",
DROP COLUMN "two_factor_secret",
DROP COLUMN "updated_at",
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN,
ADD COLUMN     "twoFactorSecret" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."appointments" DROP CONSTRAINT "appointments_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "doctor_id",
DROP COLUMN "end_at",
DROP COLUMN "patient_id",
DROP COLUMN "start_at",
DROP COLUMN "updated_at",
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_pkey",
DROP COLUMN "admin_id",
DROP COLUMN "clinic_id",
DROP COLUMN "doctor_id",
DROP COLUMN "new_values",
DROP COLUMN "occurred_at",
DROP COLUMN "old_values",
DROP COLUMN "row_id",
DROP COLUMN "user_agent",
ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "newValues" JSONB,
ADD COLUMN     "occurredAt" TIMESTAMP(3),
ADD COLUMN     "oldValues" JSONB,
ADD COLUMN     "rowId" TEXT,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "table" SET DATA TYPE TEXT,
ALTER COLUMN "action" SET DATA TYPE TEXT,
ALTER COLUMN "ip" SET DATA TYPE TEXT,
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."calls" DROP CONSTRAINT "calls_pkey",
DROP COLUMN "ai_decision",
DROP COLUMN "ai_model_id",
DROP COLUMN "ai_summary",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "doctor_id",
DROP COLUMN "duration_seconds",
DROP COLUMN "end_at",
DROP COLUMN "minutes_used",
DROP COLUMN "patient_id",
DROP COLUMN "recording_url_cipher",
DROP COLUMN "start_at",
DROP COLUMN "updated_at",
ADD COLUMN     "aiDecision" TEXT,
ADD COLUMN     "aiModelId" TEXT,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "minutesUsed" INTEGER,
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "recordingUrlCipher" TEXT,
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "calls_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."clinics" DROP CONSTRAINT "clinics_pkey",
DROP COLUMN "created_at",
DROP COLUMN "updated_at",
DROP COLUMN "vat_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "vatId" TEXT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "address" SET DATA TYPE TEXT,
ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."consent_versions" DROP CONSTRAINT "consent_versions_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "effective_date",
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "version" SET DATA TYPE TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ADD CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."data_requests" DROP CONSTRAINT "data_requests_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "completed_at",
DROP COLUMN "download_expires_at",
DROP COLUMN "download_url",
DROP COLUMN "patient_id",
DROP COLUMN "request_reason",
DROP COLUMN "requested_at",
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "downloadExpiresAt" TIMESTAMP(3),
ADD COLUMN     "downloadUrl" TEXT,
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "requestReason" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."diagnoses" DROP CONSTRAINT "diagnoses_pkey",
DROP COLUMN "created_at",
DROP COLUMN "diagnosed_date",
DROP COLUMN "diagnosis_code",
DROP COLUMN "diagnosis_name",
DROP COLUMN "doctor_id",
DROP COLUMN "patient_id",
DROP COLUMN "resolved_date",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "diagnosedDate" TIMESTAMP(3),
ADD COLUMN     "diagnosisCode" TEXT,
ADD COLUMN     "diagnosisName" TEXT,
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "resolvedDate" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ADD CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."doctors" DROP CONSTRAINT "doctors_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "email_verified_at",
DROP COLUMN "first_name",
DROP COLUMN "last_login_at",
DROP COLUMN "last_name",
DROP COLUMN "licence_no",
DROP COLUMN "otp",
DROP COLUMN "password_hash",
DROP COLUMN "two_factor_enabled",
DROP COLUMN "two_factor_secret",
DROP COLUMN "updated_at",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "gender" "public"."Gender",
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "licenceNo" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN,
ADD COLUMN     "twoFactorSecret" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "specialities" SET DATA TYPE TEXT[],
ADD CONSTRAINT "doctors_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."emergency_contacts" DROP CONSTRAINT "emergency_contacts_pkey",
DROP COLUMN "created_at",
DROP COLUMN "name_cipher",
DROP COLUMN "patient_id",
DROP COLUMN "phone_cipher",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nameCipher" TEXT,
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "phoneCipher" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "relationship" SET DATA TYPE TEXT,
ADD CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."invoices" DROP CONSTRAINT "invoices_pkey",
DROP COLUMN "amount_due",
DROP COLUMN "amount_paid",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "invoice_no",
DROP COLUMN "invoice_pdf_url",
DROP COLUMN "stripe_invoice_id",
ADD COLUMN     "amountDue" INTEGER,
ADD COLUMN     "amountPaid" INTEGER,
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invoiceNo" TEXT,
ADD COLUMN     "invoicePdfUrl" TEXT,
ADD COLUMN     "stripeInvoiceId" TEXT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "currency" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."key_managements" DROP CONSTRAINT "key_managements_pkey",
DROP COLUMN "created_at",
DROP COLUMN "dek_cipher",
DROP COLUMN "rotated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dekCipher" BYTEA,
ADD COLUMN     "rotatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "version" SET DATA TYPE TEXT,
ADD CONSTRAINT "key_managements_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."lab_results" DROP CONSTRAINT "lab_results_pkey",
DROP COLUMN "lab_id",
DROP COLUMN "normal_max",
DROP COLUMN "normal_min",
DROP COLUMN "test_name",
ADD COLUMN     "labId" TEXT,
ADD COLUMN     "normalMax" DOUBLE PRECISION,
ADD COLUMN     "normalMin" DOUBLE PRECISION,
ADD COLUMN     "testName" TEXT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "result" SET DATA TYPE TEXT,
ALTER COLUMN "unit" SET DATA TYPE TEXT,
ADD CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."labs" DROP CONSTRAINT "labs_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "patient_id",
DROP COLUMN "pdf_key_cipher",
DROP COLUMN "test_date",
DROP COLUMN "updated_at",
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "pdfKeyCipher" TEXT,
ADD COLUMN     "testDate" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "labs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."notification_queues" DROP CONSTRAINT "notification_queues_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "sent_at",
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "recipient" SET DATA TYPE TEXT,
ALTER COLUMN "payload" SET DATA TYPE JSONB,
ADD CONSTRAINT "notification_queues_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."patient_consents" DROP CONSTRAINT "patient_consents_pkey",
DROP COLUMN "consent_version_id",
DROP COLUMN "created_at",
DROP COLUMN "given_at",
DROP COLUMN "patient_id",
DROP COLUMN "updated_at",
DROP COLUMN "user_agent",
DROP COLUMN "withdrawn_at",
ADD COLUMN     "consentVersionId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "givenAt" TIMESTAMP(3),
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "ip" SET DATA TYPE TEXT,
ADD CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."patients" DROP CONSTRAINT "patients_pkey",
DROP COLUMN "address_cipher",
DROP COLUMN "blood_group",
DROP COLUMN "clinic_id",
DROP COLUMN "condition_name",
DROP COLUMN "created_at",
DROP COLUMN "date_of_birth",
DROP COLUMN "deleted_at",
DROP COLUMN "diagnosed_date",
DROP COLUMN "email_cipher",
DROP COLUMN "emergency_contact_cipher",
DROP COLUMN "first_name_blind",
DROP COLUMN "first_name_cipher",
DROP COLUMN "insurance_id_blind",
DROP COLUMN "insurance_id_cipher",
DROP COLUMN "last_name_blind",
DROP COLUMN "last_name_cipher",
DROP COLUMN "phone_cipher",
DROP COLUMN "retention_expires_at",
DROP COLUMN "updated_at",
ADD COLUMN     "addressCipher" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "conditionName" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "diagnosedDate" TIMESTAMP(3),
ADD COLUMN     "emailCipher" TEXT,
ADD COLUMN     "emergencyContactCipher" TEXT,
ADD COLUMN     "firstNameBlind" TEXT,
ADD COLUMN     "firstNameCipher" TEXT,
ADD COLUMN     "insuranceIdBlind" TEXT,
ADD COLUMN     "insuranceIdCipher" TEXT,
ADD COLUMN     "lastNameBlind" TEXT,
ADD COLUMN     "lastNameCipher" TEXT,
ADD COLUMN     "phoneCipher" TEXT,
ADD COLUMN     "retentionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "severity" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."prescription_medicines" DROP CONSTRAINT "prescription_medicines_pkey",
DROP COLUMN "prescription_id",
ADD COLUMN     "prescriptionId" TEXT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "medicine" SET DATA TYPE TEXT,
ALTER COLUMN "strength" SET DATA TYPE TEXT,
ALTER COLUMN "dose" SET DATA TYPE TEXT,
ALTER COLUMN "frequency" SET DATA TYPE TEXT,
ALTER COLUMN "route" SET DATA TYPE TEXT,
ALTER COLUMN "duration" SET DATA TYPE TEXT,
ADD CONSTRAINT "prescription_medicines_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."prescriptions" DROP CONSTRAINT "prescriptions_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "doctor_id",
DROP COLUMN "patient_id",
DROP COLUMN "prescription_no",
DROP COLUMN "updated_at",
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "prescriptionNo" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_pkey",
DROP COLUMN "admin_id",
DROP COLUMN "created_at",
DROP COLUMN "doctor_id",
DROP COLUMN "ip",
DROP COLUMN "user_agent",
ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isRevoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "refreshToken" TEXT NOT NULL,
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."staff_employment_info" DROP CONSTRAINT "staff_employment_info_pkey",
DROP COLUMN "created_at",
DROP COLUMN "doctor_id",
DROP COLUMN "employee_id",
DROP COLUMN "employment_status",
DROP COLUMN "employment_type",
DROP COLUMN "join_date",
DROP COLUMN "reporting_to",
DROP COLUMN "salary_cipher",
DROP COLUMN "updated_at",
DROP COLUMN "weekly_hours",
DROP COLUMN "work_schedule",
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "employmentStatus" TEXT,
ADD COLUMN     "employmentType" "public"."EmploymentType",
ADD COLUMN     "joinDate" TIMESTAMP(3),
ADD COLUMN     "reportingToId" TEXT,
ADD COLUMN     "salaryCipher" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "weeklyHours" INTEGER,
ADD COLUMN     "workSchedule" TEXT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "position" SET DATA TYPE TEXT,
ADD CONSTRAINT "staff_employment_info_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."staff_personal_info" DROP CONSTRAINT "staff_personal_info_pkey",
DROP COLUMN "address_cipher",
DROP COLUMN "created_at",
DROP COLUMN "date_of_birth",
DROP COLUMN "doctor_id",
DROP COLUMN "emergency_contact_name",
DROP COLUMN "emergency_contact_phone",
DROP COLUMN "emergency_contact_relationship",
DROP COLUMN "phone_cipher",
DROP COLUMN "postal_code",
DROP COLUMN "state_province",
DROP COLUMN "updated_at",
ADD COLUMN     "addressCipher" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "phoneCipher" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "stateProvince" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "country" SET DATA TYPE TEXT,
ADD CONSTRAINT "staff_personal_info_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_pkey",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "current_period_end",
DROP COLUMN "current_period_start",
DROP COLUMN "stripe_customer_id",
DROP COLUMN "stripe_subscription_id",
DROP COLUMN "updated_at",
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."system_metrics" DROP CONSTRAINT "system_metrics_pkey",
DROP COLUMN "created_at",
DROP COLUMN "metric_type",
DROP COLUMN "recorded_at",
DROP COLUMN "service_name",
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metricType" "public"."MetricType",
ADD COLUMN     "recordedAt" TIMESTAMP(3),
ADD COLUMN     "serviceName" "public"."ServiceName",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "unit" SET DATA TYPE TEXT,
ADD CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_pkey",
DROP COLUMN "assignee_admin_id",
DROP COLUMN "assignee_doctor_id",
DROP COLUMN "clinic_id",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "due_date",
DROP COLUMN "patient_id",
DROP COLUMN "updated_at",
ADD COLUMN     "assigneeAdminId" TEXT,
ADD COLUMN     "assigneeDoctorId" TEXT,
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");

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
CREATE UNIQUE INDEX "password_resets_token_key" ON "public"."password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_vatId_key" ON "public"."clinics"("vatId");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_phone_key" ON "public"."doctors"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeInvoiceId_key" ON "public"."invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_accessToken_key" ON "public"."sessions"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "public"."sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "staff_employment_info_doctorId_key" ON "public"."staff_employment_info"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_employment_info_employeeId_key" ON "public"."staff_employment_info"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_personal_info_doctorId_key" ON "public"."staff_personal_info"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_clinicId_key" ON "public"."subscriptions"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "public"."subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "public"."subscriptions"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_queues" ADD CONSTRAINT "notification_queues_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consent_versions" ADD CONSTRAINT "consent_versions_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_consents" ADD CONSTRAINT "patient_consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_consents" ADD CONSTRAINT "patient_consents_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "public"."consent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_requests" ADD CONSTRAINT "data_requests_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."data_requests" ADD CONSTRAINT "data_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."labs" ADD CONSTRAINT "labs_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."labs" ADD CONSTRAINT "labs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lab_results" ADD CONSTRAINT "lab_results_labId_fkey" FOREIGN KEY ("labId") REFERENCES "public"."labs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescription_medicines" ADD CONSTRAINT "prescription_medicines_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patients" ADD CONSTRAINT "patients_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emergency_contacts" ADD CONSTRAINT "emergency_contacts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_personal_info" ADD CONSTRAINT "staff_personal_info_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_employment_info" ADD CONSTRAINT "staff_employment_info_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_employment_info" ADD CONSTRAINT "staff_employment_info_reportingToId_fkey" FOREIGN KEY ("reportingToId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assigneeDoctorId_fkey" FOREIGN KEY ("assigneeDoctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assigneeAdminId_fkey" FOREIGN KEY ("assigneeAdminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctors" ADD CONSTRAINT "doctors_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_resets" ADD CONSTRAINT "password_resets_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_resets" ADD CONSTRAINT "password_resets_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
