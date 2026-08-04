import { api } from '@/lib/axios';
import { UpdateProfileFormValues } from '@/validations/profile.schema';
import { Profile } from '@/types/profile.types';

export const profileService = {
    getMyProfile: async (): Promise<Profile> => {
        const response = await api.get('/profile/me');
        return response.data.data || response.data;
    },

    getProfileById: async (id: string): Promise<Profile> => {
        const response = await api.get(`/profile/${id}`);
        return response.data.data || response.data;
    },

    updateMyProfile: async (data: UpdateProfileFormValues): Promise<Profile> => {
        const response = await api.patch('/profile/me', data);
        return response.data.data || response.data;
    },

    getMySettings: async (): Promise<any> => {
        const response = await api.get('/profile/me/settings');
        return response.data.data || response.data;
    },

    updateMySettings: async (settings: any): Promise<any> => {
        const response = await api.patch('/profile/me/settings', settings);
        return response.data.data || response.data;
    },

    deleteMyAccount: async (): Promise<any> => {
        const response = await api.delete('/profile/me');
        return response.data;
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<any> => {
        const response = await api.post('/auth/change-password', { currentPassword, newPassword });
        return response.data;
    },

    logoutAllDevices: async (): Promise<any> => {
        const response = await api.post('/auth/logout-all');
        return response.data;
    },
};
