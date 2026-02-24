import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://192.168.29.81:3000/api:3000/api',
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// NEW: Add a request interceptor to attach the JWT token
api.interceptors.request.use((config) => {
  // Check if we are in the browser (Next.js SSR safety)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});