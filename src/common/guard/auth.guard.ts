import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenUtil } from 'src/utils/token.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private tokenUtil: TokenUtil;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.tokenUtil = new TokenUtil(jwtService, configService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    // Verify token
    const payload = this.tokenUtil.verifyAccessToken(token);

    // Validate session
    const session = await this.prisma.session.findUnique({
      where: { accessToken: token },
      include: {
        admin: true,
        doctor: true,
      },
    });

    if (!session || !session.isActive || session.isRevoked) {
      throw new UnauthorizedException('Invalid or inactive session');
    }

    // Attach user and role to request
    request.user = session.admin || session.doctor;
    request.role = payload.role;
    request.session = session;

    // Update last activity
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    return true;
  }
}