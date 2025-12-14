-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "public"."admin_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" "public"."UserRole" NOT NULL,
    "adminId" TEXT,
    "status" "public"."ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "doctorId" TEXT,
    "role" "public"."UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_conversations_userId_idx" ON "public"."admin_conversations"("userId");

-- CreateIndex
CREATE INDEX "admin_conversations_adminId_idx" ON "public"."admin_conversations"("adminId");

-- CreateIndex
CREATE INDEX "admin_conversations_status_idx" ON "public"."admin_conversations"("status");

-- CreateIndex
CREATE INDEX "support_messages_conversationId_idx" ON "public"."support_messages"("conversationId");

-- CreateIndex
CREATE INDEX "support_messages_senderId_idx" ON "public"."support_messages"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "users_adminId_key" ON "public"."users"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "users_doctorId_key" ON "public"."users"("doctorId");

-- AddForeignKey
ALTER TABLE "public"."admin_conversations" ADD CONSTRAINT "admin_conversations_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_messages" ADD CONSTRAINT "support_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."admin_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_messages" ADD CONSTRAINT "support_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
