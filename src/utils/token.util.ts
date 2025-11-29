import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface TokenPayload {
  userId: string;
  role: 'admin' | 'doctor';
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenUtil {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate JWT access token
   */
  generateAccessToken(userId: string, role: 'admin' | 'doctor'): string {
    const payload = { userId, role };
    const expiresIn = this.configService.get<string>('jwt_access_expires_in') || '15m';
    
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt_access_secret'),
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId: string, role: 'admin' | 'doctor'): string {
    const payload = { userId, role };
    const expiresIn = this.configService.get<string>('jwt_refresh_expires_in') || '7d';
    
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt_refresh_secret'),
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.get<string>('jwt_access_secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Verify and decode refresh token
   */
  verifyRefreshToken(token: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.get<string>('jwt_refresh_secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Calculate refresh token expiration date
   */
  getRefreshTokenExpirationDate(): Date {
    const expiresIn = this.configService.get<string>('jwt_refresh_expires_in') || '7d';
    const milliseconds = this.parseExpirationToMilliseconds(expiresIn);
    return new Date(Date.now() + milliseconds);
  }

  /**
   * Parse expiration string (e.g., '7d', '15m') to milliseconds
   */
  private parseExpirationToMilliseconds(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000; // Default to 7 days
    }
  }
}
