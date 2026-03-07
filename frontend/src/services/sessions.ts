import { api } from './api';
import type {
  Session,
  SessionStatus,
  StartSessionRequest,
} from '../types/session';
import type {
  SessionStatusResponse,
  RemindPartnerResponse,
} from '../types/api';

export async function createSession(data: StartSessionRequest): Promise<Session> {
  const res = await api.post<Session>('/sessions', data);
  return res.data;
}

export async function getSessions(): Promise<Session[]> {
  const res = await api.get<Session[]>('/sessions');
  return res.data;
}

export async function getSession(id: string): Promise<Session> {
  const res = await api.get<Session>(`/sessions/${id}`);
  return res.data;
}

export async function getSessionStatus(id: string): Promise<SessionStatusResponse> {
  const res = await api.get<SessionStatusResponse>(`/sessions/${id}/status`);
  return res.data;
}

export async function updateSessionStatus(
  id: string,
  status: SessionStatus,
): Promise<Session> {
  const res = await api.patch<Session>(`/sessions/${id}/status`, { status });
  return res.data;
}

export async function remindPartner(id: string): Promise<RemindPartnerResponse> {
  const res = await api.post<RemindPartnerResponse>(`/sessions/${id}/remind-partner`);
  return res.data;
}
