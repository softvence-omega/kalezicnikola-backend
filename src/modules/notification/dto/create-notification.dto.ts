import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { DoctorNotificationType } from 'generated/prisma';

export class CreateNotificationDto {
    @IsOptional()
    @IsString()
    doctorId?: string;

    @IsNotEmpty()
    @IsEnum(DoctorNotificationType)
    type: DoctorNotificationType;

    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    message: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
