-- CreateEnum
CREATE TYPE "public"."PlanType" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- AlterEnum
ALTER TYPE "public"."SubscriptionStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "minutesAllocated" INTEGER,
ADD COLUMN     "minutesUsed" INTEGER DEFAULT 0,
ADD COLUMN     "planType" "public"."PlanType",
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "public"."subscription_plans" (
    "id" TEXT NOT NULL,
    "planType" "public"."PlanType" NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_planType_key" ON "public"."subscription_plans"("planType");
