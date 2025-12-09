# ElevenLabs Tool Configuration for Call Transcription

## Tool Name
`SaveCallTranscription`

## Description
Saves the complete call transcription, patient information, and conversation summary to the database. This tool MUST be called at the end of every conversation.

## HTTP Method
`POST`

## Endpoint URL
```
https://your-domain.com/api/v1/ai-agent/transcription/save
```

## Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_WEBHOOK_AUTH_TOKEN"
}
```

## Request Body Schema (JSON)
```json
{
  "type": "object",
  "properties": {
    "doctor_id": {
      "type": "string",
      "description": "The doctor's unique ID (get from conversation context)"
    },
    "phone_number": {
      "type": "string",
      "description": "Patient's phone number provided during the call"
    },
    "transcription": {
      "type": "string",
      "description": "Complete conversation transcript with all messages"
    },
    "summary": {
      "type": "string",
      "description": "Brief summary of the call - what happened, what was discussed, outcome"
    },
    "intent": {
      "type": "string",
      "enum": ["BOOK_APPOINTMENT", "CHECK_AVAILABILITY", "INQUIRY", "RESCHEDULE", "CANCEL"],
      "description": "Main intent/purpose of the call"
    },
    "sentiment": {
      "type": "string",
      "enum": ["POSITIVE", "NEUTRAL", "NEGATIVE"],
      "description": "Overall patient sentiment during the call"
    },
    "patient_id": {
      "type": "string",
      "description": "Patient ID if known from previous calls (optional)"
    },
    "appointment_id": {
      "type": "string",
      "description": "Appointment ID if booking was made during call (optional)"
    },
    "duration": {
      "type": "integer",
      "description": "Call duration in seconds (optional)"
    },
    "call_started_at": {
      "type": "string",
      "format": "date-time",
      "description": "When the call started (ISO 8601 format, optional)"
    },
    "call_ended_at": {
      "type": "string",
      "format": "date-time",
      "description": "When the call ended (ISO 8601 format, optional)"
    }
  },
  "required": ["doctor_id", "phone_number", "transcription", "summary", "intent", "sentiment"]
}
```

## Example Request
```json
{
  "doctor_id": "cdc8e974-8a3c-4e95-b46d-53394e8b5e31",
  "phone_number": "0174246031",
  "transcription": "Hello, can you hear me? And, um, I want to schedule an appointment...",
  "summary": "The user, Rocky Hawk, contacted the agent to schedule an appointment. After confirming contact information, the user requested an appointment for the next day. The agent checked availability and offered slots at 10:00, 11:00, and 12:00. The user booked the 11:00 slot, and the agent confirmed the booking.",
  "intent": "BOOK_APPOINTMENT",
  "sentiment": "POSITIVE",
  "appointment_id": "3b6f2366-5b89-41c0-b8db-a6d0c1d8926c"
}
```

## Expected Response
```json
{
  "success": true,
  "transcription_id": "5abf030a-ce0b-47f0-8803-efe4ff88c9b2",
  "patient_id": "2de983b0-2de4-4206-8cd4-2e9245554f8d",
  "appointment_id": "3b6f2366-5b89-41c0-b8db-a6d0c1d8926c",
  "message": "Call transcription saved successfully"
}
```

## When to Call This Tool
The AI agent should call this tool:
- **At the end of EVERY call** (successful or not)
- **Before saying goodbye** to the patient
- **After any booking/cancellation is confirmed**

## Updated System Prompt Addition
```
CRITICAL - END OF CALL PROCEDURE:
Before ending ANY conversation, you MUST call SaveCallTranscription with:
1. doctor_id: [from context]
2. phone_number: [patient's phone if provided, otherwise "unknown"]
3. transcription: [complete conversation - every message exchanged]
4. summary: [2-3 sentence summary of what happened]
5. intent: [BOOK_APPOINTMENT, INQUIRY, CHECK_AVAILABILITY, RESCHEDULE, or CANCEL]
6. sentiment: [POSITIVE if friendly, NEUTRAL if neutral, NEGATIVE if frustrated]
7. appointment_id: [if booking was made, include the booking_id from the response]

This is MANDATORY for every call - no exceptions.
```

---

## How to Configure in ElevenLabs

1. Go to your ElevenLabs agent dashboard
2. Navigate to **Tools** or **Custom Tools** section
3. Click **Add Custom Tool**
4. Fill in the details above
5. **Enable** the tool for your agent
6. Test with a call

---

## Troubleshooting

**If calls still aren't being saved:**

1. Check ElevenLabs logs to see if the tool is being called
2. Verify the webhook URL is correct and accessible
3. Check your backend logs for incoming requests to `/ai-agent/transcription/save`
4. Ensure the Authorization header matches your `WebhookAuthGuard` configuration
5. Test the endpoint manually with Postman/curl

**Manual Test:**
```bash
curl -X POST https://your-domain.com/api/v1/ai-agent/transcription/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "doctor_id": "your-doctor-id",
    "phone_number": "0174246031",
    "transcription": "Test call",
    "summary": "Test summary",
    "intent": "INQUIRY",
    "sentiment": "POSITIVE"
  }'
```
