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


  generateAccessToken(userId: string, role: 'admin' | 'doctor'): string {
    const payload = { userId, role };
    const expiresIn = this.configService.get<string>('jwt_access_expires_in') || '15m';
    
    // console.log('🔑 Generating Access Token:');
    // console.log('  - User ID:', userId);
    // console.log('  - Role:', role);
    // console.log('  - Expires In:', expiresIn);
    // console.log('  - Current time:', new Date().toISOString());
    
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt_access_secret'),
      expiresIn: expiresIn as any,
    });
    
    // Decode to verify expiration was set correctly
    const decoded = this.jwtService.decode(token) as any;
    // console.log('  - Token will expire at:', decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A');
    
    return token;
  }


  generateRefreshToken(userId: string, role: 'admin' | 'doctor'): string {
    const payload = { userId, role };
    const expiresIn = this.configService.get<string>('jwt_refresh_expires_in') || '7d';
    
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt_refresh_secret'),
      expiresIn: expiresIn as any,
    });
  }


  verifyAccessToken(token: string): TokenPayload {
    try {
      // First decode without verification to see the payload
      const decoded = this.jwtService.decode(token) as any;
      console.log('🔍 Token Debug Info:');
      console.log('  - Current time:', new Date().toISOString(), '(', Math.floor(Date.now() / 1000), ')');
      console.log('  - Token exp:', decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A', '(', decoded?.exp, ')');
      console.log('  - Token iat:', decoded?.iat ? new Date(decoded.iat * 1000).toISOString() : 'N/A', '(', decoded?.iat, ')');
      
      // Explicit expiration check
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const isExpired = decoded?.exp && currentTimestamp > decoded.exp;
      console.log('  - Is expired?', isExpired, '(current:', currentTimestamp, 'exp:', decoded?.exp, ')');
      
      if (isExpired) {
        console.log('  - ❌ Token is expired');
        throw new UnauthorizedException('Access token has expired');
      }
      
      const verified = this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.get<string>('jwt_access_secret'),
        ignoreExpiration: false, // Explicitly set to false
      });
      
      console.log('  - ✅ Token verified successfully');
      return verified;
    } catch (error) {
      console.log('  - ❌ Token verification failed:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }


  verifyRefreshToken(token: string): TokenPayload {
    try {
      // First decode to check expiration
      const decoded = this.jwtService.decode(token) as any;
      
      // Explicit expiration check
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const isExpired = decoded?.exp && currentTimestamp > decoded.exp;
      
      if (isExpired) {
        throw new UnauthorizedException('Refresh token has expired');
      }
      
      return this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.get<string>('jwt_refresh_secret'),
        ignoreExpiration: false, // Explicitly set to false
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  
   // Calculate refresh token expiration date
   
  getRefreshTokenExpirationDate(): Date {
    const expiresIn = this.configService.get<string>('jwt_refresh_expires_in') || '7d';
    const milliseconds = this.parseExpirationToMilliseconds(expiresIn);
    return new Date(Date.now() + milliseconds);
  }

 
  // Parse expiration string (e.g., '7d', '15m') to milliseconds
 
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
