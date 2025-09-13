import axios from "axios";
import { getAuthToken } from "../utils/authTokenHelper";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: BASE,
  timeout: 30000, // 30 seconds instead of 15
});

api.interceptors.request.use((config) => {
  // Try to get token from global helper first, then fallback to stored token
  const token = getAuthToken() || authToken;
  
  if (token) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` } as any;
    console.log('🔑 API call with token from authTokenHelper');
  } else {
    console.warn('⚠️ API call without token - auth may be required');
  }
  
  return config;
});

// Ads Configuration API
export const adsAPI = {
  getConfig: async () => {
    const response = await api.get("/config/ads");
    return response.data;
  }
};

// Chat API functions
export const chatAPI = {
  // Create new GROUP chat (with invite code)
  createGroupChat: async (title: string) => {
    const response = await api.post("/chats/group", { title });
    return response.data;
  },

  // Open or create 1-to-1 direct chat with friend
  openDirectChat: async (friendId: string) => {
    const response = await api.post(`/chats/direct/${friendId}`);
    return response.data;
  },

  // List user's chats
  listChats: async () => {
    const response = await api.get("/chats");
    return response.data.chats;
  },

  // Join GROUP chat by invite code
  joinGroupChat: async (code: string) => {
    const response = await api.post("/chats/join", { code });
    return response.data;
  },

  // Send message to chat
  sendMessage: async (chatId: string, text: string, type: string = "text") => {
    const response = await api.post(`/chats/${chatId}/messages`, { text, type });
    return response.data;
  },

  // Get chat messages
  getMessages: async (chatId: string, limit: number = 50) => {
    const response = await api.get(`/chats/${chatId}/messages?limit=${limit}`);
    return response.data.messages;
  },

  // React to message
  reactToMessage: async (chatId: string, messageId: string, reactionType: string) => {
    const response = await api.post(`/chats/${chatId}/messages/${messageId}/react`, { type: reactionType });
    return response.data;
  }
};