-- DropForeignKey
ALTER TABLE "public"."doctor_schedule_slots" DROP CONSTRAINT "doctor_schedule_slots_scheduleId_fkey";

-- AddForeignKey
ALTER TABLE "public"."doctor_schedule_slots" ADD CONSTRAINT "doctor_schedule_slots_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."doctor_weekly_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
