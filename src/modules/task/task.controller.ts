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
import { TaskService } from './task.service';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetAllTasksDto } from './dto/get-all-tasks.dto';

@Controller('doctor/task')
export class TaskController {
  constructor(private taskService: TaskService) {}

  // ----------------- CREATE TASK -------------------
  @Post('create')
  @UseGuards(DoctorGuard)
  async createTask(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateTaskDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.taskService.createTask(token, dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Task created successfully',
      data: result,
    };
  }

  // ----------------- GET ALL TASKS -------------------
  @Get('all')
  @UseGuards(DoctorGuard)
  async getAllTasks(
    @Headers('authorization') authorization: string,
    @Query() query: GetAllTasksDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.taskService.getAllTasks(token, query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Tasks retrieved successfully',
      data: result,
    };
  }

  // ----------------- GET SINGLE TASK -------------------
  @Get(':id')
  @UseGuards(DoctorGuard)
  async getTaskById(
    @Headers('authorization') authorization: string,
    @Param('id') taskId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.taskService.getTaskById(token, taskId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Task retrieved successfully',
      data: result,
    };
  }

  // ----------------- UPDATE TASK -------------------
  @Patch('update/:id')
  @UseGuards(DoctorGuard)
  async updateTask(
    @Headers('authorization') authorization: string,
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.taskService.updateTask(token, taskId, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Task updated successfully',
      data: result,
    };
  }

  // ----------------- DELETE TASK -------------------
  @Delete('delete/:id')
  @UseGuards(DoctorGuard)
  async deleteTask(
    @Headers('authorization') authorization: string,
    @Param('id') taskId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const result = await this.taskService.deleteTask(token, taskId);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }
}
