import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Clean up expired sessions
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    this.logger.log('Starting session cleanup...');

    try {
      const now = new Date();

      // Delete sessions where refresh token has expired
      const result = await this.prisma.session.deleteMany({
        where: {
          refreshTokenExpiresAt: {
            lt: now,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    } catch (error) {
      this.logger.error('Error cleaning up sessions:', error);
    }
  }

  /**
   * Clean up revoked sessions older than 30 days
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupRevokedSessions() {
    this.logger.log('Starting revoked session cleanup...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Delete revoked sessions older than 30 days
      const result = await this.prisma.session.deleteMany({
        where: {
          isRevoked: true,
          revokedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old revoked sessions`);
    } catch (error) {
      this.logger.error('Error cleaning up revoked sessions:', error);
    }
  }
}
