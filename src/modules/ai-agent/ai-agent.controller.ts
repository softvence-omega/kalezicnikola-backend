import { Controller, Post, Get, Body, Query, UseGuards, Param } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { KbQueryDto } from './dto/kb-query.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { TranscriptionSaveDto } from './dto/transcription-save.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Controller('ai-agent')
export class AiAgentController {
  constructor(private aiAgentService: AiAgentService) {}

  // =============== MAIN WEBHOOK ENDPOINT ===============
  @Post('webhook')
  @UseGuards(WebhookAuthGuard)
  async handleWebhook(@Body() payload: WebhookPayloadDto) {
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
  async updateBooking(@Body() dto: { booking_id: string; new_slot_id?: string; new_date?: string }) {
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
  async saveTranscription(@Body() dto: TranscriptionSaveDto) {
    return this.aiAgentService.saveTranscription(dto);
  }

  @Get('patient/:patientId/history')
  @UseGuards(WebhookAuthGuard)
  async getPatientHistory(@Param('patientId') patientId: string) {
    return this.aiAgentService.getPatientHistory(patientId);
  }
}
