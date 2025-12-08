import { IsString } from 'class-validator';

export class KbQueryDto {
  @IsString()
  doctor_id: string;

  @IsString()
  query: string;
}
