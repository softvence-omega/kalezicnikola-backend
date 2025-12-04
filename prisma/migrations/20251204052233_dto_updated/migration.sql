/*
  Warnings:

  - The `status` column on the `patients` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."patients" DROP COLUMN "status",
ADD COLUMN     "status" "public"."PatientStatus" NOT NULL DEFAULT 'ACTIVE';
