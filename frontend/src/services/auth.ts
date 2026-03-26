import { api, setAuthToken, clearAuthToken, setStoredUser, clearStoredUser } from './api';
import type { AuthResponse, LoginRequest, RegisterRequest, UserSummary } from '../types/user';
import type { Couple } from '../types/session';
import type {
  InviteResponse,
  AcceptInviteRequest,
  ValidateInviteResponse,
  SignAgreementRequest,
  RecordConsentRequest,
  RecordConsentResponse,
  ConsentStatusResponse,
} from '../types/api';

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', data);
  await setAuthToken(res.data.accessToken);
  await setStoredUser(res.data.user);
  return res.data;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', data);
  await setAuthToken(res.data.accessToken);
  await setStoredUser(res.data.user);
  return res.data;
}

export async function getMe(): Promise<UserSummary> {
  const res = await api.get<UserSummary>('/auth/me');
  return res.data;
}

export async function logout(): Promise<void> {
  await clearAuthToken();
  await clearStoredUser();
}

export async function createInvite(): Promise<InviteResponse> {
  const res = await api.post<InviteResponse>('/couples/invite');
  return res.data;
}

/**
 * Validates an invite token WITHOUT requiring authentication.
 * Used by Partner B before they create an account.
 */
export async function validateInvite(inviteToken: string): Promise<ValidateInviteResponse> {
  const res = await api.post<ValidateInviteResponse>('/couples/validate-invite', { inviteToken });
  return res.data;
}

export async function acceptInvite(data: AcceptInviteRequest): Promise<Couple> {
  const res = await api.post<Couple>('/couples/accept', data);
  return res.data;
}

export async function getMyCouple(): Promise<Couple> {
  const res = await api.get<Couple>('/couples/me');
  return res.data;
}

export async function signAgreement(data: SignAgreementRequest): Promise<Couple> {
  const res = await api.post<Couple>('/couples/agreement', data);
  return res.data;
}

export async function updateProfile(data: { name?: string; gender?: string }): Promise<{ id: string; email: string; name: string; gender?: string }> {
  const res = await api.patch('/auth/profile', data);
  return res.data;
}

export async function submitCoupleOnboarding(data: { datingStartDate?: string; data?: Record<string, any> }): Promise<Couple> {
  const res = await api.post<Couple>('/couples/onboarding', data);
  return res.data;
}

export async function recordConsent(data: RecordConsentRequest): Promise<RecordConsentResponse> {
  const res = await api.post<RecordConsentResponse>('/auth/consent', data);
  return res.data;
}

export async function getConsentStatus(): Promise<ConsentStatusResponse> {
  const res = await api.get<ConsentStatusResponse>('/auth/consent-status');
  return res.data;
}

export async function recordAiConsent(): Promise<{ message: string; aiConsentAgreedAt: string }> {
  const res = await api.post('/auth/ai-consent');
  return res.data;
}

export async function deleteAccount(reason?: string): Promise<{ message: string }> {
  const res = await api.delete('/auth/account', { data: { reason } });
  return res.data;
}
