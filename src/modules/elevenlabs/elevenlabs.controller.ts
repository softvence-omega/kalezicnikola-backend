import { Controller, Post, Body, Get, Param, Delete, Patch, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminOrDoctorGuard } from 'src/common/guard/admin-or-doctor.guard';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { BadRequestException } from '@nestjs/common';

@ApiTags('elevenlabs')
@Controller('elevenlabs')
export class ElevenLabsController {
  constructor(private readonly elevenLabsService: ElevenLabsService) {}

  @Post('create-agent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create ElevenLabs agent for a doctor' })
  @ApiResponse({ status: 200, description: 'Agent created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createAgent(@Body() createAgentDto: { doctorId: string }) {
    try {
      // Get doctor details
      const doctor = await this.elevenLabsService['prisma'].doctor.findUnique({
        where: { id: createAgentDto.doctorId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          specialities: true,
          experience: true,
        }
      });

      if (!doctor) {
        return {
          statusCode: 404,
          success: false,
          message: 'Doctor not found',
        };
      }

      const agent = await this.elevenLabsService.createAgentForDoctor(doctor);

      return {
        statusCode: 200,
        success: true,
        message: 'Agent created successfully',
        data: {
          agentId: agent.agent_id,
          doctorId: doctor.id,
          doctorName: `${doctor.firstName} ${doctor.lastName}`,
        }
      };
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
        message: 'Failed to create agent',
        error: error.message,
      };
    }
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Get agent details' })
  @ApiResponse({ status: 200, description: 'Agent details retrieved successfully' })
  async getAgent(@Param('agentId') agentId: string) {
    try {
      const agent = await this.elevenLabsService.getAgent(agentId);
      return {
        statusCode: 200,
        success: true,
        message: 'Agent retrieved successfully',
        data: agent,
      };
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
        message: 'Failed to retrieve agent',
        error: error.message,
      };
    }
  }

  @Delete('agent/:agentId')
  @ApiOperation({ summary: 'Delete agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  async deleteAgent(@Param('agentId') agentId: string) {
    try {
      await this.elevenLabsService.deleteAgent(agentId);
      return {
        statusCode: 200,
        success: true,
        message: 'Agent deleted successfully',
      };
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
        message: 'Failed to delete agent',
        error: error.message,
      };
    }
  }

  @Post('doctor/:doctorId/recreate-agent')
  @ApiOperation({ summary: 'Recreate agent for a doctor (delete and create new)' })
  @ApiResponse({ status: 200, description: 'Agent recreated successfully' })
  async recreateAgent(@Param('doctorId') doctorId: string) {
    try {
      // Get current agent ID
      const doctor = await this.elevenLabsService['prisma'].doctor.findUnique({
        where: { id: doctorId },
        select: { elevenlabsAgentId: true }
      });

      // Delete existing agent if it exists
      if (doctor?.elevenlabsAgentId) {
        try {
          await this.elevenLabsService.deleteAgent(doctor.elevenlabsAgentId);
        } catch (error) {
          console.warn(`Failed to delete existing agent: ${error.message}`);
        }
      }

      // Get full doctor details and create new agent
      const fullDoctor = await this.elevenLabsService['prisma'].doctor.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          specialities: true,
          experience: true,
        }
      });

      if (!fullDoctor) {
        return {
          statusCode: 404,
          success: false,
          message: 'Doctor not found',
        };
      }

      const agent = await this.elevenLabsService.createAgentForDoctor(fullDoctor);

      return {
        statusCode: 200,
        success: true,
        message: 'Agent recreated successfully',
        data: {
          agentId: agent.agent_id,
          doctorId: fullDoctor.id,
          doctorName: `${fullDoctor.firstName} ${fullDoctor.lastName}`,
        }
      };
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
        message: 'Failed to recreate agent',
        error: error.message,
      };
    }
  }

  // =============== DOCTOR AGENT MANAGEMENT ===============

  @Get('doctor/:doctorId')
  @UseGuards(AdminOrDoctorGuard)
  @ApiOperation({ summary: 'Get doctor agent details' })
  @ApiResponse({ status: 200, description: 'Agent details retrieved successfully' })
  async getDoctorAgent(
    @Param('doctorId') doctorId: string,
    @Req() req: any,
  ) {
    // Doctors can only access their own agent, admins can access any
    if (req.role === 'doctor' && req.user.id !== doctorId) {
      throw new BadRequestException('You can only access your own agent');
    }
    try {
      const agent = await this.elevenLabsService.getDoctorAgent(doctorId);
      return {
        statusCode: 200,
        success: true,
        message: 'Agent retrieved successfully',
        data: agent,
      };
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
        message: 'Failed to retrieve agent',
        error: error.message,
      };
    }
  }

  @Patch('doctor/:doctorId')
  @UseGuards(AdminOrDoctorGuard)
  @ApiOperation({ summary: 'Update doctor agent configuration' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  async updateDoctorAgent(
    @Param('doctorId') doctorId: string,
    @Body() updates: any,
    @Req() req: any,
  ) {
    // Doctors can only update their own agent, admins can update any
    if (req.role === 'doctor' && req.user.id !== doctorId) {
      throw new BadRequestException('You can only update your own agent');
    }
    try {
      const agent = await this.elevenLabsService.updateDoctorAgent(doctorId, updates);
      return {
        statusCode: 200,
        success: true,
        message: 'Agent updated successfully',
        data: agent,
      };
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
        message: 'Failed to update agent',
        error: error.message,
      };
    }
  }

  @Post('doctor/:doctorId/delete')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete doctor agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  async deleteDoctorAgent(@Param('doctorId') doctorId: string) {
    try {
      const result = await this.elevenLabsService.deleteDoctorAgent(doctorId);
      return {
        statusCode: 200,
        success: true,
        message: 'Agent deleted successfully',
        data: result,
      };
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
        message: 'Failed to delete agent',
        error: error.message,
      };
    }
  }

  @Patch('doctor/:doctorId/activation')
  @UseGuards(AdminOrDoctorGuard)
  @ApiOperation({ summary: 'Toggle agent activation status' })
  @ApiResponse({ status: 200, description: 'Agent status updated successfully' })
  async toggleAgentActivation(
    @Param('doctorId') doctorId: string,
    @Body() body: { isActive: boolean },
    @Req() req: any,
  ) {
    const activeState = String(body.isActive) === 'true';
    // Doctors can only toggle their own agent, admins can toggle any
    if (req.role === 'doctor' && req.user.id !== doctorId) {
      throw new BadRequestException('You can only manage your own agent status');
    }

    const changer = {
      id: req.user.id,
      role: req.role as 'admin' | 'doctor',
    };

    try {
      const result = await this.elevenLabsService.toggleAgentActiveness(doctorId, activeState, changer);
      return {
        statusCode: 200,
        success: true,
        message: 'Agent status updated successfully',
        data: result,
      };
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
        message: 'Failed to update agent status',
        error: error.message,
      };
    }
  }
}
