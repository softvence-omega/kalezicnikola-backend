import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DoctorGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    const session = await this.prisma.session.findUnique({
      where: { accessToken: token },
      include: { doctor: true },
    });

    if (!session || !session.doctorId) {
      throw new ForbiddenException('Doctor access required');
    }

    request.doctor = session.doctor;
    return true;
  }
}
