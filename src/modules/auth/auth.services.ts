import { 
  Injectable, 
  ConflictException, 
  BadRequestException,
  InternalServerErrorException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRegistrationDto } from './dto/auth.dto';
import { AppError } from 'src/errors/AppError';
import { UserRole } from 'generated/prisma';


@Injectable()
export class AuthService {
  private refreshJwtService: JwtService;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.refreshJwtService = new JwtService({
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async register(userData: UserRegistrationDto) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.admin.findUnique({
        where: { email: userData.email },
      });

      const existingDoctor = await this.prisma.doctor.findUnique({
        where: { email: userData.email },
      });

      if (existingUser || existingDoctor) {
        throw new AppError(409, 'User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(this.config.get('BCRYPT_SALT_ROUNDS') || '10');
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      let createdUser;

      if (userData.role === UserRole.ADMIN) {
        // Create admin user
        createdUser = await this.prisma.admin.create({
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            passwordHash: passwordHash,
          },
        });
      } else if (userData.role === UserRole.DOCTOR) {
        // Create doctor user
        createdUser = await this.prisma.doctor.create({
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            passwordHash: passwordHash,
            specialities: [], // Default empty array for specialities
          },
        });
      } else {
        throw new AppError(400, 'Invalid user role');
      }

      // Remove sensitive data from response
      const { passwordHash: _, otp: __, twoFactorSecret: ___, ...userResponse } = createdUser;

      return {
        message: 'User registered successfully',
        data: userResponse,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Internal server error during registration');
    }
  }

  // Helper method to generate JWT tokens
  private async generateTokens(payload: { userId: string; email: string; role: UserRole }) {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    const refreshToken = await this.refreshJwtService.signAsync(payload, {
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return { accessToken, refreshToken };
  }
}