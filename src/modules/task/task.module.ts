import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
