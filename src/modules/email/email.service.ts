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
          .header { background: linear-gradient(135deg, #526FFF 0%, #8fa1ffff 100%); padding: 30px; text-align: center; color: white; }
          .content { padding: 30px; background: #f9f9f9; }
          .otp-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .otp-code { font-size: 32px; font-weight: bold; color: #526FFF; letter-spacing: 5px; }
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
            <p>&copy; ${new Date().getFullYear()} Docline. All rights reserved.</p>
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
        html: this.createOtpEmailTemplate(otp, name || 'there'), // Handle null/undefined
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
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
}
