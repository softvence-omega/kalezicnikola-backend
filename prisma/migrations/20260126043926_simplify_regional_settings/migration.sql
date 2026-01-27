/*
  Warnings:

  - You are about to drop the column `allowOnlineBooking` on the `doctor_regional_settings` table. All the data in the column will be lost.
  - You are about to drop the column `dateFormat` on the `doctor_regional_settings` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `doctor_regional_settings` table. All the data in the column will be lost.
  - You are about to drop the column `requireApprovalForBooking` on the `doctor_regional_settings` table. All the data in the column will be lost.
  - You are about to drop the column `timeFormat` on the `doctor_regional_settings` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `doctor_regional_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."doctor_regional_settings" DROP COLUMN "allowOnlineBooking",
DROP COLUMN "dateFormat",
DROP COLUMN "language",
DROP COLUMN "requireApprovalForBooking",
DROP COLUMN "timeFormat",
DROP COLUMN "timezone";
