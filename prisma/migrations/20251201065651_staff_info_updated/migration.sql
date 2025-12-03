/*
  Warnings:

  - You are about to drop the column `employeeId` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `reportingToId` on the `staff_employment_info` table. All the data in the column will be lost.
  - You are about to drop the column `salaryCipher` on the `staff_employment_info` table. All the data in the column will be lost.
  - The `employmentStatus` column on the `staff_employment_info` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `addressCipher` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `phoneCipher` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `stateProvince` on the `staff_personal_info` table. All the data in the column will be lost.
  - You are about to drop the column `assigneeAdminId` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `assigneeDoctorId` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `clinicId` on the `tasks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employmentId]` on the table `staff_personal_info` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dob` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationality` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `presentAddress` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `staff_personal_info` table without a default value. This is not possible if the table is not empty.
  - Made the column `country` on table `staff_personal_info` required. This step will fail if there are existing NULL values in that column.
  - Made the column `postalCode` on table `staff_personal_info` required. This step will fail if there are existing NULL values in that column.

*/
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

-- AlterEnum
ALTER TYPE "public"."EmploymentType" ADD VALUE 'TRAINEE';

-- DropForeignKey
ALTER TABLE "public"."staff_employment_info" DROP CONSTRAINT "staff_employment_info_reportingToId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_assigneeAdminId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_assigneeDoctorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_clinicId_fkey";

-- DropIndex
DROP INDEX "public"."staff_employment_info_employeeId_key";

-- AlterTable
ALTER TABLE "public"."staff_employment_info" DROP COLUMN "employeeId",
DROP COLUMN "reportingToId",
DROP COLUMN "salaryCipher",
ADD COLUMN     "description" TEXT,
DROP COLUMN "employmentStatus",
ADD COLUMN     "employmentStatus" "public"."StaffStatus";

-- AlterTable
ALTER TABLE "public"."staff_personal_info" DROP COLUMN "addressCipher",
DROP COLUMN "dateOfBirth",
DROP COLUMN "phoneCipher",
DROP COLUMN "stateProvince",
ADD COLUMN     "dob" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "employmentId" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "gender" "public"."Gender" NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "maritalStatus" "public"."MaritalStatus",
ADD COLUMN     "nationalIdNumber" TEXT,
ADD COLUMN     "nationality" TEXT NOT NULL,
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "presentAddress" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "postalCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "assigneeAdminId",
DROP COLUMN "assigneeDoctorId",
DROP COLUMN "clinicId";

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

-- CreateIndex
CREATE UNIQUE INDEX "doctor_notification_settings_doctorId_key" ON "public"."doctor_notification_settings"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_regional_settings_doctorId_key" ON "public"."doctor_regional_settings"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_security_settings_doctorId_key" ON "public"."doctor_security_settings"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_personal_info_employmentId_key" ON "public"."staff_personal_info"("employmentId");

-- AddForeignKey
ALTER TABLE "public"."doctor_notification_settings" ADD CONSTRAINT "doctor_notification_settings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_regional_settings" ADD CONSTRAINT "doctor_regional_settings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_security_settings" ADD CONSTRAINT "doctor_security_settings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_personal_info" ADD CONSTRAINT "staff_personal_info_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "public"."staff_employment_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
