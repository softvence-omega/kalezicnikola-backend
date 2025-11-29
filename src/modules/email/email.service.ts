import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get('smtp_auth_user'),
        pass: this.config.get('smtp_auth_pass'),
      },
    });
  }

  private createOtpEmailTemplate(otp: string, name?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
          .content { padding: 30px; background: #f9f9f9; }
          .otp-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Docline</h1>
            <p>Your Healthcare Partner</p>
          </div>
          <div class="content">
            <h2>Password Reset OTP</h2>
            <p>Hello ${name || 'there'},</p>
            <p>Use the following OTP to reset your password. This OTP will expire in 10 minutes.</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p>If you didn't request this, please ignore this email.</p>
            <p><strong>Security Tip:</strong> Never share your OTP with anyone.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Docline. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

async sendOtpEmail(to: string, otp: string, name?: string | null): Promise<boolean> {
  try {
    await this.transporter.sendMail({
      from: `"Docline" <${this.config.get('smtp_auth_user')}>`,
      to,
      subject: 'Your Password Reset OTP - Docline',
      html: this.createOtpEmailTemplate(otp, name || 'there'), // Handle null/undefined
    });
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}
}