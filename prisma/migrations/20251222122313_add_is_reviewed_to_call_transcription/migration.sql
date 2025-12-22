/*
  Warnings:

  - The `priority` column on the `tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."call_transcriptions" ADD COLUMN     "isReviewed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "priority",
ADD COLUMN     "priority" "public"."Flag";
