import { api } from './api';

export async function registerPushToken(token: string): Promise<void> {
  try {
    await api.post('/notifications/register', { pushToken: token });
  } catch {
    // Endpoint may not exist yet — silent fail
    console.log('Push token registration not available yet:', token);
  }
}

/**
 * Clears the push token from the backend on logout/account deletion.
 * Called before clearing local auth state so the JWT is still valid.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete('/notifications/register');
  } catch {
    // Silent fail — token cleanup is best-effort
    console.log('Push token unregistration not available or failed');
  }
}
