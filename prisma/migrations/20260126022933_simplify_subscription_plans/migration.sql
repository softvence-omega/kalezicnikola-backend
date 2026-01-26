/*
  Warnings:

  - You are about to drop the column `plan` on the `subscriptions` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."BillingCycle" ADD VALUE 'ONETIME';

-- AlterEnum
ALTER TYPE "public"."PlanType" ADD VALUE 'BASIC';

-- AlterTable
ALTER TABLE "public"."subscriptions" DROP COLUMN "plan";

-- DropEnum
DROP TYPE "public"."Plan";
