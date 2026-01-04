import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  addGuestEmails?: string[]; // New guests to add

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  removeGuestIds?: string[]; // Guest IDs to remove

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addAttachmentLinks?: string[]; // New links to add

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  removeAttachmentIds?: string[]; // Attachment IDs to remove
}
