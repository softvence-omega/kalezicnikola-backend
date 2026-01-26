/*
  Warnings:

  - You are about to drop the column `emailNotifications` on the `doctor_notification_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."doctor_notification_settings" DROP COLUMN "emailNotifications";
