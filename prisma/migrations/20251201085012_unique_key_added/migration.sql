/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `staffs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `staffs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "staffs_email_key" ON "public"."staffs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staffs_phone_key" ON "public"."staffs"("phone");
