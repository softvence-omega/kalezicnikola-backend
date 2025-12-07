-- CreateEnum
CREATE TYPE "public"."CallIntent" AS ENUM ('BOOK_APPOINTMENT', 'CHECK_AVAILABILITY', 'RESCHEDULE', 'CANCEL', 'INQUIRY', 'GENERAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "public"."KnowledgeBaseCategory" AS ENUM ('FAQ', 'POLICY', 'TREATMENT', 'PRICING', 'OFFICE_HOURS', 'INSURANCE', 'GENERAL');

-- CreateTable
CREATE TABLE "public"."call_transcriptions" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT,
    "callSid" TEXT,
    "phoneNumber" TEXT,
    "duration" INTEGER,
    "audioUrl" TEXT,
    "transcription" TEXT,
    "intent" "public"."CallIntent",
    "sentiment" "public"."Sentiment",
    "summary" TEXT,
    "appointmentId" TEXT,
    "fallbackNumber" TEXT,
    "wasTransferred" BOOLEAN DEFAULT false,
    "callStartedAt" TIMESTAMP(3),
    "callEndedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctor_knowledge_base" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "category" "public"."KnowledgeBaseCategory" DEFAULT 'GENERAL',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_transcriptions_callSid_key" ON "public"."call_transcriptions"("callSid");

-- CreateIndex
CREATE UNIQUE INDEX "call_transcriptions_appointmentId_key" ON "public"."call_transcriptions"("appointmentId");

-- CreateIndex
CREATE INDEX "call_transcriptions_doctorId_createdAt_idx" ON "public"."call_transcriptions"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "call_transcriptions_patientId_createdAt_idx" ON "public"."call_transcriptions"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "doctor_knowledge_base_doctorId_category_idx" ON "public"."doctor_knowledge_base"("doctorId", "category");

-- CreateIndex
CREATE INDEX "doctor_knowledge_base_doctorId_isActive_idx" ON "public"."doctor_knowledge_base"("doctorId", "isActive");

-- AddForeignKey
ALTER TABLE "public"."call_transcriptions" ADD CONSTRAINT "call_transcriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_transcriptions" ADD CONSTRAINT "call_transcriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_transcriptions" ADD CONSTRAINT "call_transcriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_knowledge_base" ADD CONSTRAINT "doctor_knowledge_base_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
