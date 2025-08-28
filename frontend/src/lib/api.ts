import axios from "axios";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
});

// Attach x-user-id from auth store dynamically
api.interceptors.request.use((config) => {
  try {
    const { useAuthStore } = require("../store/auth");
    const userId = useAuthStore.getState().userId;
    if (userId) {
      config.headers = {
        ...(config.headers || {}),
        "x-user-id": userId,
      } as any;
    }
  } catch (e) {
    // noop
  }
  return config;
});