import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetAllTasksDto } from './dto/get-all-tasks.dto';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  // ----------------- CREATE TASK -------------------
  async createTask(accessToken: string, dto: CreateTaskDto) {
    // Verify doctor session
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (dto.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
      });

      if (!patient) {
        throw new NotFoundException('Patient not found');
      }
    }

    // Create task
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        time: dto.time,
        patientId: dto.patientId,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return { task };
  }

  // ----------------- GET ALL TASKS -------------------
  async getAllTasks(accessToken: string, query: GetAllTasksDto) {
    // Verify doctor session
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // Search (title or description)
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filters
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.patientId) where.patientId = query.patientId;

    // Date range filter
    if (query.dueDateFrom || query.dueDateTo) {
      where.dueDate = {};
      if (query.dueDateFrom) where.dueDate.gte = new Date(query.dueDateFrom);
      if (query.dueDateTo) where.dueDate.lte = new Date(query.dueDateTo);
    }

    // Execute query
    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      pagination: {
        total,
        page,
        limit,
        totalPages,
        previous: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
      },
      tasks,
      
    };
  }

  // ----------------- GET SINGLE TASK -------------------
  async getTaskById(accessToken: string, taskId: string) {
    // Verify doctor session
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
      },
    });

    if (!task || task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    return { task };
  }

  // ----------------- UPDATE TASK -------------------
  async updateTask(accessToken: string, taskId: string, dto: UpdateTaskDto) {
    // Verify doctor session
    const session = await this.prisma.session.findUnique({
      where: { accessToken },
      include: { doctor: true },
    });

    if (!session || !session.doctorId || !session.doctor) {
      throw new UnauthorizedException('Invalid session or doctor not found');
    }

    const doctorId = session.doctorId;
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    const existingTask = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { patient: true },
    });

    if (!existingTask || existingTask.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    // If updating patientId, verify new patient
    if (dto.patientId && dto.patientId !== existingTask.patientId) {
      const newPatient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
      });

      if (!newPatient) {
        throw new NotFoundException('New patient not found');
      }
    }

    // Update task
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        time: dto.time,
        patientId: dto.patientId,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return { task: updatedTask };
  }

// ----------------- DELETE TASK (HARD DELETE) -------------------
async deleteTask(accessToken: string, taskId: string) {
  // Verify doctor session
  const session = await this.prisma.session.findUnique({
    where: { accessToken },
    include: { doctor: true },
  });

  if (!session || !session.doctorId || !session.doctor) {
    throw new UnauthorizedException('Invalid session or doctor not found');
  }

  // Check if task exists
  const existingTask = await this.prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!existingTask) {
    throw new NotFoundException('Task not found');
  }

  // HARD DELETE (permanent)
  await this.prisma.task.delete({
    where: { id: taskId },
  });

  return { message: 'Task deleted successfully' };
}

}
