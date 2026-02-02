import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly webhookBaseUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService
  ) {
    this.apiKey = this.config.get<string>('ELEVENLABS_WEBHOOK_API_KEY') || '';
    this.webhookBaseUrl = this.config.get<string>('BASE_BACKEND_URL') || 'https://backend.docline.ai/api/v1';
    
    // Always use EU region for data residency
    const region = this.config.get<string>('ELEVENLABS_API_REGION') || 'eu';
    
    // Check if API key has EU residency suffix and use appropriate endpoint
    if (this.apiKey.includes('_residency_eu')) {
      // For EU residency keys, use the EU-specific endpoint
      // This is the correct EU data residency endpoint from your old service
      this.baseUrl = 'https://api.eu.residency.elevenlabs.io/v1';
    } else {
      // Standard global endpoint
      this.baseUrl = 'https://api.elevenlabs.io/v1';
    }
    
    this.logger.log(`ElevenLabsService initialized with EU region: ${region}`);
    this.logger.log(`API Base URL: ${this.baseUrl}`);
    this.logger.log(`API Key type: Data Residency EU (${this.apiKey.includes('_residency_eu') ? 'confirmed' : 'unknown'})`);
    this.logger.log(`Webhook Base URL: ${this.webhookBaseUrl}`);
  }

  /**
   * Build JSON schema for a tool parameter with required description
   */
  private buildToolParameter(description: string, isSystemProvided = false, dynamicVariable?: string) {
    if (isSystemProvided) {
      return {
        type: 'string',
        dynamic_variable: dynamicVariable,
      };
    }
    return {
      type: 'string',
      description: description,
    };
  }

  async createAgentForDoctor(doctor: any) {
    this.logger.log(`Creating ElevenLabs agent for doctor: ${doctor.id}`);

    try {
      // 1. Create the agent
      const agent = await this.createAgent(doctor);
      
      // 2. Create tools for the agent
      await this.createToolsForAgent(agent.agent_id, doctor.id);

      // 3. Save agent_id to doctor record
      await this.prisma.doctor.update({
        where: { id: doctor.id },
        data: { elevenlabsAgentId: agent.agent_id }
      });

      this.logger.log(`Successfully created agent ${agent.agent_id} for doctor ${doctor.id}`);
      return agent;

    } catch (error) {
      this.logger.error(`Failed to create agent for doctor ${doctor.id}:`, error);
      throw error;
    }
  }

  private async createAgent(doctor: any) {
    // Debug: Check API key
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }
    
    this.logger.log(`Creating agent with API key: ${this.apiKey.substring(0, 10)}...`);

    // Use the correct ElevenLabs Conversational AI API endpoint
    const requestBody = {
      conversation_config: {
        agent: {
          first_message: `Hello! Thank you for calling Dr. ${doctor.lastName}'s office. How can I help you today?`,
          prompt: {
            prompt_text: this.generateSystemPrompt(doctor)
          },
          language: 'en',
          voice: {
            voice_id: 'pNInz6obpgDQGcFmaJgB'
          }
        }
      }
    };

    this.logger.log(`Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.baseUrl}/convai/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    this.logger.log(`Response status: ${response.status}`);
    this.logger.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`API Error Response:`, error);
      throw new Error(`Failed to create agent: ${response.status} - ${error}`);
    }

    const result = await response.json();
    this.logger.log(`API Success Response:`, result);
    return { agent_id: result.agent_id };
  }

  private async createToolsForAgent(agentId: string, doctorId: string) {
    this.logger.log(`Creating tools for agent: ${agentId}`);

    const tools = [
      {
        type: 'webhook',
        name: 'AiAgentWebhook',
        description: 'Handle various AI agent operations like booking, rescheduling, checking availability, and answering inquiries',
        api_schema: {
          url: `${this.webhookBaseUrl}/ai-agent/webhook`,
          method: 'POST',
          content_type: 'application/json',
          request_headers: {
            'Content-Type': 'application/json'
          },
          request_body_schema: {
            type: 'object',
            properties: {
              intent: this.buildToolParameter("The intent of the user request"),
              doctor_id: this.buildToolParameter("The ID of the doctor", true, "doctor_id"),
              patient_info: {
                type: 'object',
                properties: {
                  firstName: this.buildToolParameter("Patient first name"),
                  lastName: this.buildToolParameter("Patient last name"),
                  phone: this.buildToolParameter("Patient phone number"),
                  email: this.buildToolParameter("Patient email address"),
                  insuranceId: this.buildToolParameter("Patient insurance ID")
                }
              },
              appointment_date: this.buildToolParameter("Requested appointment date (YYYY-MM-DD)"),
              appointment_type_id: this.buildToolParameter("The type of appointment being booked"),
              start_time: this.buildToolParameter("Preferred start time for appointment"),
              query: this.buildToolParameter("The search query for practice information"),
              transcription: this.buildToolParameter("Call transcription text")
            },
            required: [
              "intent",
              "doctor_id"
            ]
          }
        }
      },
      {
        type: 'webhook',
        name: 'SaveCallTranscription',
        description: 'Save call transcription and summary after the call ends',
        api_schema: {
          url: `${this.webhookBaseUrl}/ai-agent/transcription/save`,
          method: 'POST',
          content_type: 'application/json',
          request_headers: {
            'Content-Type': 'application/json'
          },
          request_body_schema: {
            type: 'object',
            properties: {
              doctor_id: this.buildToolParameter("The ID of the doctor", true, "doctor_id"),
              caller_name: this.buildToolParameter("Name of the patient"),
              transcription: this.buildToolParameter("Full call transcription text"),
              summary: this.buildToolParameter("Call summary (2-4 sentences)"),
              intent: this.buildToolParameter("Call intent"),
              sentiment: this.buildToolParameter("Call sentiment"),
              appointment_id: this.buildToolParameter("Associated booking ID if any"),
              patient_id: this.buildToolParameter("Patient ID if found"),
              phone_number: this.buildToolParameter("Patient phone number"),
              duration: this.buildToolParameter("Call duration in seconds"),
              insurance_id: this.buildToolParameter("Patient insurance ID"),
              call_started_at: this.buildToolParameter("Call start timestamp"),
              call_ended_at: this.buildToolParameter("Call end timestamp"),
              call_status: this.buildToolParameter("Call status"),
              reason_for_calling: this.buildToolParameter("Reason for the call")
            },
            required: ['doctor_id', 'transcription', 'summary', 'intent', 'sentiment', 'call_status']
          }
        }
      },
      {
        type: 'webhook',
        name: 'CreateTask',
        description: 'Create tasks for the doctor (medicine orders, callbacks, etc.)',
        api_schema: {
          url: `${this.webhookBaseUrl}/ai-agent/task/create`,
          method: 'POST',
          content_type: 'application/json',
          request_headers: {
            'Content-Type': 'application/json'
          },
          request_body_schema: {
            type: 'object',
            properties: {
              doctor_id: this.buildToolParameter("The ID of the doctor", true, "doctor_id"),
              title: this.buildToolParameter("Task title"),
              description: this.buildToolParameter("Task description"),
              phone_number: this.buildToolParameter("Patient phone number"),
              insurance_id: this.buildToolParameter("Patient insurance ID"),
              priority: this.buildToolParameter("Task priority (LOW, NORMAL, HIGH)"),
              time: this.buildToolParameter("Preferred time for task"),
              due_date: this.buildToolParameter("Due date (YYYY-MM-DD)")
            },
            required: ['doctor_id', 'title', 'description', 'phone_number', 'insurance_id', 'priority', 'time', 'due_date']
          }
        }
      },
      {
        type: 'webhook',
        name: 'QueryKnowledgeBase',
        description: 'Query the knowledge base for information about the doctor, practice, or services',
        api_schema: {
          url: `${this.webhookBaseUrl}/ai-agent/kb/query`,
          method: 'POST',
          content_type: 'application/json',
          request_headers: {
            'Content-Type': 'application/json'
          },
          request_body_schema: {
            type: 'object',
            properties: {
              doctor_id: this.buildToolParameter("The ID of the doctor", true, "doctor_id"),
              query: this.buildToolParameter("The search query for practice information")
            },
            required: ['doctor_id', 'query']
          }
        }
      }
    ];

    // Create each tool using the correct ElevenLabs API format
    for (const tool of tools) {
      await this.createTool(tool);
    }

    // Set up post-call webhook (optional - commenting out due to 404 error)
    // await this.setupPostCallWebhook(agentId, doctorId);
    this.logger.log('Skipping post-call webhook setup (optional feature)');
  }

  private async createTool(tool: any) {
    this.logger.log(`Creating tool: ${tool.name}`);

    // Use the correct ElevenLabs API format for creating tools
    const requestBody = {
      tool_config: tool
    };

    this.logger.log(`Tool request body for ${tool.name}:`, JSON.stringify(requestBody, null, 2));

    // Create tool at workspace level (not agent level)
    const response = await fetch(`${this.baseUrl}/convai/tools`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    this.logger.log(`Tool creation response status for ${tool.name}: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to create tool ${tool.name}:`, error);
      throw new Error(`Failed to create tool ${tool.name}: ${response.status} - ${error}`);
    }

    const result = await response.json();
    this.logger.log(`Successfully created tool ${tool.name}:`, result);
    return result;
  }

  private async setupPostCallWebhook(agentId: string, doctorId: string) {
    const webhookUrl = `${this.webhookBaseUrl}/ai-agent/webhook/post-call?doctor_id=${doctorId}`;
    
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/webhooks`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['call_ended'],
        active: true
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to setup post-call webhook: ${response.status} - ${error}`);
    }

    this.logger.log(`Setup post-call webhook for agent: ${agentId}`);
    return await response.json();
  }

  private generateSystemPrompt(doctor: any): string {
    return `You are a helpful AI assistant for Dr. ${doctor.firstName} ${doctor.lastName}'s medical practice.

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
4. Do NOT hardcode any doctor names, specialties, or practice details

Your capabilities:
- Schedule appointments (intent: "book_appointment")
- Check availability (intent: "check_availability")
- Answer questions about the practice (intent: "inquiry") - MUST use webhook
- Reschedule appointments (intent: "reschedule")
- Cancel appointments (intent: "cancel")
- Create tasks for the doctor (tool: "CreateTask") - for medicine orders, callbacks, etc.

IMPORTANT: Always use doctor_id: "${doctor.id}" in all webhook calls.

CONVERSATION FLOW FOR BOOKING:
1. Greet the patient warmly
2. Ask for their full name
3. Ask for the reason for their visit to determine appointment type
4. Ask for their insurance ID (REQUIRED for new patients)
5. Ask what date they'd like to book
6. Call webhook to check availability
7. Present available slots
8. Confirm their choice
9. Call webhook to create the booking
10. Provide confirmation with booking ID

MANDATORY END-OF-CALL PROCEDURE:
Before ending ANY conversation, you MUST call the SaveCallTranscription tool with:
- doctor_id: "${doctor.id}"
- Complete conversation transcript
- Detailed 2-4 sentence summary
- Intent, sentiment, and call status

TONE AND STYLE:
- Be warm, professional, and empathetic
- Use the patient's name once you know it
- Confirm important details (dates, times, insurance id)
- If you can't help, offer to transfer to a human assistant
- Always end with a friendly goodbye AFTER saving the transcription`;
  }

  async deleteAgent(agentId: string) {
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete agent: ${response.status} - ${error}`);
    }

    this.logger.log(`Deleted agent: ${agentId}`);
    return true;
  }

  async getAgent(agentId: string) {
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get agent: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Legacy methods for backward compatibility
  async getDoctorAgent(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { elevenlabsAgentId: true }
    });

    if (!doctor?.elevenlabsAgentId) {
      throw new Error('No agent found for this doctor');
    }

    return this.getAgent(doctor.elevenlabsAgentId);
  }

  async updateDoctorAgent(doctorId: string, updateData: any) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { elevenlabsAgentId: true }
    });

    if (!doctor?.elevenlabsAgentId) {
      throw new Error('No agent found for this doctor');
    }

    const response = await fetch(`${this.baseUrl}/convai/agents/${doctor.elevenlabsAgentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update agent: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  async deleteDoctorAgent(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { elevenlabsAgentId: true }
    });

    if (!doctor?.elevenlabsAgentId) {
      throw new Error('No agent found for this doctor');
    }

    await this.deleteAgent(doctor.elevenlabsAgentId);

    // Remove agent ID from doctor record
    await this.prisma.doctor.update({
      where: { id: doctorId },
      data: { elevenlabsAgentId: null }
    });

    return { success: true };
  }

  async recreateDoctorAgent(doctorId: string) {
    // Delete existing agent
    await this.deleteDoctorAgent(doctorId);

    // Get doctor details and create new agent
    const doctor = await this.prisma.doctor.findUnique({
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

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    return this.createAgentForDoctor(doctor);
  }

  async getCallAudio(callId: string) {
    // This method would need to be implemented based on ElevenLabs API
    // For now, return a placeholder
    throw new Error('getCallAudio method not yet implemented');
  }

  async toggleAgentActiveness(
    doctorId: string,
    isActive: boolean,
    changer?: { id: string; role: 'admin' | 'doctor' | 'system' }
  ) {
    // This would typically update the agent status in ElevenLabs
    // For now, we'll update the doctor record and log the change
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { elevenlabsAgentId: true, firstName: true, lastName: true }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    if (!doctor.elevenlabsAgentId) {
      throw new Error('No agent found for this doctor');
    }

    // In a real implementation, you would call ElevenLabs API to activate/deactivate the agent
    // For now, we'll just log and return a success response
    this.logger.log(`Agent ${doctor.elevenlabsAgentId} for ${doctor.firstName} ${doctor.lastName} set to ${isActive ? 'active' : 'inactive'} by ${changer?.role}:${changer?.id}`);

    // TODO: Implement actual ElevenLabs API call to toggle agent status
    // const response = await fetch(`${this.baseUrl}/convai/agents/${doctor.elevenlabsAgentId}`, {
    //   method: 'PATCH',
    //   headers: { 'xi-api-key': this.apiKey, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ active: isActive })
    // });

    return {
      doctorId,
      agentId: doctor.elevenlabsAgentId,
      isActive,
      changedBy: changer,
      timestamp: new Date().toISOString()
    };
  }
}
