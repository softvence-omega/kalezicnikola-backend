import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailTemplatesUtil } from 'src/utils/email-templates.util';

@Injectable()
export class EmailService {
  private transporter;

  constructor(
    private config: ConfigService,
    private templatesUtil: EmailTemplatesUtil,
  ) {
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
          .container { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #526FFF 0%, #8fa1ffff 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #ffffff; border: 1px solid #e0e0e0; border-top: none; }
          .otp-box { background: #f4f6ff; padding: 20px; text-align: center; margin: 25px 0; border-radius: 12px; border: 2px dashed #526FFF; }
          .otp-code { font-size: 38px; font-weight: 800; color: #526FFF; letter-spacing: 8px; font-family: monospace; }
          .footer { text-align: center; padding: 25px; color: #888; font-size: 13px; }
          .btn { background-color: #526FFF; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px; }
          .security-notice { font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">Docline</h1>
            <p style="margin:5px 0 0;">Your Healthcare Partner</p>
          </div>
          <div class="content">
            <h2 style="color: #333; margin-top: 0;">Password Reset</h2>
            <p>Hello <strong>${name || 'there'}</strong>,</p>
            <p>We received a request to reset your password. Use the verification code below to proceed:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email or contact support if you have concerns.</p>
            
            <div class="security-notice">
              <p><strong>Security Note:</strong> Our team will never ask for this code over the phone or email. Please keep it confidential.</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Docline. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private createTwoFactorOtpTemplate(otp: string, name?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #1a237e 0%, #526FFF 100%); padding: 40px 20px; text-align: center; color: white; border-radius: 12px 12px 0 0; }
          .content { padding: 40px; background: #ffffff; border: 1px solid #e0e0e0; border-top: none; }
          .otp-box { background: #f0f3ff; padding: 30px; text-align: center; margin: 30px 0; border-radius: 16px; border: 1px solid #d1d9ff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
          .otp-code { font-size: 42px; font-weight: 800; color: #1a237e; letter-spacing: 10px; font-family: 'Courier New', monospace; }
          .footer { text-align: center; padding: 30px; color: #999; font-size: 13px; }
          .security-shield { font-size: 40px; margin-bottom: 20px; }
          .verify-text { font-size: 18px; color: #333; font-weight: 600; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="security-shield">🛡️</div>
            <h1 style="margin:0; font-size: 28px; letter-spacing: 1px;">Security Verification</h1>
            <p style="margin:10px 0 0; opacity: 0.9;">Two-Factor Authentication</p>
          </div>
          <div class="content">
            <p class="verify-text">Verify Your Identity</p>
            <p>Hello ${name || 'there'},</p>
            <p>To finish logging into your <strong>Docline</strong> account, please enter the following 6-digit verification code:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p style="color: #666; line-height: 1.6;">This code was requested for a login attempt and will expire in <strong>10 minutes</strong>.</p>
            
            <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; font-size: 12px; color: #aaa;">
              <p>Requested at: ${new Date().toUTCString()}</p>
              <p>If this wasn't you, someone may be trying to access your account. Please change your password immediately.</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Docline Healthcare Systems. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendOtpEmail(
    to: string,
    otp: string,
    name?: string | null,
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Docline" <${this.config.get('smtp_auth_user')}>`,
        to,
        subject: 'Your Password Reset OTP - Docline',
        html: this.createOtpEmailTemplate(otp, name || 'there'),
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendTwoFactorOtpEmail(
    to: string,
    otp: string,
    name?: string | null,
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Docline Security" <${this.config.get('smtp_auth_user')}>`,
        to,
        subject: `[Docline] ${otp} is your verification code`,
        html: this.createTwoFactorOtpTemplate(otp, name || 'there'),
      });
      return true;
    } catch (error) {
      console.error('2FA Email sending failed:', error);
      return false;
    }
  }

  // ==================== EVENT EMAIL METHODS ====================

  private createEventInvitationTemplate(eventDetails: {
    title: string;
    eventType: string;
    startDate: string;
    startTime: string;
    endTime: string;
    location?: string;
    meetingLink?: string;
    description?: string;
  }): string {
    const locationInfo = eventDetails.meetingLink
      ? `<p><strong>Meeting Link:</strong> <a href="${eventDetails.meetingLink}" style="color: #526FFF;">${eventDetails.meetingLink}</a></p>`
      : eventDetails.location
        ? `<p><strong>Location:</strong> ${eventDetails.location}</p>`
        : '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #526FFF 0%, #8fa1ffff 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; background: #f9f9f9; }
        .event-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #526FFF; }
        .event-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .event-type { display: inline-block; background: #526FFF; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; margin-bottom: 15px; }
        .event-detail { margin: 10px 0; color: #555; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Docline</h1>
          <p>Event Invitation</p>
        </div>
        <div class="content">
          <h2>You're Invited!</h2>
          <p>You have been invited to the following event:</p>
          
          <div class="event-box">
            <div class="event-title">${eventDetails.title}</div>
            <span class="event-type">${eventDetails.eventType}</span>
            
            <div class="event-detail"><strong>📅 Date:</strong> ${eventDetails.startDate}</div>
            <div class="event-detail"><strong>🕐 Time:</strong> ${eventDetails.startTime} - ${eventDetails.endTime}</div>
            ${locationInfo}
            ${eventDetails.description ? `<div class="event-detail"><strong>Description:</strong><br>${eventDetails.description}</div>` : ''}
          </div>
          
          <p>We look forward to seeing you there!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Docline. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }

  private createEventUpdateTemplate(eventDetails: {
    title: string;
    eventType: string;
    startDate: string;
    startTime: string;
    endTime: string;
    location?: string;
    meetingLink?: string;
    description?: string;
  }): string {
    const locationInfo = eventDetails.meetingLink
      ? `<p><strong>Meeting Link:</strong> <a href="${eventDetails.meetingLink}" style="color: #526FFF;">${eventDetails.meetingLink}</a></p>`
      : eventDetails.location
        ? `<p><strong>Location:</strong> ${eventDetails.location}</p>`
        : '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #FF9800 0%, #FFB74D 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; background: #f9f9f9; }
        .event-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #FF9800; }
        .event-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .event-type { display: inline-block; background: #FF9800; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; margin-bottom: 15px; }
        .event-detail { margin: 10px 0; color: #555; }
        .update-badge { background: #FFF3E0; color: #E65100; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Docline</h1>
          <p>Event Updated</p>
        </div>
        <div class="content">
          <div class="update-badge">
            <strong>⚠️ Event Update:</strong> The event details have been modified.
          </div>
          
          <h2>Updated Event Details</h2>
          
          <div class="event-box">
            <div class="event-title">${eventDetails.title}</div>
            <span class="event-type">${eventDetails.eventType}</span>
            
            <div class="event-detail"><strong>📅 Date:</strong> ${eventDetails.startDate}</div>
            <div class="event-detail"><strong>🕐 Time:</strong> ${eventDetails.startTime} - ${eventDetails.endTime}</div>
            ${locationInfo}
            ${eventDetails.description ? `<div class="event-detail"><strong>Description:</strong><br>${eventDetails.description}</div>` : ''}
          </div>
          
          <p>Please review the updated details and adjust your schedule accordingly.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Docline. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }

  private createEventCancellationTemplate(
    eventDetails: {
      title: string;
      eventType: string;
      startDate: string;
      startTime: string;
    },
    reason: string,
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #F44336 0%, #EF5350 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; background: #f9f9f9; }
        .event-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #F44336; }
        .event-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; text-decoration: line-through; }
        .event-type { display: inline-block; background: #F44336; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; margin-bottom: 15px; }
        .event-detail { margin: 10px 0; color: #555; }
        .cancellation-badge { background: #FFEBEE; color: #C62828; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .reason-box { background: #FFF3E0; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Docline</h1>
          <p>Event Cancelled</p>
        </div>
        <div class="content">
          <div class="cancellation-badge">
            <strong>❌ Event Cancelled:</strong> This event has been cancelled.
          </div>
          
          <h2>Cancelled Event</h2>
          
          <div class="event-box">
            <div class="event-title">${eventDetails.title}</div>
            <span class="event-type">${eventDetails.eventType}</span>
            
            <div class="event-detail"><strong>📅 Date:</strong> ${eventDetails.startDate}</div>
            <div class="event-detail"><strong>🕐 Time:</strong> ${eventDetails.startTime}</div>
          </div>
          
          <div class="reason-box">
            <strong>Reason for Cancellation:</strong><br>
            ${reason}
          </div>
          
          <p>We apologize for any inconvenience this may cause. If you have any questions, please don't hesitate to contact us.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Docline. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }

  async sendEventInvitationEmail(
    to: string,
    eventDetails: {
      title: string;
      eventType: string;
      startDate: string;
      startTime: string;
      endTime: string;
      location?: string;
      meetingLink?: string;
      description?: string;
    },
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Docline" <${this.config.get('smtp_auth_user')}>`,
        to,
        subject: `Event Invitation: ${eventDetails.title}`,
        html: this.createEventInvitationTemplate(eventDetails),
      });
      return true;
    } catch (error) {
      console.error('Event invitation email sending failed:', error);
      return false;
    }
  }

  async sendEventUpdateEmail(
    to: string,
    eventDetails: {
      title: string;
      eventType: string;
      startDate: string;
      startTime: string;
      endTime: string;
      location?: string;
      meetingLink?: string;
      description?: string;
    },
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Docline" <${this.config.get('smtp_auth_user')}>`,
        to,
        subject: `Event Updated: ${eventDetails.title}`,
        html: this.createEventUpdateTemplate(eventDetails),
      });
      return true;
    } catch (error) {
      console.error('Event update email sending failed:', error);
      return false;
    }
  }

  async sendEventCancellationEmail(
    to: string,
    eventDetails: {
      title: string;
      eventType: string;
      startDate: string;
      startTime: string;
    },
    reason: string,
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Docline" <${this.config.get('smtp_auth_user')}>`,
        to,
        subject: `Event Cancelled: ${eventDetails.title}`,
        html: this.createEventCancellationTemplate(eventDetails, reason),
      });
      return true;
    } catch (error) {
      console.error('Event cancellation email sending failed:', error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Docline" <${this.config.get('smtp_auth_user')}>`,
        to,
        subject: 'Welcome to Docline!',
        html: this.templatesUtil.getWelcomeEmailTemplate(name),
      });
      return true;
    } catch (error) {
      console.error('Welcome email sending failed:', error);
      return false;
    }
  }
}
