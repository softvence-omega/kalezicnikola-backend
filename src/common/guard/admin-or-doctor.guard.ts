import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminOrDoctorGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    const session = await this.prisma.session.findUnique({
      where: { accessToken: token },
      include: { admin: true, doctor: true },
    });

    if (!session || (!session.adminId && !session.doctorId)) {
      throw new ForbiddenException('Admin or Doctor access required');
    }

    // Attach user data to request
    if (session.adminId) {
      request.user = session.admin;
      request.role = 'admin';
    } else if (session.doctorId) {
      request.user = session.doctor;
      request.role = 'doctor';
    }

    return true;
  }
}