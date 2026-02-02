import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { SubscriptionCronService } from './subscription.cron.service';
import { ElevenLabsModule } from '../elevenlabs/elevenlabs.module';

@Module({
  imports: [ConfigModule, JwtModule, PrismaModule, ElevenLabsModule],
  controllers: [SubscriptionController, StripeWebhookController],
  providers: [SubscriptionService, SubscriptionCronService],
  exports: [SubscriptionService],
})
export class SubscriptionModule { }
