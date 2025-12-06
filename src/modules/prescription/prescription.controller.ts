import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { GetAllPrescriptionsDto } from './dto/get-all-prescriptions.dto';

@Controller('prescription')
export class PrescriptionController {
  constructor(private prescriptionService: PrescriptionService) {}

  // ----------------- CREATE PRESCRIPTION -------------------
  @Post('create')
  async createPrescription(
    @Headers('authorization') authorization: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const accessToken = authorization.replace('Bearer ', '');

    const result = await this.prescriptionService.createPrescription(
      accessToken,
      dto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Prescription created successfully',
      data: result,
    };
  }

  // ----------------- GET ALL PRESCRIPTIONS -------------------
  @Get('all')
  async getAllPrescriptions(
    @Headers('authorization') authorization: string,
    @Query() query: GetAllPrescriptionsDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const accessToken = authorization.replace('Bearer ', '');

    const result = await this.prescriptionService.getAllPrescriptions(
      accessToken,
      query,
    );

    return {
      statusCode: HttpStatus.OK,
      message: result.message || 'Prescriptions retrieved successfully',
      data: {
        pagination: result.pagination,
        prescriptions: result.prescriptions,
      },
    };
  }

  // ----------------- GET SINGLE PRESCRIPTION -------------------
  @Get(':id')
  async getSinglePrescription(
    @Headers('authorization') authorization: string,
    @Param('id') prescriptionId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const accessToken = authorization.replace('Bearer ', '');

    const result = await this.prescriptionService.getSinglePrescription(
      accessToken,
      prescriptionId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Prescription retrieved successfully',
      data: result,
    };
  }

  // ----------------- UPDATE PRESCRIPTION -------------------
  @Patch('update/:id')
  async updatePrescription(
    @Headers('authorization') authorization: string,
    @Param('id') prescriptionId: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const accessToken = authorization.replace('Bearer ', '');

    const result = await this.prescriptionService.updatePrescription(
      accessToken,
      prescriptionId,
      dto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Prescription updated successfully',
      data: result,
    };
  }

  // ----------------- DELETE PRESCRIPTION -------------------
  @Delete('delete/:id')
  async deletePrescription(
    @Headers('authorization') authorization: string,
    @Param('id') prescriptionId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const accessToken = authorization.replace('Bearer ', '');

    const result = await this.prescriptionService.deletePrescription(
      accessToken,
      prescriptionId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }
}
