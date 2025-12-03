/*
  Warnings:

  - Made the column `employmentId` on table `staffs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."staffs" ALTER COLUMN "employmentId" SET NOT NULL;
