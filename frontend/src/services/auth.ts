import { api, setAuthToken, clearAuthToken, setStoredUser, clearStoredUser } from './api';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/user';
import type { Couple } from '../types/session';
import type {
  InviteResponse,
  AcceptInviteRequest,
  SignAgreementRequest,
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

export async function logout(): Promise<void> {
  await clearAuthToken();
  await clearStoredUser();
}

export async function createInvite(): Promise<InviteResponse> {
  const res = await api.post<InviteResponse>('/couples/invite');
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
