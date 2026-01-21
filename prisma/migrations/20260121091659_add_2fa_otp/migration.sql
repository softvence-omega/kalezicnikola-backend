-- AlterTable
ALTER TABLE "public"."admins" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastPasswordChangeAt" TIMESTAMP(3),
ALTER COLUMN "twoFactorEnabled" SET DEFAULT true;

-- AlterTable
ALTER TABLE "public"."doctors" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastPasswordChangeAt" TIMESTAMP(3),
ALTER COLUMN "twoFactorEnabled" SET DEFAULT true;

-- CreateTable
CREATE TABLE "public"."two_factor_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT,
    "doctorId" TEXT,

    CONSTRAINT "two_factor_otps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."two_factor_otps" ADD CONSTRAINT "two_factor_otps_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."two_factor_otps" ADD CONSTRAINT "two_factor_otps_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
