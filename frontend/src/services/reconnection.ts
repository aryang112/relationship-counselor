/**
 * Reconnection API service
 *
 * Handles all API calls for the reconnection chat flow (Phase 4-5):
 * fetching messages, sending messages, generating commitments, and agreeing.
 */

import { api } from './api';

export interface ReconnectionMessageData {
  id: string;
  role: 'me' | 'partner' | 'ai';
  text: string;
  timestamp: string;
}

export interface CommitmentData {
  id: string;
  text: string;
  userAAgreed: boolean;
  userBAgreed: boolean;
}

export interface ReconnectionState {
  messages: ReconnectionMessageData[];
  isMyTurn: boolean;
  commitment: CommitmentData | null;
  exchangeCount: number;
}

/** Fetch current reconnection state: messages, turn info, commitment. */
export async function getReconnection(sessionId: string): Promise<ReconnectionState> {
  const res = await api.get<ReconnectionState>(`/sessions/${sessionId}/reconnection`);
  return res.data;
}

/** Send a reconnection message (validates server-side that it's your turn). */
export async function sendReconnectionMessage(sessionId: string, text: string): Promise<void> {
  await api.post(`/sessions/${sessionId}/reconnection`, { text });
}

/** Ask AI to generate a shared commitment based on the conversation. */
export async function generateCommitment(sessionId: string): Promise<CommitmentData> {
  const res = await api.post<CommitmentData>(`/sessions/${sessionId}/reconnection/commitment`);
  return res.data;
}

/** Mark the current user as agreeing to the commitment. */
export async function agreeToCommitment(sessionId: string): Promise<CommitmentData> {
  const res = await api.patch<CommitmentData>(`/sessions/${sessionId}/reconnection/commitment`);
  return res.data;
}
