import { Controller, Get, Query, UseGuards, Param, Delete, Put, Body, Patch, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileStorage, imageFileFilter } from 'src/utils/file-upload.util';
import { deleteFileFromUploads } from 'src/utils/file-delete.util';
import { AdminService } from './admin.service';
import { GetDoctorsDto } from './dto/get-doctors.dto';
import { GetDoctorSubscriptionsDto } from './dto/get-doctor-subscriptions.dto';
import { GetDashboardStatsDto } from './dto/get-dashboard-stats.dto';
import { GetRevenueGraphDto } from './dto/get-revenue-graph.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('doctors')
  async getAllDoctors(@Query() query: GetDoctorsDto) {
    return this.adminService.getAllDoctors(query);
  }

  @Get('users/all')
  async getAllUsers(@Query() query: GetUsersDto) {
    return this.adminService.getAllUsers(query);
  }

  @Delete('users/delete/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
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

  @Get('dashboard')
  async getDashboardStats(@Query() query: GetDashboardStatsDto) {
    return {
      statusCode: 200,
      message: 'Dashboard stats retrieved successfully',
      data: await this.adminService.getDashboardStats(query),
    };
  }

  @Get('dashboard/revenue-graph')
  async getRevenueGraph(@Query() query: GetRevenueGraphDto) {
    return {
      statusCode: 200,
      message: 'Revenue graph retrieved successfully',
      data: await this.adminService.getRevenueGraph(query),
    };
  }

  @Get('profile')
  async getMyProfile(@CurrentUser('id') adminId: string) {
    return this.adminService.getMyProfile(adminId);
  }

  @Patch('profile/edit')
  @UseInterceptors(FileInterceptor('photo', { storage: fileStorage, fileFilter: imageFileFilter }))
  async updateMyProfile(
    @CurrentUser('id') adminId: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      let data = body;

      // Parse the 'data' field if it's a string (common for multipart/form-data)
      if (typeof body.data === 'string') {
        try {
          data = JSON.parse(body.data);
          console.log('[AdminController] Parsed body.data:', data);
        } catch (e) {
          console.error('[AdminController] Failed to parse data string:', e);
          // Fallback to body if parsing fails
        }
      }

      // Map fields from either data or body
      const dto: any = {
        firstName: data.firstName || body.firstName || undefined,
        lastName: data.lastName || body.lastName || undefined,
        email: data.email || body.email || undefined,
        phone: data.phone || body.phone || undefined,
        dob: data.dob || body.dob || undefined,
        address: data.address || body.address || undefined,
        gender: data.gender || body.gender || undefined,
        photo: data.photo !== undefined ? data.photo : (body.photo || undefined),
      };

      // Remove empty string values
      Object.keys(dto).forEach(key => {
        if (dto[key] === '') {
          dto[key] = undefined;
        }
      });

      console.log('[AdminController] Parsed DTO:', dto);

      // Attach file path if uploaded
      if (file) {
        dto.photo = `/api/v1/uploads/${file.filename}`;
      }

      return this.adminService.updateMyProfile(adminId, dto, file);
    } catch (error) {
      // Delete uploaded file if processing fails
      if (file) {
        await deleteFileFromUploads(`/api/v1/uploads/${file.filename}`);
      }
      throw error;
    }
  }
}
