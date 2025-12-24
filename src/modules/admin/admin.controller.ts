import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GetDoctorsDto } from './dto/get-doctors.dto';
import { AdminGuard } from 'src/common/guard/admin.guard';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('doctors')
  async getAllDoctors(@Query() query: GetDoctorsDto) {
    return this.adminService.getAllDoctors(query);
  }
}
