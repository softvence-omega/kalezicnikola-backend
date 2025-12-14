/*
  Warnings:

  - The primary key for the `appointments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `appointmentId` column on the `call_transcriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `appointmentId` column on the `labs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `appointmentId` column on the `prescriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "public"."call_transcriptions" DROP CONSTRAINT "call_transcriptions_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."labs" DROP CONSTRAINT "labs_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."prescriptions" DROP CONSTRAINT "prescriptions_appointmentId_fkey";

-- AlterTable
ALTER TABLE "public"."appointments" DROP CONSTRAINT "appointments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."call_transcriptions" DROP COLUMN "appointmentId",
ADD COLUMN     "appointmentId" INTEGER;

-- AlterTable
ALTER TABLE "public"."labs" DROP COLUMN "appointmentId",
ADD COLUMN     "appointmentId" INTEGER;

-- AlterTable
ALTER TABLE "public"."prescriptions" DROP COLUMN "appointmentId",
ADD COLUMN     "appointmentId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."labs" ADD CONSTRAINT "labs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_transcriptions" ADD CONSTRAINT "call_transcriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
