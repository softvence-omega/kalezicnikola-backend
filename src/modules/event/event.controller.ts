import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { GetAllEventsDto } from './dto/get-all-events.dto';
import { fileStorage, imageFileFilter } from 'src/utils/file-upload.util';
import { DoctorGuard } from 'src/common/guard/doctor.guard';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  // ==================== CREATE EVENT ====================
  @Post('create')
  @UseGuards(DoctorGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: fileStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async createEvent(
    @Headers('authorization') authorization: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!authorization) {
      throw new BadRequestException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new BadRequestException('Invalid authorization format');
    }

    let dto: CreateEventDto;

    // Handle JSON in 'data' field (multipart/form-data pattern)
    if (body.data) {
      try {
        const parsedData = JSON.parse(body.data);
        dto = plainToInstance(CreateEventDto, parsedData);
      } catch (err) {
        // Delete uploaded file if JSON parsing fails
        if (file) {
          const fs = require('fs');
          const path = require('path');
          const filePath = path.join(process.cwd(), 'uploads', file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        throw new BadRequestException({
          message: "Invalid JSON format in 'data' field",
          error: err.message,
        });
      }
    } else {
      // Handle standard body (application/json or direct fields)
      dto = plainToInstance(CreateEventDto, body);
    }

    // Manually validate the DTO
    const errors = await validate(dto);
    if (errors.length > 0) {
      // Delete uploaded file if validation fails
      if (file) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const formattedErrors = errors.map((err) => ({
        property: err.property,
        value: err.value,
        constraints: err.constraints,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    try {
      return await this.eventService.createEvent(token, dto, file);
    } catch (error) {
      // Delete uploaded file if event creation fails
      if (file) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      throw error;
    }
  }

  // ==================== GET ALL EVENTS ====================
  @Get()
  @UseGuards(DoctorGuard)
  async getAllEvents(
    @Headers('authorization') authorization: string,
    @Query() query: GetAllEventsDto,
  ) {
    if (!authorization) {
      throw new BadRequestException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new BadRequestException('Invalid authorization format');
    }

    return await this.eventService.getAllEvents(token, query);
  }

  // ==================== GET SINGLE EVENT ====================
  @Get(':id')
  @UseGuards(DoctorGuard)
  async getSingleEvent(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    if (!authorization) {
      throw new BadRequestException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new BadRequestException('Invalid authorization format');
    }

    return await this.eventService.getSingleEvent(token, id);
  }

  // ==================== UPDATE EVENT ====================
  @Patch('update/:id')
  @UseGuards(DoctorGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: fileStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async updateEvent(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!authorization) {
      throw new BadRequestException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new BadRequestException('Invalid authorization format');
    }

    let dto: UpdateEventDto;

    // Handle JSON in 'data' field (multipart/form-data pattern)
    if (body.data) {
      try {
        const parsedData = JSON.parse(body.data);
        dto = plainToInstance(UpdateEventDto, parsedData);
      } catch (err) {
        // Delete uploaded file if JSON parsing fails
        if (file) {
          const fs = require('fs');
          const path = require('path');
          const filePath = path.join(process.cwd(), 'uploads', file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        throw new BadRequestException({
          message: "Invalid JSON format in 'data' field",
          error: err.message,
        });
      }
    } else {
      // Handle standard body (application/json or direct fields)
      dto = plainToInstance(UpdateEventDto, body);
    }

    // Manually validate the DTO
    const errors = await validate(dto);
    if (errors.length > 0) {
      // Delete uploaded file if validation fails
      if (file) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const formattedErrors = errors.map((err) => ({
        property: err.property,
        value: err.value,
        constraints: err.constraints,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    try {
      return await this.eventService.updateEvent(token, id, dto, file);
    } catch (error) {
      // Delete uploaded file if event update fails
      if (file) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      throw error;
    }
  }

  // ==================== DELETE EVENT ====================
  @Delete(':id')
  @UseGuards(DoctorGuard)
  async deleteEvent(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    if (!authorization) {
      throw new BadRequestException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new BadRequestException('Invalid authorization format');
    }

    if (!reason) {
      throw new BadRequestException('Cancellation reason is required');
    }

    return await this.eventService.deleteEvent(token, id, reason);
  }
}
