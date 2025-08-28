import axios from "axios";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${authToken}` } as any;
  }
  return config;
});