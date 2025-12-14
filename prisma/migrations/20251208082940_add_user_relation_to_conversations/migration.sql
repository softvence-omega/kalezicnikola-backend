-- AddForeignKey
ALTER TABLE "public"."admin_conversations" ADD CONSTRAINT "admin_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
