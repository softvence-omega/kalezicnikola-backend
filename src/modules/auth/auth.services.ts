import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminRegistrationDto } from './dto/auth-admin.dto';
import { DoctorRegistrationDto } from './dto/auth-doctor.dto';
import { UserLoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenUtil } from 'src/utils/token.util';
import { EmailService } from '../email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Injectable()
export class AuthService {
  private tokenUtil: TokenUtil;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {
    this.tokenUtil = new TokenUtil(jwt, config);
  }

  // ----------------- ADMIN REGISTER -------------------
  async registerAdmin(dto: AdminRegistrationDto) {
    const existing =
      (await this.prisma.admin.findUnique({ where: { email: dto.email } })) ||
      (await this.prisma.doctor.findUnique({ where: { email: dto.email } }));

    if (existing) throw new BadRequestException('Email already in use');

    const saltRounds = parseInt(
      this.config.get<string>('bcrypt_salt_rounds') || '10',
      10,
    );
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const admin = await this.prisma.admin.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
      },
    });

    return admin;
  }

  // ----------------- DOCTOR REGISTER ------------------
  async registerDoctor(dto: DoctorRegistrationDto) {
    const existing =
      (await this.prisma.admin.findUnique({ where: { email: dto.email } })) ||
      (await this.prisma.doctor.findUnique({ where: { email: dto.email } }));

    if (existing) throw new BadRequestException('Email already in use');

    const saltRounds = parseInt(
      this.config.get<string>('bcrypt_salt_rounds') || '10',
      10,
    );
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const doctor = await this.prisma.doctor.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        licenceNo: dto.licenceNo || null,
        specialities: [],
      },
    });

    return doctor;
  }

  // ----------------- ADMIN LOGIN -------------------
  async loginAdmin(dto: UserLoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin || !admin.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.tokenUtil.generateAccessToken(admin.id, 'admin');
    const refreshToken = this.tokenUtil.generateRefreshToken(admin.id, 'admin');

    // Create session
    await this.createSession(admin.id, 'admin', accessToken, refreshToken);

    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Create or update User record for chat system
    await this.prisma.user.upsert({
      where: { adminId: admin.id },
      create: {
        adminId: admin.id,
        role: 'ADMIN',
      },
      update: {},
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: 'admin',
      },
    };
  }

  // ----------------- DOCTOR LOGIN -------------------
  async loginDoctor(dto: UserLoginDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { email: dto.email },
    });

    if (!doctor || !doctor.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      doctor.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.tokenUtil.generateAccessToken(doctor.id, 'doctor');
    const refreshToken = this.tokenUtil.generateRefreshToken(
      doctor.id,
      'doctor',
    );

    // Create session
    await this.createSession(doctor.id, 'doctor', accessToken, refreshToken);

    // Update last login
    await this.prisma.doctor.update({
      where: { id: doctor.id },
      data: { lastLoginAt: new Date() },
    });

    // Create or update User record for chat system
    await this.prisma.user.upsert({
      where: { doctorId: doctor.id },
      create: {
        doctorId: doctor.id,
        role: 'DOCTOR',
      },
      update: {},
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: doctor.id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        role: 'doctor',
      },
    };
  }

  // ----------------- LOGOUT -------------------
  async logout(accessToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    // Revoke session
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return { message: 'Logged out successfully' };
  }

  // ----------------- REFRESH TOKEN -------------------
  async refreshToken(refreshToken: string) {
    // Verify refresh token
    const payload = this.tokenUtil.verifyRefreshToken(refreshToken);

    // Find session
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || !session.isActive || session.isRevoked) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if refresh token is expired
    if (new Date() > session.refreshTokenExpiresAt) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new access token
    const newAccessToken = this.tokenUtil.generateAccessToken(
      payload.userId,
      payload.role,
    );

    // Update session with new access token
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        lastActivity: new Date(),
      },
    });

    return {
      accessToken: newAccessToken,
    };
  }

  // ----------------- DECODE TOKEN -------------------
  async decodeToken(accessToken: string) {
    try {
      // Verify and decode the token without checking database session
      const decoded = this.jwt.verify(accessToken, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      // Get additional user information from database based on role
      let userInfo: any = null;
      
      if (decoded.role === 'admin') {
        userInfo = await this.prisma.admin.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            photo: true,
            createdAt: true,
            lastLoginAt: true,
          },
        });
      } else if (decoded.role === 'doctor') {
        userInfo = await this.prisma.doctor.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            licenceNo: true,
            specialities: true,
            createdAt: true,
            lastLoginAt: true,
          },
        });
      }

      return {
        tokenPayload: decoded,
        user: userInfo,
        sessionInfo: {
          issuedAt: new Date(decoded.iat * 1000),
          expiresAt: new Date(decoded.exp * 1000),
          timeRemaining: `${Math.max(0, Math.floor((decoded.exp * 1000 - Date.now()) / 1000 / 60))} minutes`,
        },
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      } else {
        throw new UnauthorizedException('Token verification failed');
      }
    }
  }

  // Alternative: Decode token without verification (less secure but faster)
  async decodeTokenWithoutVerification(accessToken: string) {
    try {
      // Decode without verification (just base64 decoding)
      const decoded = this.jwt.decode(accessToken);

      if (!decoded) {
        throw new UnauthorizedException('Invalid token format');
      }

      return {
        tokenPayload: decoded,
        note: 'This is a decoded token without signature verification',
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to decode token');
    }
  }


  // ----------------- VALIDATE SESSION -------------------
  async validateSession(accessToken: string): Promise<{
    session: any;
    user: any;
    role: 'admin' | 'doctor';
  }> {
    // CRITICAL: Verify token expiration first
    const payload = this.tokenUtil.verifyAccessToken(accessToken);

    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: {
        admin: true,
        doctor: true,
      },
    });

    if (!session || !session.isActive || session.isRevoked) {
      throw new UnauthorizedException('Invalid or inactive session');
    }

    // Update last activity
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    // Determine role explicitly
    let role: 'admin' | 'doctor';
    let user: any;

    if (session.adminId && session.admin) {
      role = 'admin';
      user = session.admin;
    } else if (session.doctorId && session.doctor) {
      role = 'doctor';
      user = session.doctor;
    } else {
      throw new UnauthorizedException('Invalid session data');
    }

    return {
      session,
      user,
      role,
    };
  }

  // ----------------- CREATE SESSION -------------------
  private async createSession(
    userId: string,
    role: 'admin' | 'doctor',
    accessToken: string,
    refreshToken: string,
  ) {
    const refreshTokenExpiresAt =
      this.tokenUtil.getRefreshTokenExpirationDate();

    return await this.prisma.session.create({
      data: {
        accessToken,
        refreshToken,
        refreshTokenExpiresAt,
        isActive: true,
        isRevoked: false,
        lastActivity: new Date(),
        ...(role === 'admin' ? { adminId: userId } : { doctorId: userId }),
      },
    });
  }

  // ----------------- INVALIDATE ALL SESSIONS -------------------
  private async invalidateAllSessions(
    userId: string,
    userType: 'admin' | 'doctor',
  ) {
    const whereClause =
      userType === 'admin' ? { adminId: userId } : { doctorId: userId };

    await this.prisma.session.updateMany({
      where: {
        ...whereClause,
        isActive: true,
      },
      data: {
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  // ----------------- FORGOT PASSWORD -------------------
  async forgotPassword(dto: ForgotPasswordDto) {
    // Check both admin and doctor tables
    const [admin, doctor] = await Promise.all([
      this.prisma.admin.findUnique({ where: { email: dto.email } }),
      this.prisma.doctor.findUnique({ where: { email: dto.email } }),
    ]);

    if (!admin && !doctor) {
      // Don't reveal if email exists for security
      return { message: 'If the email exists, an OTP has been sent' };
    }

    // Clean up old unused OTPs for this email (older than 1 hour)
    await this.prisma.passwordReset.deleteMany({
      where: {
        email: dto.email,
        usedAt: null,
        createdAt: {
          lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database with appropriate relation
    const resetData: any = {
      email: dto.email,
      otp,
      expiresAt,
    };

    let userName: string | undefined;

    if (admin) {
      resetData.adminId = admin.id;
      userName = admin.firstName || undefined;
    } else if (doctor) {
      resetData.doctorId = doctor.id;
      userName = doctor.firstName || undefined;
    }

    await this.prisma.passwordReset.create({
      data: resetData,
    });

    // Send OTP via email
    try {
      const emailSent = await this.emailService.sendOtpEmail(
        dto.email,
        otp,
        userName,
      );

      if (!emailSent) {
        throw new BadRequestException('Failed to send OTP email');
      }
    } catch (error) {
      throw new BadRequestException(
        'Failed to send OTP email. Please try again later.',
      );
    }

    return { message: 'OTP sent to your email' };
  }

  // ----------------- VERIFY OTP -------------------
  async verifyOtp(dto: VerifyOtpDto) {
    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        email: dto.email,
        otp: dto.otp,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      throw new BadRequestException(
        'Invalid or expired OTP. Please request a new one.',
      );
    }

    // Mark OTP as verified (but not used yet - that happens on password reset)
    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { verifiedAt: new Date() },
    });

    return {
      message: 'OTP verified successfully. You can now reset your password.',
    };
  }

  // ----------------- RESET PASSWORD -------------------
  async resetPassword(dto: ResetPasswordDto) {
    // Verify OTP (accepts both verified and unverified OTPs)
    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        email: dto.email,
        otp: dto.otp,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      throw new BadRequestException(
        'Invalid or expired OTP. Please request a new one.',
      );
    }

    // Validate new password strength
    if (dto.newPassword.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    // Determine user type and update password
    let user: any;
    let userType: 'admin' | 'doctor';

    const saltRounds = parseInt(
      this.config.get<string>('bcrypt_salt_rounds') || '10',
      10,
    );
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    if (resetRecord.adminId) {
      user = await this.prisma.admin.update({
        where: { id: resetRecord.adminId },
        data: { passwordHash },
      });
      userType = 'admin';
    } else if (resetRecord.doctorId) {
      user = await this.prisma.doctor.update({
        where: { id: resetRecord.doctorId },
        data: { passwordHash },
      });
      userType = 'doctor';
    } else {
      throw new BadRequestException(
        'Invalid password reset request. Please try again.',
      );
    }

    // Verify password was actually updated
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Failed to update password. Please try again.',
      );
    }

    // Mark OTP as used
    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: {
        usedAt: new Date(),
        verifiedAt: resetRecord.verifiedAt || new Date(), // Set verifiedAt if not already set
      },
    });

    // Invalidate all existing sessions for security
    await this.invalidateAllSessions(user.id, userType);

    return {
      message:
        'Password reset successfully. You can now login with your new password.',
    };
  }

  // ----------------- CHANGE PASSWORD -------------------
  async changePassword(accessToken: string, dto: ChangePasswordDto) {
    // Validate session and get user info
    const sessionData = await this.validateSession(accessToken);

    if (!sessionData.user) {
      throw new UnauthorizedException('Invalid session');
    }

    const { user, role } = sessionData;
    const userId = user.id;

    // Validate current password
    let isCurrentPasswordValid = false;

    if (role === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!admin?.passwordHash) {
        throw new BadRequestException('Password not set for this account');
      }

      isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        admin.passwordHash,
      );
    } else if (role === 'doctor') {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!doctor?.passwordHash) {
        throw new BadRequestException('Password not set for this account');
      }

      isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        doctor.passwordHash,
      );
    } else {
      throw new BadRequestException('Invalid user role');
    }

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password is different from current password
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Validate new password strength
    if (dto.newPassword.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    // Hash new password
    const saltRounds = parseInt(
      this.config.get<string>('bcrypt_salt_rounds') || '10',
      10,
    );
    const newPasswordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    // Update password based on role
    if (role === 'admin') {
      await this.prisma.admin.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });
    } else if (role === 'doctor') {
      await this.prisma.doctor.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });
    }

    // Invalidate all existing sessions for security
    await this.invalidateAllSessions(userId, role as 'admin' | 'doctor');

    return {
      message: 'Password changed successfully. Please login again.',
    };
  }

  // ----------------- DELETE ACCOUNT (DOCTOR ONLY) -------------------
  async deleteAccount(accessToken: string, dto: DeleteAccountDto) {
    // Validate session and get user info
    const sessionData = await this.validateSession(accessToken);

    if (!sessionData.user) {
      throw new UnauthorizedException('Invalid session');
    }

    const { user, role } = sessionData;
    const userId = user.id;

    // RESTRICT TO DOCTORS ONLY
    if (role !== 'doctor') {
      throw new ForbiddenException('This endpoint is for doctors only');
    }

    // Verify password before deletion
    let isPasswordValid = false;

    // REMOVED ADMIN LOGIC - ONLY DOCTOR LOGIC REMAINS
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!doctor?.passwordHash) {
      throw new BadRequestException(
        'Unable to verify password for this account',
      );
    }

    isPasswordValid = await bcrypt.compare(dto.password, doctor.passwordHash);

    if (!isPasswordValid) {
      throw new BadRequestException(
        'Password is incorrect. Account deletion failed.',
      );
    }

    // Use transaction to ensure all operations succeed or fail together
    return await this.prisma.$transaction(async (tx) => {
      // 1. First, invalidate all sessions (ONLY DOCTOR SESSIONS)
      await tx.session.updateMany({
        where: { doctorId: userId },
        data: {
          isActive: false,
          isRevoked: true,
          revokedAt: new Date(),
        },
      });

      // 2. Clean up password reset records (ONLY DOCTOR RECORDS)
      await tx.passwordReset.deleteMany({
        where: {
          doctorId: userId,
        },
      });

      // 3. Soft delete the doctor account
      await tx.doctor.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@deleted.com`, // Change email to avoid conflicts
          passwordHash: null,
          firstName: 'Deleted',
          lastName: 'User',
          deletedAt: new Date(),
        },
      });

      return {
        message:
          'Doctor account deleted successfully. All your data has been removed.',
      };
    });
  }
}
