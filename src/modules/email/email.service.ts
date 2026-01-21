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
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111111; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 40px; text-transform: uppercase; color: #000000; }
          .content { background: #ffffff; border: 1px solid #e5e5e5; padding: 40px; border-radius: 4px; }
          .title { font-size: 20px; font-weight: 700; margin-bottom: 24px; color: #000000; }
          .greeting { font-size: 16px; margin-bottom: 16px; }
          .instructions { font-size: 16px; margin-bottom: 32px; color: #444444; }
          .otp-container { background: #f9f9f9; border: 1px solid #eeeeee; padding: 32px; text-align: center; border-radius: 4px; margin-bottom: 32px; }
          .otp-code { font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #000000; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .expiry { font-size: 14px; color: #666666; margin-bottom: 32px; }
          .footer { margin-top: 40px; padding-top: 32px; border-top: 1px solid #eeeeee; text-align: left; font-size: 12px; color: #999999; }
          .security-note { background: #fff; border-left: 2px solid #000; padding: 12px 16px; margin: 24px 0; font-size: 13px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">DOCLINE</div>
          <div class="content">
            <h1 class="title">Password Reset</h1>
            <p class="greeting">Hello ${name || 'there'},</p>
            <p class="instructions">We received a request to reset your password. Please use the following verification code to proceed:</p>
            
            <div class="otp-container">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p class="expiry">This code is valid for <strong>10 minutes</strong>. If you did not request this change, you can safely ignore this email.</p>
            
            <div class="security-note">
              <strong>Security Protocol:</strong> For your protection, do not share this code with anyone. Docline staff will never ask for your verification code.
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

  private createTwoFactorOtpTemplate(otp: string, name?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111111; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 40px; text-transform: uppercase; color: #000000; }
          .content { background: #ffffff; border: 1px solid #e5e5e5; padding: 40px; border-radius: 4px; }
          .title { font-size: 20px; font-weight: 700; margin-bottom: 24px; color: #000000; }
          .greeting { font-size: 16px; margin-bottom: 16px; }
          .instructions { font-size: 16px; margin-bottom: 32px; color: #444444; }
          .otp-container { background: #f9f9f9; border: 1px solid #eeeeee; padding: 32px; text-align: center; border-radius: 4px; margin-bottom: 32px; }
          .otp-code { font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #000000; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .expiry { font-size: 14px; color: #666666; margin-bottom: 32px; }
          .footer { margin-top: 40px; padding-top: 32px; border-top: 1px solid #eeeeee; text-align: left; font-size: 12px; color: #999999; }
          .security-note { background: #fff; border-left: 2px solid #000; padding: 12px 16px; margin: 24px 0; font-size: 13px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">DOCLINE</div>
          <div class="content">
            <h1 class="title">Security Verification</h1>
            <p class="greeting">Hello ${name || 'there'},</p>
            <p class="instructions">To finish logging into your account, please use the following 6-digit verification code:</p>
            
            <div class="otp-container">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p class="expiry">This code was requested for a login attempt and will expire in <strong>10 minutes</strong>.</p>
            
            <div class="security-note">
              <strong>Notice:</strong> Your account security is our priority. If you did not initiate this login, please change your password immediately.
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
