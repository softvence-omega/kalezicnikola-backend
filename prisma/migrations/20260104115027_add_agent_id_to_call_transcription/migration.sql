-- AlterTable
ALTER TABLE "public"."call_transcriptions" ADD COLUMN     "agentId" TEXT;

-- CreateIndex
CREATE INDEX "call_transcriptions_agentId_idx" ON "public"."call_transcriptions"("agentId");
