import { IsOptional, IsString, IsIn } from 'class-validator';

export class GetAllAbsencesDto {
  @IsOptional()
  @IsString()
  @IsIn(['upcoming', 'past', 'all'])
  filter?: 'upcoming' | 'past' | 'all';
}
