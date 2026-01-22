import { IsOptional, IsDateString } from 'class-validator';

export class GetRevenueGraphDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
