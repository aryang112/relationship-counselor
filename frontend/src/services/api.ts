import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { UserSummary } from '../types/user';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  const configUrl = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (configUrl) {
    return configUrl;
  }

  if (!__DEV__) {
    return 'https://api.relationcounselor.app';
  }

  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | undefined)?.hostUri ||
    (Constants.manifest2 as { extra?: { expoGo?: { debuggerHost?: string } } } | null)?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

const _baseURL = resolveBaseUrl();
console.log('[API] baseURL resolved to:', _baseURL);

export const api = axios.create({
  baseURL: _baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('[API]', config.method?.toUpperCase(), config.url, token ? 'AUTH' : 'NO-AUTH');
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync(TOKEN_KEY);
      SecureStore.deleteItemAsync(USER_KEY);
    }
    return Promise.reject(error);
  },
);

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function setStoredUser(user: UserSummary): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<UserSummary | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserSummary;
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
}

export async function clearStoredUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
