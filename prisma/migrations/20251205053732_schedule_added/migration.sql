-- CreateEnum
CREATE TYPE "public"."WeekDay" AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateTable
CREATE TABLE "public"."doctor_weekly_schedules" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "day" "public"."WeekDay" NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "doctor_weekly_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctor_schedule_slots" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "doctor_schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_weekly_schedules_doctorId_day_key" ON "public"."doctor_weekly_schedules"("doctorId", "day");

-- AddForeignKey
ALTER TABLE "public"."doctor_weekly_schedules" ADD CONSTRAINT "doctor_weekly_schedules_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_schedule_slots" ADD CONSTRAINT "doctor_schedule_slots_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."doctor_weekly_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
