import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Param,
  Headers,
  Res,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { DoctorGuard } from 'src/common/guard/doctor.guard';
import { Response } from 'express';
import { AiAgentService } from './ai-agent.service';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { KbQueryDto } from './dto/kb-query.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { TranscriptionSaveDto } from './dto/transcription-save.dto';
import { ElevenLabsPostCallDto } from './dto/elevenlabs-post-call.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { AgentCreateTaskDto } from './dto/agent-create-task.dto';

@Controller('ai-agent')
export class AiAgentController {
  constructor(private aiAgentService: AiAgentService) {}

  // =============== POST-CALL WEBHOOK ===============
  @Post('webhook/post-call')
  // @UseGuards(WebhookAuthGuard) // Optional: decided if auth is needed or if headers will match
  async handlePostCallWebhook(
    @Body() payload: ElevenLabsPostCallDto,
    @Query('doctor_id') doctorId?: string,
  ) {
    return this.aiAgentService.processPostCallWebhook(payload, doctorId);
  }

  // =============== MAIN WEBHOOK ENDPOINT ===============
  @Post('webhook')
  @UseGuards(WebhookAuthGuard)
  async handleWebhook(@Body() payload: WebhookPayloadDto) {
    console.log('=== ELEVENLABS WEBHOOK PAYLOAD ===');
    console.log(JSON.stringify(payload, null, 2));
    console.log('=================================');
    return this.aiAgentService.processWebhook(payload);
  }

  // =============== KNOWLEDGE BASE ===============
  @Post('kb/query')
  @UseGuards(WebhookAuthGuard)
  async queryKnowledgeBase(@Body() dto: KbQueryDto) {
    return this.aiAgentService.queryKnowledgeBase(dto);
  }

  // =============== SLOT MANAGEMENT ===============
  @Post('slots/available')
  @UseGuards(WebhookAuthGuard)
  async getAvailableSlots(@Body() dto: SlotQueryDto) {
    return this.aiAgentService.getAvailableSlots(dto);
  }

  @Post('slots/suggest')
  @UseGuards(WebhookAuthGuard)
  async suggestAlternativeSlots(@Body() dto: SlotQueryDto) {
    return this.aiAgentService.suggestAlternativeSlots(dto);
  }

  // =============== BOOKING MANAGEMENT ===============
  @Post('booking/create')
  @UseGuards(WebhookAuthGuard)
  async createBooking(@Body() dto: any) {
    return this.aiAgentService.createBooking(dto);
  }

  @Post('booking/update')
  @UseGuards(WebhookAuthGuard)
  async updateBooking(
    @Body()
    dto: {
      booking_id: string;
      new_slot_id?: string;
      new_date?: string;
    },
  ) {
    return this.aiAgentService.updateBooking(dto);
  }

  @Post('booking/cancel')
  @UseGuards(WebhookAuthGuard)
  async cancelBooking(@Body() dto: CancelBookingDto) {
    return this.aiAgentService.cancelBooking(dto);
  }

  @Get('booking/:bookingId')
  @UseGuards(WebhookAuthGuard)
  async getBooking(@Param('bookingId') bookingId: string) {
    return this.aiAgentService.getBooking(bookingId);
  }

  // =============== CALL TRANSCRIPTION ===============
  @Post('transcription/save')
  @UseGuards(WebhookAuthGuard)
  async saveTranscription(
    @Body() dto: TranscriptionSaveDto,
    @Headers() headers: any,
  ) {
    console.log('=== SAVE TRANSCRIPTION HEADERS ===');
    console.log(JSON.stringify(headers, null, 2));
    console.log('=== SAVE TRANSCRIPTION PAYLOAD ===');
    console.log(JSON.stringify(dto, null, 2));
    console.log('==================================');
    return this.aiAgentService.saveTranscription(dto);
  }

  // =============== TASK MANAGEMENT ===============
  @Post('task/create')
  @UseGuards(WebhookAuthGuard)
  async createAgentTask(@Body() dto: AgentCreateTaskDto) {
    return this.aiAgentService.createAgentTask(dto);
  }

  @Get('patient/:patientId/history')
  @UseGuards(WebhookAuthGuard)
  async getPatientHistory(@Param('patientId') patientId: string) {
    return this.aiAgentService.getPatientHistory(patientId);
  }
  @Get('audio/:conversationId')
  async getCallAudio(
    @Param('conversationId') conversationId: string,
    @Res() res: Response,
  ) {
    try {
      const audioStream =
        await this.aiAgentService.getCallAudio(conversationId);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `inline; filename="${conversationId}.mp3"`,
      });
      audioStream.pipe(res);
    } catch (error) {
      console.error('Error proxying audio:', error);
      res.status(404).json({ message: 'Audio not found' });
    }
  }
  // =============== CALL REVIEW ===============
  @Post('transcription/:id/review')
  @UseGuards(WebhookAuthGuard)
  async updateCallReviewStatus(
    @Param('id') id: string,
    @Body('isReviewed') isReviewed: boolean,
  ) {
    return this.aiAgentService.updateCallReviewStatus(id, isReviewed);
  }

  @Get('transcription/unreviewed-count')
  @UseGuards(DoctorGuard)
  async getUnreviewedCallCount(@Req() req: any) {
    const doctorId = req.doctor.id;
    return this.aiAgentService.getUnreviewedCallCount(doctorId);
  }
}
