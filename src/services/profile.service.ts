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
        const response = await api.patch('/profile', data);
        return response.data.data || response.data;
    },
};
