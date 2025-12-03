import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CheckEmploymentIdDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^STF-\d+$/, {
    message: 'Employment ID must start with STF- followed by digits',
  })
  employmentId: string;
}
