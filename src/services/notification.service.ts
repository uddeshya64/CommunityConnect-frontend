import { api } from '@/lib/axios';

export interface NotificationItem {
  id: string;
  type: 'TEAM_INVITE' | 'STAFF_INVITE';
  token: string;
  teamName?: string;
  roleName?: string;
  eventName: string;
  eventBanner?: string | null;
  created_at: string;
  expires_at: string;
}

export const notificationService = {
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
