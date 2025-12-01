import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { UpdateDoctorProfileDto } from './dto/update-profile.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CheckEmploymentIdDto } from './dto/check-employment-id.dto';

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
  async addStaff(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateStaffDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
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
  async getAllStaffs(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.doctorService.getAllStaffs(token);

    return {
      statusCode: HttpStatus.OK,
      message: 'Staffs retrieved successfully',
      data: result,
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
