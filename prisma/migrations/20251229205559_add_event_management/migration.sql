-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('EVENT', 'TASK', 'APPOINTMENT_SCHEDULE');

-- CreateEnum
CREATE TYPE "public"."EventLocationType" AS ENUM ('ONLINE', 'OFFLINE');

-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "planType" "public"."PlanType";

-- CreateTable
CREATE TABLE "public"."events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" "public"."EventType" NOT NULL DEFAULT 'EVENT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "locationType" "public"."EventLocationType" NOT NULL DEFAULT 'OFFLINE',
    "location" TEXT,
    "meetingLink" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_guests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_attachments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_createdById_idx" ON "public"."events"("createdById");

-- CreateIndex
CREATE INDEX "events_startDate_idx" ON "public"."events"("startDate");

-- CreateIndex
CREATE INDEX "events_eventType_idx" ON "public"."events"("eventType");

-- CreateIndex
CREATE INDEX "event_guests_eventId_idx" ON "public"."event_guests"("eventId");

-- CreateIndex
CREATE INDEX "event_guests_email_idx" ON "public"."event_guests"("email");

-- CreateIndex
CREATE INDEX "event_attachments_eventId_idx" ON "public"."event_attachments"("eventId");

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_guests" ADD CONSTRAINT "event_guests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_attachments" ADD CONSTRAINT "event_attachments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
