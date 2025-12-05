/*
  Warnings:

  - You are about to drop the column `scheduleId` on the `appointments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."appointments" DROP CONSTRAINT "appointments_scheduleId_fkey";

-- AlterTable
ALTER TABLE "public"."appointments" DROP COLUMN "scheduleId",
ADD COLUMN     "scheduleSlotId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "public"."doctor_schedule_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
