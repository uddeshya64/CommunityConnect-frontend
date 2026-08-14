import { api } from "@/lib/axios";

export interface AgendaItem {
  id: number;
  user_id: number;
  event_id: number;
  timeline_id: number;
  status: "RECOMMENDED" | "ACCEPTED" | "DECLINED";
  match_score: number;
  created_at: string;
  googleCalendarLink?: string;
  timeline: {
    id: number;
    title: string;
    description: string | null;
    speaker_name: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
  };
  event: {
    id: number;
    title: string;
    start_date: string;
    end_date: string;
    location: string | null;
    banner_url: string | null;
  };
}

export const AgendaService = {
  /**
   * Fetch authenticated user's recommended agenda
   */
  async getUserAgenda(): Promise<AgendaItem[]> {
    const res = await api.get("/agenda");
    return res.data.data;
  },

  /**
   * Trigger ML recommendation engine for a specific event
   */
  async generateAgenda(eventId: number): Promise<AgendaItem[]> {
    const res = await api.post(`/agenda/generate/${eventId}`);
    return res.data.data;
  },

  /**
   * Accept or decline a session recommendation
   */
  async updateAgendaStatus(agendaId: number, status: "ACCEPTED" | "DECLINED" | "RECOMMENDED"): Promise<AgendaItem> {
    const res = await api.patch(`/agenda/${agendaId}/status`, { status });
    return res.data.data;
  },

  /**
   * Export personal agenda to standard .ics iCalendar file
   */
  async downloadICSFeed(): Promise<void> {
    const response = await api.get("/agenda/export/ics", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "communityconnect-agenda.ics");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  /**
   * Add a personal busy slot (Two-Way Conflict Sync)
   */
  async addCustomBusySlot(title: string, start_time: string, end_time: string, location?: string): Promise<any> {
    const res = await api.post("/agenda/custom-busy-slot", {
      title,
      start_time,
      end_time,
      location
    });
    return res.data;
  }
};
