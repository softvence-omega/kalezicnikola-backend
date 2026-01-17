/*
  Warnings:

  - You are about to alter the column `minutesUsed` on the `subscription_histories` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `extraMinutes` on the `subscription_histories` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `minutesUsed` on the `subscriptions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `extraMinutes` on the `subscriptions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "public"."subscription_histories" ALTER COLUMN "minutesUsed" SET DATA TYPE INTEGER,
ALTER COLUMN "extraMinutes" SET DEFAULT 0,
ALTER COLUMN "extraMinutes" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "public"."subscriptions" ALTER COLUMN "minutesUsed" SET DEFAULT 0,
ALTER COLUMN "minutesUsed" SET DATA TYPE INTEGER,
ALTER COLUMN "extraMinutes" SET DEFAULT 0,
ALTER COLUMN "extraMinutes" SET DATA TYPE INTEGER;
