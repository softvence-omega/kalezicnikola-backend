export class WebhookResponseDto {
  reply_text: string;
  suggested_slots?: Array<{
    date: string;
    time: string;
    slotId: string;
  }>;
  action: string; // "ask_slot", "confirm_booking", "provide_info", "transfer_to_assistant", etc.
  booking_id?: string;
  is_new_patient?: boolean; // Indicates if patient was newly registered
  success?: boolean;
  data?: any;
  fallback_number?: string; // Physical assistant number for transfer
}
