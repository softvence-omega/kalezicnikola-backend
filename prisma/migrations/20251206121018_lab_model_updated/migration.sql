/*
  Warnings:

  - You are about to drop the column `pdfKeyCipher` on the `labs` table. All the data in the column will be lost.
  - You are about to drop the column `medicineFrequency` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `medicineInstructions` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `medicineName` on the `prescriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[prescriptionNo]` on the table `prescriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."labs" DROP COLUMN "pdfKeyCipher",
ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "doctorId" TEXT;

-- AlterTable
ALTER TABLE "public"."prescriptions" DROP COLUMN "medicineFrequency",
DROP COLUMN "medicineInstructions",
DROP COLUMN "medicineName",
ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "instructions" TEXT,
ALTER COLUMN "prescriptionNo" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "public"."prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineName" TEXT,
    "medicineInstructions" TEXT,
    "morningDosage" DOUBLE PRECISION,
    "afternoonDosage" DOUBLE PRECISION,
    "nightDosage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescriptionNo_key" ON "public"."prescriptions"("prescriptionNo");

-- AddForeignKey
ALTER TABLE "public"."labs" ADD CONSTRAINT "labs_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."labs" ADD CONSTRAINT "labs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
