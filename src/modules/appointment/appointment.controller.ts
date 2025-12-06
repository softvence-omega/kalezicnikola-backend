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
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GetAllAppointmentsDto } from './dto/get-all-appointments.dto';

@Controller('appointment')
export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  // ----------------- CREATE APPOINTMENT -------------------
  @Post('create')
  @UseGuards(DoctorGuard)
  async createAppointment(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.appointmentService.createAppointment(token, dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Appointment created successfully',
      data: result,
    };
  }

  // ----------------- GET ALL APPOINTMENTS -------------------
  @Get('all')
  @UseGuards(DoctorGuard)
  async getAllAppointments(
    @Headers('authorization') authorization: string,
    @Query() query: GetAllAppointmentsDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.appointmentService.getAllAppointments(
      token,
      query,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Appointments retrieved successfully',
      data: result,
    };
  }

  // ----------------- GET TODAY'S Scheduled APPOINTMENTS -------------------
  @Get('scheduled-today')
  @UseGuards(DoctorGuard)
  async getTodayAppointments(
    @Headers('authorization') authorization: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.appointmentService.getTodayAppointments(token);

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: result.message,
      data: result.data,
    };
  }

  // ----------------- GET SINGLE APPOINTMENT -------------------
  @Get(':id')
  @UseGuards(DoctorGuard)
  async getSingleAppointment(
    @Headers('authorization') authorization: string,
    @Param('id') appointmentId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.appointmentService.getSingleAppointment(
      token,
      appointmentId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Appointment retrieved successfully',
      data: result,
    };
  }

  // ----------------- UPDATE APPOINTMENT -------------------
  @Patch('update/:id')
  @UseGuards(DoctorGuard)
  async updateAppointment(
    @Headers('authorization') authorization: string,
    @Param('id') appointmentId: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.appointmentService.updateAppointment(
      token,
      appointmentId,
      dto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Appointment updated successfully',
      data: result,
    };
  }

  // ----------------- DELETE APPOINTMENT -------------------
  @Delete('delete/:id')
  @UseGuards(DoctorGuard)
  async deleteAppointment(
    @Headers('authorization') authorization: string,
    @Param('id') appointmentId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.appointmentService.deleteAppointment(
      token,
      appointmentId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }
}
