import { api } from '@/lib/axios';

export const eventService = {
  // Fetch all events for the home feed
  getFeed: async () => {
    // Assuming your backend route is GET /api/events
    const response = await api.get('/events');
    return response.data;
  },

  // Fetch a single event's details
  getEventById: async (eventId: string) => {
    // Assuming your backend route is GET /api/events/:eventId
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  },
  createEvent: async (eventData: any) => {
    // Assuming your backend route is POST /api/events
    const response = await api.post('/events', eventData);
    return response.data;
  },

  // Update an event (Requires Organizer/Staff Token)
  updateEvent: async (eventId: string, eventData: any) => {
    const response = await api.patch(`/events/${eventId}`, eventData);
    return response.data;
  },

  // Fetch available event types (system & custom)
  getEventTypes: async () => {
    const response = await api.get('/events/types');
    return response.data;
  },

  // Delete an event (Requires Organizer Token)
  deleteEvent: async (eventId: string) => {
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
  },

 // Points to: POST /api/registration/start
  registerForEvent: async (payload: { eventId: number; teamName?: string }) => {
    const response = await api.post('/registration/start', payload);
    return response.data;
  },

  // Points to: POST /api/registration/verify
  verifyPayment: async (paymentData: { 
    razorpay_order_id: string; 
    razorpay_payment_id: string; 
    razorpay_signature: string;
    team_id?: number;
    registration_id?: number;
  }) => {
    const response = await api.post('/registration/verify', paymentData);
    return response.data;
  },

  // Timeline (Agenda) CRUD methods
  createTimeline: async (eventId: string, data: any) => {
    const response = await api.post(`/events/${eventId}/timelines`, data);
    return response.data;
  },

  updateTimeline: async (eventId: string, timelineId: number | string, data: any) => {
    const response = await api.put(`/events/${eventId}/timelines/${timelineId}`, data);
    return response.data;
  },

  deleteTimeline: async (eventId: string, timelineId: number | string) => {
    const response = await api.delete(`/events/${eventId}/timelines/${timelineId}`);
    return response.data;
  }
};