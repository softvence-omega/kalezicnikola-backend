import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplatesUtil } from 'src/utils/email-templates.util';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, EmailTemplatesUtil],
  exports: [EmailService],
})
export class EmailModule {}