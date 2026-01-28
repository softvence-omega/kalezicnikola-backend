import { IsOptional, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { DoctorNotificationType } from 'generated/prisma';

export class GetNotificationsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    unreadOnly?: boolean;

    @IsOptional()
    @IsEnum(DoctorNotificationType)
    type?: DoctorNotificationType;
}
