import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    const session = await this.prisma.session.findUnique({
      where: { accessToken: token },
      include: { admin: true },
    });

    if (!session || !session.adminId) {
      throw new ForbiddenException('Admin access required');
    }

    request.admin = session.admin;
    return true;
  }
}
