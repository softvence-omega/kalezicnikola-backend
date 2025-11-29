import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplatesUtil {
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
            <p class="copyright">&copy; 2024 Docline. All rights reserved.</p>
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
        /* Similar styling as OTP template */
        /* I'll provide the full template when you need it */
    </style>
</head>
<body>
    <!-- Success template structure -->
</body>
</html>
    `;
  }
}
