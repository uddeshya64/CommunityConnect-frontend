import { api } from "@/lib/axios";

export interface AiConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RegistrationFormField {
  id: string;
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox";
  required: boolean;
  options?: string[];
  is_fixed?: boolean;
}

/** Mirrors the backend `EventDraftValues` wire format (events column names). */
export interface AiEventDraft {
  title?: string;
  description?: string;
  type?: string;
  mode?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  capacity?: number | string;
  registration_type?: string;
  registration_fee?: number | string;
  min_team_size?: number | string;
  max_team_size?: number | string;
  registration_form_schema?: RegistrationFormField[];
  [key: string]: unknown;
}

export interface AiChatResult {
  reply: string;
  extracted: AiEventDraft;
  draft: AiEventDraft;
  questions: string[];
  missing_fields: string[];
  complete: boolean;
  source: "gemini" | "local";
}

export interface AiValidateResult {
  valid: boolean;
  event: AiEventDraft;
  errors: Record<string, string[]>;
  missing_fields: string[];
  questions: string[];
}

export const aiEventService = {
  /**
   * One conversation turn: send the typed/spoken message (plus the running
   * draft) to the backend, which calls Gemini and returns the merged draft.
   */
  chat: async (params: {
    message: string;
    history?: AiConversationMessage[];
    draft?: AiEventDraft;
    knownTypes?: string[];
  }): Promise<AiChatResult> => {
    const response = await api.post("/ai-events/chat", {
      message: params.message,
      history: params.history || [],
      draft: params.draft || {},
      known_types: params.knownTypes || [],
      time_zone_offset:
        typeof window !== "undefined" ? new Date().getTimezoneOffset() : 0,
    });
    return response.data?.data;
  },

  /** Validate the reviewed draft with the existing CreateEventSchema. */
  validate: async (event: AiEventDraft): Promise<AiValidateResult> => {
    try {
      const response = await api.post("/ai-events/validate", { event });
      return response.data?.data;
    } catch (error: any) {
      if (error?.response?.status === 422 && error?.response?.data?.data) {
        return error.response.data.data;
      }
      throw error;
    }
  },

  /** Canonical field metadata + event types for the review form. */
  schema: async (): Promise<{
    fields: Array<{ key: string; label: string; required: boolean }>;
    modes: string[];
    event_types: Array<{ id: number; name: string; is_system: boolean }>;
  }> => {
    const response = await api.get("/ai-events/schema");
    return response.data?.data;
  },

  /**
   * Generate event agenda sessions from prompt or audio transcript via Gemini AI.
   */
  generateAgenda: async (params: {
    eventId: number | string;
    prompt: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<{
    reply: string;
    sessions: Array<{
      title: string;
      speaker_name?: string | null;
      description?: string | null;
      tags?: string[];
      start_time: string;
      end_time: string;
      location?: string | null;
    }>;
    source: "gemini" | "local";
  }> => {
    const response = await api.post("/ai-events/agenda/generate", {
      eventId: Number(params.eventId),
      prompt: params.prompt,
      history: params.history || [],
      timeZoneOffsetMinutes:
        typeof window !== "undefined" ? new Date().getTimezoneOffset() : 0,
    });
    return response.data?.data;
  },

  /**
   * Generate interactive quiz & questions from prompt or audio transcript via Gemini AI.
   */
  generateQuiz: async (params: {
    eventId: number | string;
    prompt: string;
    currentQuiz?: {
      title?: string;
      description?: string;
      questions?: Array<{
        text: string;
        time_limit?: number;
        points?: number;
        options: Array<{
          text: string;
          is_correct: boolean;
        }>;
      }>;
    };
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<{
    reply: string;
    quiz: {
      title: string;
      description: string;
      questions: Array<{
        text: string;
        time_limit: number;
        points: number;
        options: Array<{
          text: string;
          is_correct: boolean;
        }>;
      }>;
    };
    source: "gemini" | "local";
  }> => {
    const response = await api.post("/ai-events/quiz/generate", {
      eventId: Number(params.eventId),
      prompt: params.prompt,
      currentQuiz: params.currentQuiz,
      history: params.history || [],
    });
    return response.data?.data;
  },
};