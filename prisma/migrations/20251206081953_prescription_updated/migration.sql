/*
  Warnings:

  - You are about to drop the `prescription_medicines` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."PrescriptionTime" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- DropForeignKey
ALTER TABLE "public"."prescription_medicines" DROP CONSTRAINT "prescription_medicines_prescriptionId_fkey";

-- AlterTable
ALTER TABLE "public"."prescriptions" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "medicineFrequency" TEXT,
ADD COLUMN     "medicineInstructions" TEXT,
ADD COLUMN     "medicineName" TEXT;

-- DropTable
DROP TABLE "public"."prescription_medicines";

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
