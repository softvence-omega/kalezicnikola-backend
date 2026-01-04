/*
  Warnings:

  - The values [BASIC,PROFESSIONAL] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[planType,billingCycle]` on the table `subscription_plans` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billingCycle` to the `subscription_plans` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."PlanType_new" AS ENUM ('STANDARD', 'PREMIUM', 'ENTERPRISE');

-- Map old values to new values during conversion
ALTER TABLE "public"."subscription_plans" ALTER COLUMN "planType" TYPE "public"."PlanType_new" 
USING (
  CASE 
    WHEN "planType"::text = 'BASIC' THEN 'STANDARD'::"public"."PlanType_new"
    WHEN "planType"::text = 'PROFESSIONAL' THEN 'PREMIUM'::"public"."PlanType_new"
    ELSE "planType"::text::"public"."PlanType_new"
  END
);

ALTER TABLE "public"."subscriptions" ALTER COLUMN "planType" TYPE "public"."PlanType_new" 
USING (
  CASE 
    WHEN "planType"::text = 'BASIC' THEN 'STANDARD'::"public"."PlanType_new"
    WHEN "planType"::text = 'PROFESSIONAL' THEN 'PREMIUM'::"public"."PlanType_new"
    ELSE "planType"::text::"public"."PlanType_new"
  END
);

ALTER TYPE "public"."PlanType" RENAME TO "PlanType_old";
ALTER TYPE "public"."PlanType_new" RENAME TO "PlanType";
DROP TYPE "public"."PlanType_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."subscription_plans_planType_key";

-- AlterTable
ALTER TABLE "public"."subscription_plans" ADD COLUMN "billingCycle" "public"."BillingCycle" NOT NULL DEFAULT 'MONTHLY';

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_planType_billingCycle_key" ON "public"."subscription_plans"("planType", "billingCycle");
