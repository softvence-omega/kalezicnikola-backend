import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailTemplatesUtil {
  constructor(private config: ConfigService) {}

  getOTPEmailTemplate(otp: string, userName: string = 'User'): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f6f9fc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .tagline {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 24px;
            margin-bottom: 20px;
            color: #2d3748;
        }
        
        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.7;
        }
        
        .otp-container {
            text-align: center;
            margin: 40px 0;
        }
        
        .otp-code {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 20px 40px;
            border-radius: 10px;
            letter-spacing: 8px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .expiry-note {
            text-align: center;
            color: #e53e3e;
            font-size: 14px;
            margin-top: 10px;
            font-weight: 500;
        }
        
        .security-tips {
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #4299e1;
            margin: 30px 0;
        }
        
        .security-tips h3 {
            color: #2d3748;
            margin-bottom: 10px;
        }
        
        .security-tips ul {
            list-style: none;
            padding-left: 0;
        }
        
        .security-tips li {
            padding: 5px 0;
            color: #4a5568;
        }
        
        .security-tips li:before {
            content: "•";
            color: #4299e1;
            font-weight: bold;
            display: inline-block;
            width: 1em;
            margin-left: -1em;
        }
        
        .footer {
            background: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .support {
            color: #718096;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .copyright {
            color: #a0aec0;
            font-size: 12px;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 10px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .otp-code {
                font-size: 24px;
                padding: 15px 30px;
                letter-spacing: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Docline</div>
            <div class="tagline">Your Trusted Healthcare Partner</div>
        </div>
        
        <div class="content">
            <h1 class="greeting">Hello ${userName},</h1>
            
            <p class="message">
                You requested to reset your password for your Docline account. 
                Use the OTP code below to verify your identity and proceed with resetting your password.
            </p>
            
            <div class="otp-container">
                <div class="otp-code">${otp}</div>
                <p class="expiry-note">This OTP will expire in 10 minutes</p>
            </div>
            
            <div class="security-tips">
                <h3>Security Tips:</h3>
                <ul>
                    <li>Never share this OTP with anyone</li>
                    <li>Docline will never ask for your password or OTP</li>
                    <li>Ensure you're on the official Docline website</li>
                    <li>If you didn't request this, please ignore this email</li>
                </ul>
            </div>
            
            <p class="message">
                If you have any questions or need assistance, our support team is here to help you.
            </p>
        </div>
        
        <div class="footer">
            <p class="support">Need help? Contact our support team at support@docline.com</p>
            <p>&copy; ${new Date().getFullYear()} Docline. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  getPasswordResetSuccessTemplate(userName: string = 'User'): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Successful</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f6f9fc;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        
        .success-icon {
            font-size: 64px;
            color: #28a745;
            margin-bottom: 20px;
        }
        
        .greeting {
            font-size: 24px;
            margin-bottom: 20px;
            color: #2d3748;
        }
        
        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.7;
        }
        
        .footer {
            background: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .support {
            color: #718096;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .copyright {
            color: #a0aec0;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Docline</div>
        </div>
        
        <div class="content">
            <div class="success-icon">✓</div>
            <h1 class="greeting">Password Reset Successful</h1>
            <p class="message">
                Hello ${userName}, your password has been successfully reset. You can now log in to your account with your new password.
            </p>
        </div>
        
        <div class="footer">
            <p class="support">Need help? Contact our support team at support@docline.com</p>
            <p>&copy; ${new Date().getFullYear()} Docline. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  getWelcomeEmailTemplate(userName: string = 'Doctor'): string {
    const logoUrl = `${this.config.get('BACKEND_URL')}/docline-logo.jpg`;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Docline</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f2f2f2;
        }

        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border: 1px solid #e5e5e5;
        }

        .header {
            padding: 40px 30px;
            text-align: center;
            border-bottom: 1px solid #e5e5e5;
        }

        .logo {
            text-align: center;
        }

        .logo img {
            max-width: 200px;
            height: auto;
        }

        .tagline {
            margin-top: 8px;
            font-size: 14px;
            color: #555555;
        }

        .content {
            padding: 40px 30px;
        }

        .greeting {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 20px;
        }

        .message {
            font-size: 15px;
            color: #333333;
            margin-bottom: 20px;
        }

        .divider {
            height: 1px;
            background: #e5e5e5;
            margin: 30px 0;
        }

        .cta-container {
            text-align: center;
            margin-top: 30px;
        }

        .cta-button {
            display: inline-block;
            padding: 14px 36px;
            border: 2px solid #000000;
            color: #000000;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .cta-button:hover {
            background: #000000;
            color: #ffffff;
        }

        .footer {
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid #e5e5e5;
            background: #fafafa;
        }

        .support {
            font-size: 13px;
            color: #555555;
            margin-bottom: 8px;
        }

        .copyright {
            font-size: 12px;
            color: #888888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo"><img src="${logoUrl}" alt="Docline Logo" /></div>
        </div>

        <div class="content">
            <h1 class="greeting">Welcome, ${userName}</h1>

            <p class="message">
                Thank you for joining Docline. We’re pleased to have you on board.
            </p>

            <p class="message">
                Docline is designed to support medical professionals with a focused,
                reliable, and secure platform for managing their daily practice.
            </p>

            <p class="message">
                You can now access your dashboard to complete your profile and begin
                using the system.
            </p>

            <div class="divider"></div>

            <div class="cta-container">
                <a href="https://docline.ai/dashboard" class="cta-button">
                    ACCESS YOUR DASHBOARD
                </a>
            </div>
        </div>

        <div class="footer">
            <p class="support">
                Need help? Contact us at <strong>info@docline.com</strong>
            </p>
            <p class="copyright">
                © ${new Date().getFullYear()} Docline. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
`;
  }
}
