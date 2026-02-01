import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class MarkMultipleAsReadDto {
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    notificationIds: string[];
}
