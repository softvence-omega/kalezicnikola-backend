/*
  Warnings:

  - You are about to drop the column `addressCipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `emailCipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContactCipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `firstNameCipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceIdCipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `lastNameCipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `phoneCipher` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the `emergency_contacts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."emergency_contacts" DROP CONSTRAINT "emergency_contacts_patientId_fkey";

-- AlterTable
ALTER TABLE "public"."patients" DROP COLUMN "addressCipher",
DROP COLUMN "dateOfBirth",
DROP COLUMN "emailCipher",
DROP COLUMN "emergencyContactCipher",
DROP COLUMN "firstNameCipher",
DROP COLUMN "insuranceIdCipher",
DROP COLUMN "lastNameCipher",
DROP COLUMN "phoneCipher",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "alternativePhone" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "insuranceId" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "maritalStatus" "public"."MaritalStatus",
ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "public"."emergency_contacts";
