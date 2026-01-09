import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GetDoctorsDto } from './dto/get-doctors.dto';
import { GetDoctorSubscriptionsDto } from './dto/get-doctor-subscriptions.dto';
import { AdminGuard } from 'src/common/guard/admin.guard';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('doctors')
  async getAllDoctors(@Query() query: GetDoctorsDto) {
    return this.adminService.getAllDoctors(query);
  }

  @Get('doctor-subscriptions/summary')
  async getDoctorSubscriptionSummary() {
    return {
      statusCode: 200,
      message: 'Doctor subscription summary retrieved successfully',
      data: await this.adminService.getDoctorSubscriptionSummary(),
    };
  }

  @Get('doctor-subscriptions')
  async getDoctorSubscriptions(@Query() query: GetDoctorSubscriptionsDto) {
    const result = await this.adminService.getDoctorSubscriptions(query);
    
    const message = result.message || 'Doctor subscriptions retrieved successfully';
    const { message: _, ...data } = result;

    return {
      statusCode: 200,
      success: true,
      message,
      data,
    };
  }

  @Get('doctor-subscriptions/:doctorId')
  async getDoctorSubscriptionDetails(@Param('doctorId') doctorId: string) {
    return await this.adminService.getDoctorSubscriptionDetails(doctorId);
  }
}
