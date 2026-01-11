/*
  Warnings:

  - You are about to drop the column `type` on the `appointments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."appointments" DROP COLUMN "type",
ADD COLUMN     "appointmentTypeId" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "startTime" TEXT;

-- AlterTable
ALTER TABLE "public"."doctor_weekly_schedules" ADD COLUMN     "firstHalfEndTime" TEXT,
ADD COLUMN     "firstHalfStartTime" TEXT,
ADD COLUMN     "secondHalfEndTime" TEXT,
ADD COLUMN     "secondHalfStartTime" TEXT;

-- DropEnum
DROP TYPE "public"."AppointmentType";

-- CreateTable
CREATE TABLE "public"."appointment_types" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_types_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "public"."appointment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_types" ADD CONSTRAINT "appointment_types_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
