-- CreateEnum
CREATE TYPE "public"."DoctorNotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'PATIENT_UPDATE', 'CALL_LOG', 'TASK_DEADLINE');

-- CreateTable
CREATE TABLE "public"."doctor_notifications" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "type" "public"."DoctorNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doctor_notifications_doctorId_idx" ON "public"."doctor_notifications"("doctorId");

-- CreateIndex
CREATE INDEX "doctor_notifications_isRead_idx" ON "public"."doctor_notifications"("isRead");

-- CreateIndex
CREATE INDEX "doctor_notifications_createdAt_idx" ON "public"."doctor_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "doctor_notifications_doctorId_isRead_idx" ON "public"."doctor_notifications"("doctorId", "isRead");

-- AddForeignKey
ALTER TABLE "public"."doctor_notifications" ADD CONSTRAINT "doctor_notifications_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
