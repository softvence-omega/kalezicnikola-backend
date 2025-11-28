import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
  imports: [ConfigModule, JwtModule.register({}), PrismaModule],
})
export class AuthModule {}
