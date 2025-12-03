import {
  Controller,
  Post,
  Body,
  HttpStatus,
  Headers,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PatientService } from './patient.service';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { CreatePatientDto } from './dto/create-patient.dto';
import { fileStorage, imageFileFilter } from 'src/utils/file-upload.util';

@Controller('doctor/patient')
export class PatientController {
  constructor(private patientService: PatientService) {}

  // ----------------- ADD PATIENT -------------------
  @Post('add')
  @UseGuards(DoctorGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: fileStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async addPatient(
    @Headers('authorization') authorization: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    let dto: CreatePatientDto;

    // Handle JSON in 'data' field (multipart/form-data pattern)
    if (body.data) {
      try {
        const parsedData = JSON.parse(body.data);
        dto = plainToInstance(CreatePatientDto, parsedData);
      } catch (err) {
        console.error('JSON Parse Error:', err);
        throw new BadRequestException({
          message: "Invalid JSON format in 'data' field",
          error: err.message,
        });
      }
    } else {
      // Handle standard body (application/json or direct fields)
      dto = plainToInstance(CreatePatientDto, body);
    }

    // Attach file path if uploaded
    if (file) {
      dto.photo = `/api/v1/uploads/${file.filename}`;
    }

    // Manually validate the DTO since we bypassed global pipe for multipart
    const errors = await validate(dto);
    if (errors.length > 0) {
      // Format errors similar to ValidationPipe with detailed constraints
      const formattedErrors = errors.map((err) => ({
        property: err.property,
        value: err.value,
        constraints: err.constraints,
      }));
      
      console.error('Validation Errors:', formattedErrors);
      
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    const result = await this.patientService.addPatient(token, dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Patient added successfully',
      data: result,
    };
  }
}
