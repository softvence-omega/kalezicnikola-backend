-- CreateEnum
CREATE TYPE "public"."AppointmentType" AS ENUM ('CHECKUP', 'FOLLOWUP');

-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "type" "public"."AppointmentType" DEFAULT 'CHECKUP';
