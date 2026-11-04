import { api } from '@/lib/axios';

export interface NotificationItem {
  id: string;
  type: 'TEAM_INVITE' | 'STAFF_INVITE' | 'ROLE_UPDATE' | 'LIVE_QUIZ';
  token?: string;
  eventId?: number;
  quizId?: number;
  quizTitle?: string;
  teamName?: string;
  roleName?: string;
  eventName: string;
  eventBanner?: string | null;
  created_at: string;
  expires_at?: string;
}

export const notificationService = {
  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data?.data || response.data || { count: 0 };
    } catch {
      return { count: 0 };
    }
  },
  markAllRead: async () => {
    try {
      const response = await api.post('/notifications/mark-all-read');
      return response.data;
    } catch {
      return null;
    }
  },
  getNotifications: async (): Promise<NotificationItem[]> => {
    const response = await api.get('/notifications');
    return response.data.data;
  },

  acceptTeamInvite: async (token: string) => {
    const response = await api.post('/team-dashboard/accept-invite', { token });
    return response.data;
  },

  declineTeamInvite: async (token: string) => {
    const response = await api.post('/team-dashboard/decline-invite', { token });
    return response.data;
  },

  acceptStaffInvite: async (token: string) => {
    const response = await api.post('/staff/accept-invite', { token });
    return response.data;
  },

  declineStaffInvite: async (token: string) => {
    const response = await api.post('/staff/decline-invite', { token });
    return response.data;
  }
};
