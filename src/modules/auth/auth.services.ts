import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
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

  // ----------------- VALIDATE SESSION -------------------
  async validateSession(accessToken: string) {
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

    return {
      session,
      user: session.admin || session.doctor,
      role: session.adminId ? 'admin' : 'doctor',
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
  const emailSent = await this.emailService.sendOtpEmail(
    dto.email,
    otp,
    userName, // This can be undefined, handle it in email service
  );

  if (!emailSent) {
    throw new BadRequestException('Failed to send OTP email');
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
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    return { message: 'OTP verified successfully' };
  }

  // ----------------- RESET PASSWORD -------------------
  async resetPassword(dto: ResetPasswordDto) {
    // Verify OTP first
    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        email: dto.email,
        otp: dto.otp,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Determine user type and update password
    let user: any;
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
    } else if (resetRecord.doctorId) {
      user = await this.prisma.doctor.update({
        where: { id: resetRecord.doctorId },
        data: { passwordHash },
      });
    } else {
      throw new BadRequestException('Invalid reset record');
    }

    // Mark OTP as used
    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all existing sessions
    await this.invalidateAllSessions(
      user.id,
      resetRecord.adminId ? 'admin' : 'doctor',
    );

    return { message: 'Password reset successfully' };
  }
}
