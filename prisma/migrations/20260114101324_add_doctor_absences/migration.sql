-- AlterEnum
ALTER TYPE "public"."AppointmentStatus" ADD VALUE 'RESCHEDULED';

-- CreateTable
CREATE TABLE "public"."doctor_absences" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doctor_absences_doctorId_fromDate_toDate_idx" ON "public"."doctor_absences"("doctorId", "fromDate", "toDate");

-- AddForeignKey
ALTER TABLE "public"."doctor_absences" ADD CONSTRAINT "doctor_absences_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
