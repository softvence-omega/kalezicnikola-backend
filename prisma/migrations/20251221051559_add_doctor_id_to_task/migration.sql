-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "doctorId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
