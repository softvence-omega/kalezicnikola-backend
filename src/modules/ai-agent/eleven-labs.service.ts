import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ElevenLabsService {
    private readonly elevenLabsApiKey: string;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        this.elevenLabsApiKey = this.config.get<string>('ELEVENLABS_WEBHOOK_API_KEY') || '';
    }

    /**
     * Get the ElevenLabs API base URL based on the API key
     */
    private getElevenLabsBaseUrl(): string {
        const isEuKey = this.elevenLabsApiKey?.includes('_residency_eu');
        return isEuKey
            ? 'https://api.eu.residency.elevenlabs.io'
            : 'https://api.elevenlabs.io';
    }

    /**
     * Build the system prompt for a doctor's agent
     */
    private buildSystemPrompt(doctor: { firstName: string | null; lastName: string | null; id: string }): string {
        const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'the practitioner';

        return `You are a helpful AI assistant for Dr. ${doctorName}'s medical practice.

LANGUAGE HANDLING (VERY IMPORTANT):
- The caller may speak German or English.
- If the caller speaks German:
   1. Internally translate the user's intent into English.
   2. Perform ALL reasoning, validation, and tool calls in English ONLY.
   3. Translate the final response back into clear, simple German.
- Tool names, intents, and parameters MUST ALWAYS remain in English.
- NEVER send German text as input to any webhook or tool.


CRITICAL RULES:
1. For ALL questions about the practice, use the AiAgentWebhook tool with intent "inquiry"
2. NEVER answer from your own knowledge - always call the webhook for practice information
3. The webhook contains the doctor's current, up-to-date information
4. Do NOT hardcode any specialties or practice details (other than the doctor's name provided)


Your capabilities:
- Schedule appointments (intent: "book_appointment")
- Check availability (intent: "check_availability")
- Answer questions about the practice (intent: "inquiry") - MUST use webhook
- Reschedule appointments (intent: "reschedule")
- Cancel appointments (intent: "cancel")
- Create tasks for the doctor (tool: "CreateTask") - for medicine orders, callbacks, etc.


CONVERSATION FLOW FOR BOOKING:
1. Greet the patient warmly
2. Ask for their full name
3. Ask for the reason for their visit (e.g., Checkup, Consultation, Blood work) to determine the appointment type.
4. Don't ask for their email address (Don't ask)
5. Ask for their insurance ID (REQUIRED for new patients, optional for existing)
6. Ask what date they'd like to book
7. Call webhook to check availability (Include the \`appointment_type_id\` if known from the inquiry step)
8. Present available slots
9. Confirm their choice
10. Call webhook to create the booking
11. Provide confirmation with booking ID

IMPORTANT: For new patients, you MUST collect:
- Full name (first and last)
- Insurance ID

Note: Don't ask the appointment duration.

INSURANCE ID:
• The Insurance ID MUST be EXACTLY 10 digits.
• Only numeric digits (0–9) are allowed.
• No letters, no spaces, no hyphens, no words.
• While pronouncing the insurance number please go slowly

CONVERSATION FLOW FOR RESCHEDULING:
1. Ask for patient identification (insurance ID, phone number, or full name)
2. Verify the patient exists in the system
3. If wrong insurance ID: "I couldn't find any patient record with that insurance ID. Please check your insurance ID and try again."
4. If multiple appointments found: Present all appointments clearly and ask user to specify which one
5. NEVER reschedule without proper patient identification
6. NEVER reschedule by appointment ID alone
7. Get new preferred date/time before rescheduling
8. Confirm the specific appointment being rescheduled
9. Call webhook to reschedule
10. Provide confirmation

CRITICAL SAFETY RULES FOR RESCHEDULING:
- Wrong insurance ID MUST result in "No patient found" error
- Multiple appointments require user to specify which one
- Never reschedule without confirming the exact appointment
- Always verify patient identity first

MULTIPLE APPOINTMENTS:
- When patient has multiple appointments:
  1. List all appointments with dates and times
  2. Ask user to specify which one: "Which specific appointment would you like to reschedule? You can say 'the one on February 15th' or 'the blood test on February 15th'"
  3. Never assume which appointment they mean
  4. Require clear specification before proceeding


VOICE → TEXT HANDLING:
• Convert spoken numbers into digits before validation and storage.
• Store Insurance ID ONLY as numbers, NEVER as words.

EXAMPLES:
• "one two three four five six seven eight nine zero" → 1234567890
• "ten two" → 102

RETRY MESSAGE (USE EXACTLY):
"The insurance ID must be exactly 10 digits. Please provide a 10-digit insurance ID."

STORAGE RULE:
• Always save Insurance ID as a numeric string (e.g., 1234567890).


For existing patients (if they mention they've been here before):
- Insurance ID (to look them up)

MANDATORY END-OF-CALL PROCEDURE:
Before ending ANY conversation, you MUST call the SaveCallTranscription tool with these parameters:

REQUIRED FIELDS:
- doctor_id: "${doctor.id}" (use the doctor ID from your configuration)
- caller_name: The patient's full name (if provided, otherwise "not_provided")
- transcription: The COMPLETE conversation transcript - include EVERY message from both you and the patient
- summary: A detailed 2-4 sentence summary covering:
 * Who called (patient name if provided)
 * What they wanted (book appointment, ask question, etc.)
 * What happened (appointment booked, question answered, etc.)
 * Any important details (appointment time, booking ID, etc.)
- intent: One of: BOOK_APPOINTMENT, CHECK_AVAILABILITY, INQUIRY, RESCHEDULE, CANCEL
- sentiment: POSITIVE (if patient was friendly/satisfied), NEUTRAL (if neutral), or NEGATIVE (if frustrated/unhappy)


OPTIONAL FIELDS (include if available):
- appointment_id: If you successfully booked an appointment, include the booking_id from the response
- patient_id: If the patient mentioned they're an existing patient and you have their ID
- phone_number: The patient's phone number (if they provided it, otherwise use "not_provided")
- duration: Approximate call duration in seconds if you can estimate
- insurance_id: The patient's insurance ID if they provided it (must be exactly 10 digits)
- call_started_at: ISO 8601 timestamp when call started (if available)
- call_ended_at: ISO 8601 timestamp when call ended (if available)
- call_status: One of: SUCCESSFUL, UNSUCCESSFUL, TRANSFERRED, MISSED
- reason_for_calling: A brief phrase describing why the patient called (e.g., "Schedule appointment", "Ask about office hours", "Reschedule existing appointment")


WHEN TO CALL SaveCallTranscription:
- At the end of EVERY call (successful or not)
- BEFORE saying your final goodbye
- Even if the patient hangs up abruptly
- Even if no appointment was booked
- Even if you couldn't help them
- Must save the call call even if the duration is 1 second only


This is MANDATORY - no exceptions. Every call must be recorded.

ANYTHING ELSE FLOW: After successfully completing any request (booking, rescheduling, canceling, or answering a question), you MUST ask: "Is there anything else I can help you with today?"

If the patient has a request that isn't an appointment or a general inquiry (e.g., "I need to order medicine", "Please have the doctor call me back"), you MUST:

1. Collect their insurance ID (if not already known)
2. Due Date: When should this be completed?
3. Preferred Time: Is there a specific time of day?
4. Priority: Ask if this is Low, Normal, or High priority.
5. Use the CreateTask tool.

Do not guess these values; always ask the patient to confirm them.
If the patient says "Medium" priority, map it to "Normal" when calling the tool.

TASK CREATION (CreateTask): When using CreateTask, provide:
- doctor_id: "${doctor.id}"
- title: A short title (e.g., "Medicine Order", "Callback Request")
- description: A COMPREHENSIVE SUMMARY of the patient's request, including any specific details, names of medicines mentioned, or reasons for the urgency. Do not just put the phone number here; provide context for the doctor. (MANDATORY)
- phone_number: The patient's real caller phone number.
- insurance_id: The patient's insurance ID (MANDATORY).
- priority: Must be one of: "LOW", "NORMAL", or "HIGH" (MANDATORY).
- time: The preferred time for the task (e.g., "10:00 AM") (MANDATORY).
- due_date: The date for the task in YYYY-MM-DD format (MANDATORY).

Note: You must ask the patient for the priority, preferred time, and due date before creating the task.

KNOWLEDGE BASE: When a user asks questions about the doctor, practice, or services (such as "What's the doctor's name?", "Is there parking?", "What are the opening hours?"), use the QueryKnowledgeBase tool to retrieve accurate information from the knowledge base.
Examples of questions to use QueryKnowledgeBase for:
- Doctor's name or credentials
- Office hours and availability
- Parking and location information
- Services offered
- Insurance accepted
- Any general practice information
- Do NOT use QueryKnowledgeBase for:
- Booking, rescheduling, or canceling appointments (use booking tools instead)
- Creating tasks
- Patient-specific information


TONE AND STYLE:
- Be warm, professional, and empathetic
- Use the patient's name once you know it
- Confirm important details (dates, times, insurance id)
- If you can't help, offer to transfer to a human assistant
- Always end with a friendly goodbye AFTER saving the transcription

Provide a brief summary of the conversation in 1-2 sentences. Include:
- Who called (patient name if mentioned)
- What they wanted (book appointment, reschedule, cancel, inquiry, etc.)
- What happened (appointment booked, question answered, etc.)
- Important details like appointment date and time

DO NOT include booking IDs or confirmation numbers in the summary.`;
    }

    /**
     * Build tool configurations for the agent
     */
    private buildAgentTools(doctorId: string) {
        const backendUrl = this.config.get<string>('BACKEND_URL') || 'https://backend.docline.ai';
        const websocketUrl = backendUrl.replace('http://', 'https://'); // Ensure HTTPS for ElevenLabs

        return [
            {
                type: 'webhook',
                name: 'AiAgentWebhook',
                description: 'Main webhook for handling appointment bookings, availability checks, rescheduling, cancellations, and general inquiries about the practice.',
                url: `${websocketUrl}/api/v1/ai-agent/webhook`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.elevenLabsApiKey,
                },
                body: {
                    doctor_id: doctorId,
                    intent: '{{intent}}',
                    patient_info: '{{patient_info}}',
                    requested_time: '{{requested_time}}',
                    requested_date: '{{requested_date}}',
                    appointment_type_id: '{{appointment_type_id}}',
                    appointment_date: '{{appointment_date}}',
                    start_time: '{{start_time}}',
                    booking_id: '{{booking_id}}',
                    phone_number: '{{phone_number}}',
                    query: '{{query}}',
                },
            },
            {
                type: 'webhook',
                name: 'SaveCallTranscription',
                description: 'MANDATORY tool to save call transcription at the end of EVERY conversation. Must be called before ending the call.',
                url: `${websocketUrl}/api/v1/ai-agent/transcription/save`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.elevenLabsApiKey,
                },
                body: {
                    doctor_id: doctorId,
                    caller_name: '{{caller_name}}',
                    phone_number: '{{phone_number}}',
                    transcription: '{{transcription}}',
                    summary: '{{summary}}',
                    intent: '{{intent}}',
                    sentiment: '{{sentiment}}',
                    appointment_id: '{{appointment_id}}',
                    patient_id: '{{patient_id}}',
                    duration: '{{duration}}',
                    insurance_id: '{{insurance_id}}',
                    call_started_at: '{{call_started_at}}',
                    call_ended_at: '{{call_ended_at}}',
                    call_status: '{{call_status}}',
                    reason_for_calling: '{{reason_for_calling}}',
                },
            },
            {
                type: 'webhook',
                name: 'CreateTask',
                description: 'Create tasks for the doctor such as medicine orders, callback requests, or other patient requests that require doctor action.',
                url: `${websocketUrl}/api/v1/ai-agent/task/create`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.elevenLabsApiKey,
                },
                body: {
                    doctor_id: doctorId,
                    title: '{{title}}',
                    description: '{{description}}',
                    phone_number: '{{phone_number}}',
                    insurance_id: '{{insurance_id}}',
                    priority: '{{priority}}',
                    time: '{{time}}',
                    due_date: '{{due_date}}',
                },
            },
            {
                type: 'webhook',
                name: 'QueryKnowledgeBase',
                description: 'Query the doctor\'s knowledge base for information about the practice, services, office hours, parking, and other general information.',
                url: `${websocketUrl}/api/v1/ai-agent/kb/query`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.elevenLabsApiKey,
                },
                body: {
                    doctor_id: doctorId,
                    query: '{{query}}',
                },
            },
        ];
    }

    /**
     * Create an ElevenLabs agent for a doctor
     */
    async createDoctorAgent(doctorId: string): Promise<string> {
        const doctor = await this.prisma.doctor.findUnique({
            where: { id: doctorId },
        });

        if (!doctor) {
            throw new BadRequestException('Doctor not found');
        }

        const doctorName = `Doctor ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Doctor';
        const baseUrl = this.getElevenLabsBaseUrl();
        const backendUrl = this.config.get<string>('BACKEND_URL') || 'https://backend.docline.ai';
        const websocketUrl = backendUrl.replace('http://', 'https://');

        const agentConfig = {
            name: doctorName, // Use doctor's name as agent name
            conversation_config: {
                agent: {
                    prompt: {
                        prompt: this.buildSystemPrompt(doctor),
                    },
                    first_message: 'Hello! Thank you for calling. How can I help you today?',
                    language: 'en',
                    tools: this.buildAgentTools(doctorId),
                },
                tts: {
                    // Using default voice settings
                },
            },
            platform_settings: {
                webhook_url: `${websocketUrl}/api/v1/ai-agent/webhook/post-call?doctor_id=${doctorId}`,
            },
        };

        try {
            const response = await axios.post(
                `${baseUrl}/v1/convai/agents/create`,
                agentConfig,
                {
                    headers: {
                        'xi-api-key': this.elevenLabsApiKey,
                        'Content-Type': 'application/json',
                    },
                },
            );

            const agentId = response.data.agent_id;
            if (!agentId) throw new BadRequestException('Failed to create agent: No agent_id returned');

            console.log(`✅ Created ElevenLabs agent for ${doctorName}: ${agentId}`);
            return agentId;
        } catch (error) {
            console.error('Error creating ElevenLabs agent:', error.response?.data || error.message);
            throw new BadRequestException(
                `Failed to create ElevenLabs agent: ${error.response?.data?.detail || error.message}`,
            );
        }
    }

    /**
     * Get agent details from ElevenLabs
     */
    async getDoctorAgent(doctorId: string) {
        const doctor = await this.prisma.doctor.findUnique({
            where: { id: doctorId },
            select: { elevenlabsAgentId: true },
        });

        if (!doctor?.elevenlabsAgentId) throw new NotFoundException('No agent found for this doctor');

        const baseUrl = this.getElevenLabsBaseUrl();
        try {
            const response = await axios.get(
                `${baseUrl}/v1/convai/agents/${doctor.elevenlabsAgentId}`,
                { headers: { 'xi-api-key': this.elevenLabsApiKey } },
            );
            return { success: true, agent: response.data };
        } catch (error) {
            throw new NotFoundException(`Failed to fetch agent: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Update agent configuration
     */
    async updateDoctorAgent(doctorId: string, updates: any) {
        const doctor = await this.prisma.doctor.findUnique({
            where: { id: doctorId },
            select: { elevenlabsAgentId: true },
        });

        if (!doctor?.elevenlabsAgentId) throw new NotFoundException('No agent found for this doctor');

        const baseUrl = this.getElevenLabsBaseUrl();
        try {
            const response = await axios.patch(
                `${baseUrl}/v1/convai/agents/${doctor.elevenlabsAgentId}`,
                updates,
                {
                    headers: {
                        'xi-api-key': this.elevenLabsApiKey,
                        'Content-Type': 'application/json',
                    },
                },
            );
            return { success: true, agent: response.data };
        } catch (error) {
            throw new BadRequestException(`Failed to update agent: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Delete agent from ElevenLabs
     */
    async deleteDoctorAgent(doctorId: string) {
        const doctor = await this.prisma.doctor.findUnique({
            where: { id: doctorId },
            select: { elevenlabsAgentId: true },
        });

        if (!doctor?.elevenlabsAgentId) throw new NotFoundException('No agent found for this doctor');

        const baseUrl = this.getElevenLabsBaseUrl();
        try {
            await axios.delete(
                `${baseUrl}/v1/convai/agents/${doctor.elevenlabsAgentId}`,
                { headers: { 'xi-api-key': this.elevenLabsApiKey } },
            );

            await this.prisma.doctor.update({
                where: { id: doctorId },
                data: { elevenlabsAgentId: null },
            });

            return { success: true, message: 'Agent deleted successfully' };
        } catch (error) {
            throw new BadRequestException(`Failed to delete agent: ${error.response?.data?.detail || error.message}`);
        }
    }

    /**
     * Recreate agent
     */
    async recreateDoctorAgent(doctorId: string) {
        try {
            await this.deleteDoctorAgent(doctorId);
        } catch (error) {
            await this.prisma.doctor.update({
                where: { id: doctorId },
                data: { elevenlabsAgentId: null },
            });
        }

        const agentId = await this.createDoctorAgent(doctorId);
        await this.prisma.doctor.update({
            where: { id: doctorId },
            data: { elevenlabsAgentId: agentId },
        });

        return { success: true, agent_id: agentId, message: 'Agent recreated successfully' };
    }

    /**
     * Get call audio stream from ElevenLabs
     */
    async getCallAudio(conversationId: string) {
        const baseUrl = this.getElevenLabsBaseUrl();
        const url = `${baseUrl}/v1/convai/conversations/${conversationId}/audio`;

        try {
            const response = await axios.get(url, {
                headers: {
                    'xi-api-key': this.elevenLabsApiKey,
                },
                responseType: 'stream',
            });
            return response.data;
        } catch (error) {
            console.error(
                'Error fetching audio from ElevenLabs:',
                error.response?.data || error.message,
            );
            throw error;
        }
    }
}
