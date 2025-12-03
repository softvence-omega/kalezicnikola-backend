import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { DoctorService } from './doctor.service';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { UpdateDoctorProfileDto } from './dto/update-profile.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CheckEmploymentIdDto } from './dto/check-employment-id.dto';
import { GetAllStaffsDto } from './dto/get-all-staffs.dto';
import { fileStorage, imageFileFilter } from 'src/utils/file-upload.util';

@Controller('doctor')
export class DoctorController {
  constructor(private doctorService: DoctorService) {}

  // ----------------- GET MY PROFILE -------------------
  @Get('my-profile')
  @UseGuards(DoctorGuard)
  async getMyProfile(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.getMyProfile(token);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: result,
    };
  }

  // ----------------- UPDATE MY PROFILE -------------------
  @Patch('update-my-profile')
  @UseGuards(DoctorGuard)
  async updateMyProfile(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.updateMyProfile(token, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: result,
    };
  }

  // ----------------- ADD STAFF -------------------
  @Post('add-staff')
  @UseGuards(DoctorGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: fileStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async addStaff(
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

    let dto: CreateStaffDto;

    // Handle JSON in 'data' field (multipart/form-data pattern)
    if (body.data) {
      try {
        const parsedData = JSON.parse(body.data);
        dto = plainToInstance(CreateStaffDto, parsedData);
      } catch (err) {
        throw new BadRequestException("Invalid JSON format in 'data' field");
      }
    } else {
      // Handle standard body (application/json or direct fields)
      dto = plainToInstance(CreateStaffDto, body);
    }

    // Attach file path if uploaded
    if (file) {
      dto.photo = `/api/v1/uploads/${file.filename}`;
    }

    // Manually validate the DTO since we bypassed global pipe for multipart
    const errors = await validate(dto);
    if (errors.length > 0) {
      // Format errors similar to ValidationPipe
      const formattedErrors = errors.map((err) => ({
        property: err.property,
        constraints: err.constraints,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    const result = await this.doctorService.addStaff(token, dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Staff member added successfully',
      data: result,
    };
  }

  // ----------------- CHECK EMPLOYMENT ID AVAILABILITY -------------------
  @Get('check-employment-id-availability/:employmentId')
  @UseGuards(DoctorGuard)
  async checkEmploymentIdAvailability(
    @Headers('authorization') authorization: string,
    @Param('employmentId') employmentId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.checkEmploymentIdAvailability(token, employmentId);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
    };
  }

  // ----------------- GET ALL STAFFS -------------------
  @Get('staffs')
  @UseGuards(DoctorGuard)
  async getAllStaffs(
    @Headers('authorization') authorization: string,
    @Query() query: GetAllStaffsDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.getAllStaffs(token, query);

    // Extract message if exists (for empty results) and remove from data
    const message = result.message || 'Staffs retrieved successfully';
    const { message: _, ...data } = result; // Remove message from data object

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message,
      data,
    };
  }

  // ----------------- GET SINGLE STAFF -------------------
  @Get('staff/:id')
  @UseGuards(DoctorGuard)
  async getSingleStaff(
    @Headers('authorization') authorization: string,
    @Param('id') staffId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.getSingleStaff(token, staffId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Staff retrieved successfully',
      data: result,
    };
  }

  // ----------------- DELETE STAFF -------------------
  @Delete('staff/delete/:id')
  @UseGuards(DoctorGuard)
  async deleteStaff(
    @Headers('authorization') authorization: string,
    @Param('id') staffId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.deleteStaff(token, staffId);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }
}
