export class WebhookResponseDto {
  reply_text: string;
  suggested_slots?: Array<{
    date: string;
    time: string;
    slotId?: string; // Made optional for time-based booking
  }>;
  action: string; // "ask_slot", "confirm_booking", "provide_info", "transfer_to_assistant", etc.
  booking_id?: string | number;
  is_new_patient?: boolean; 
  success?: boolean;
  data?: any;
  fallback_number?: string; 
}
