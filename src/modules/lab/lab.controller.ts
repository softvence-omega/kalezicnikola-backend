import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LabService } from './lab.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { GetAllLabsDto } from './dto/get-all-labs.dto';
import { UpdateLabDto } from './dto/update-lab.dto';

@Controller('lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  // ----------------- CREATE LAB -------------------
  @Post('create')
  async createLab(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateLabDto,
  ) {
    const accessToken = authorization.split(' ')[1];
    const data = await this.labService.createLab(accessToken, dto);

    return {
      statusCode: 201,
      message: 'Lab created successfully',
      data,
    };
  }

  // ----------------- GET ALL LABS -------------------
  @Get('all')
  async getAllLabs(
    @Headers('authorization') authorization: string,
    @Query() query: GetAllLabsDto,
  ) {
    const accessToken = authorization.split(' ')[1];
    const data = await this.labService.getAllLabs(accessToken, query);

    return {
      statusCode: 200,
      message: 'Labs fetched successfully',
      data,
    };
  }

  // ----------------- GET SINGLE LAB -------------------
  @Get(':id')
  async getSingleLab(
    @Headers('authorization') authorization: string,
    @Param('id') labId: string,
  ) {
    const accessToken = authorization.split(' ')[1];
    const data = await this.labService.getSingleLab(accessToken, labId);

    return {
      statusCode: 200,
      message: 'Lab fetched successfully',
      data,
    };
  }

  // ----------------- UPDATE LAB -------------------
  @Patch('update/:id')
  async updateLab(
    @Headers('authorization') authorization: string,
    @Param('id') labId: string,
    @Body() dto: UpdateLabDto,
  ) {
    const accessToken = authorization.split(' ')[1];
    const data = await this.labService.updateLab(accessToken, labId, dto);

    return {
      statusCode: 200,
      message: 'Lab updated successfully',
      data,
    };
  }

  // ----------------- DELETE LAB -------------------
  @Delete('delete/:id')
  async deleteLab(
    @Headers('authorization') authorization: string,
    @Param('id') labId: string,
  ) {
    const accessToken = authorization.split(' ')[1];
    const data = await this.labService.deleteLab(accessToken, labId);

    return {
      statusCode: 200,
      message: 'Lab deleted successfully',
      data,
    };
  }
}
