import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationHelperService } from './notification-helper.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [NotificationController],
    providers: [NotificationService, NotificationGateway, NotificationHelperService],
    exports: [NotificationService, NotificationGateway, NotificationHelperService],
})
export class NotificationModule { }
