import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { ElevenLabsService } from './eleven-labs.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule, NotificationModule],
  controllers: [AiAgentController],
  providers: [AiAgentService, ElevenLabsService],
  exports: [AiAgentService, ElevenLabsService],
})
export class AiAgentModule { }
