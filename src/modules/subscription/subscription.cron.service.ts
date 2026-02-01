import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { ElevenLabsService } from '../ai-agent/eleven-labs.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private prisma: PrismaService,
    private elevenLabsService: ElevenLabsService,
  ) { }

  // Run every day at midnight to check for expired cancelled subscriptions
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deactivateExpiredSubscriptions() {
    try {
      this.logger.log('🔍 Checking for expired cancelled subscriptions...');

      const now = new Date();

      // Find all CANCELLED subscriptions where period has ended
      const expiredSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'CANCELLED',
          cancelledAt: { not: null },
          currentPeriodEnd: { lte: now }, // Period end is less than or equal to now
          isActive: true, // Still marked as active
        },
      });

      if (expiredSubscriptions.length === 0) {
        this.logger.log('✅ No expired subscriptions found');
        return;
      }

      this.logger.log(`📋 Found ${expiredSubscriptions.length} expired subscription(s) to deactivate`);

      // Deactivate each expired subscription
      for (const subscription of expiredSubscriptions) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { isActive: false },
        });

        // Deactivate ElevenLabs agent when subscription expires
        if (subscription.userId) {
          try {
            await this.elevenLabsService.toggleAgentActiveness(subscription.userId, false, { id: 'cron-job', role: 'system' });
            this.logger.log(`👤 Deactivated ElevenLabs agent for user ${subscription.userId} due to expiration`);
          } catch (e) {
            this.logger.error(`❌ Failed to deactivate ElevenLabs agent for user ${subscription.userId}: ${e.message}`);
          }
        }

        this.logger.log(
          `🚫 Deactivated subscription ${subscription.id} for user ${subscription.userId} (expired on ${subscription.currentPeriodEnd?.toLocaleDateString()})`,
        );
      }

      this.logger.log(`✅ Successfully deactivated ${expiredSubscriptions.length} expired subscription(s)`);
    } catch (error) {
      this.logger.error('❌ Error deactivating expired subscriptions:', error.message);
    }
  }

  // Optional: Run every hour to catch subscriptions that just expired
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredSubscriptionsHourly() {
    try {
      const now = new Date();

      const count = await this.prisma.subscription.count({
        where: {
          status: 'CANCELLED',
          cancelledAt: { not: null },
          currentPeriodEnd: { lte: now },
          isActive: true,
        },
      });

      if (count > 0) {
        this.logger.log(`⚠️ Found ${count} expired subscription(s) - will deactivate`);
        await this.deactivateExpiredSubscriptions();
      }
    } catch (error) {
      this.logger.error('❌ Error in hourly check:', error.message);
    }
  }
}
