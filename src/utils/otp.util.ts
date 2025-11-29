import { Injectable } from '@nestjs/common';

@Injectable()
export class OTPUtil {
  generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  getOTPExpirationTime(minutes: number = 10): Date {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + minutes);
    return expiration;
  }

  isOTPExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}