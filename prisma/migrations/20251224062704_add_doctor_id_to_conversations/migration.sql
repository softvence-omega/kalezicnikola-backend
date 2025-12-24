/*
  Warnings:

  - A unique constraint covering the columns `[doctorId]` on the table `admin_conversations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `doctorId` to the `admin_conversations` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add doctorId column as nullable first
ALTER TABLE "public"."admin_conversations" ADD COLUMN "doctorId" TEXT;

-- Step 2: Populate doctorId from the User table (get doctorId where userId matches)
UPDATE "public"."admin_conversations" ac
SET "doctorId" = u."doctorId"
FROM "public"."users" u
WHERE ac."userId" = u.id AND u."doctorId" IS NOT NULL;

-- Step 3: For any remaining NULL values (shouldn't happen if data is consistent), 
-- we need to handle them. Let's delete conversations that don't have a valid doctor.
DELETE FROM "public"."admin_conversations" WHERE "doctorId" IS NULL;

-- Step 4: Now make the column NOT NULL
ALTER TABLE "public"."admin_conversations" ALTER COLUMN "doctorId" SET NOT NULL;

-- Step 5: Remove duplicate conversations - keep only the most recent one per doctor
DELETE FROM "public"."admin_conversations" a
USING "public"."admin_conversations" b
WHERE a."doctorId" = b."doctorId" 
  AND a."createdAt" < b."createdAt";

-- CreateIndex
CREATE INDEX "admin_conversations_doctorId_idx" ON "public"."admin_conversations"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_conversations_doctorId_key" ON "public"."admin_conversations"("doctorId");

-- AddForeignKey
ALTER TABLE "public"."admin_conversations" ADD CONSTRAINT "admin_conversations_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
