-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "extraMinutes" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."subscription_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planType" "public"."PlanType" NOT NULL,
    "billingCycle" "public"."BillingCycle" NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL,
    "minutesAllocated" INTEGER NOT NULL,
    "minutesUsed" INTEGER NOT NULL,
    "extraMinutes" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_histories_userId_idx" ON "public"."subscription_histories"("userId");

-- AddForeignKey
ALTER TABLE "public"."subscription_histories" ADD CONSTRAINT "subscription_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
