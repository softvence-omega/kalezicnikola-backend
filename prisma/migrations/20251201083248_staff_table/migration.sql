/*
  Warnings:

  - You are about to drop the `staff_employment_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staff_personal_info` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."staff_employment_info" DROP CONSTRAINT "staff_employment_info_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."staff_personal_info" DROP CONSTRAINT "staff_personal_info_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."staff_personal_info" DROP CONSTRAINT "staff_personal_info_employmentId_fkey";

-- DropTable
DROP TABLE "public"."staff_employment_info";

-- DropTable
DROP TABLE "public"."staff_personal_info";

-- CreateTable
CREATE TABLE "public"."staffs" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT,
    "employmentId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "public"."Gender" NOT NULL,
    "photo" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "presentAddress" TEXT NOT NULL,
    "permanentAddress" TEXT,
    "maritalStatus" "public"."MaritalStatus",
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "nationalIdNumber" TEXT,
    "department" "public"."Department",
    "position" TEXT,
    "description" TEXT,
    "joinDate" TIMESTAMP(3),
    "employmentType" "public"."EmploymentType",
    "workSchedule" TEXT,
    "weeklyHours" INTEGER,
    "employmentStatus" "public"."StaffStatus",
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "staffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staffs_doctorId_key" ON "public"."staffs"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "staffs_employmentId_key" ON "public"."staffs"("employmentId");

-- AddForeignKey
ALTER TABLE "public"."staffs" ADD CONSTRAINT "staffs_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
