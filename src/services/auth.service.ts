import { api } from '@/lib/axios';
import { LoginFormValues, RegisterFormValues } from '@/validations/auth.schema';

export const authService = {
  login: async (data: LoginFormValues) => {
    // Matches: POST /api/auth/login
    const response = await api.post('/auth/login', data);
    // Save the token to the browser!
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  sendOtp: async (data: RegisterFormValues) => {
    // UPDATED: Now we send both the email AND the password!
    const response = await api.post('/auth/registor/init', { 
      email: data.email, 
      password: data.password, 
      context: 'REGISTER' 
    }); 
    return response.data;
  },

  verifyAndRegister: async (data: RegisterFormValues & { otp: string }) => {
    // UPDATED: Matches POST /api/auth/registor/verify
    const response = await api.post('/auth/registor/verify', { 
      ...data, 
      context: 'REGISTER' 
    });
    // Save the token to the browser!
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  
  // FORGOT PASSWORD FLOW
  sendResetOtp: async (email: string) => {
    const response = await api.post('/auth/registor/init', { 
      email, 
      context: 'RESET' 
    }); 
    return response.data;
  },

  verifyResetOtp: async (email: string, otp: string) => {
    const response = await api.post('/auth/registor/verify', { 
      email,
      otp,
      context: 'RESET' 
    });
    return response.data; // This returns { success: true, token: "..." }
  },

  resetPassword: async (token: string, newPassword: string, confirmPassword: string) => {
    const response = await api.post('/auth/reset-password', { 
      token, 
      newPassword,
      confirmPassword // Matches your backend Zod schema requirement
    });
    return response.data;
  }
};