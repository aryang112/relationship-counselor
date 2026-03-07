import { api } from './api';

export async function registerPushToken(token: string): Promise<void> {
  // This endpoint would need to be added to the backend
  // For now, log it. The backend already has notification infrastructure.
  try {
    await api.post('/notifications/register', { pushToken: token });
  } catch {
    // Endpoint may not exist yet — silent fail
    console.log('Push token registration not available yet:', token);
  }
}
