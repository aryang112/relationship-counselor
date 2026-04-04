/**
 * Couples API service — Love bank CRUD, couple stats, and learnings.
 */

import { api } from './api';

/** Shape of a love bank entry returned by the API. */
export interface LoveBankEntryResponse {
  id: string;
  text: string;
  createdAt: string;
}

/** Aggregated couple stats returned by GET /couples/stats. */
export interface CoupleStatsResponse {
  sessionsCompleted: number;
  commitmentsKept: number;
  daysSinceLastSession: number | null;
  togetherSinceDays: number | null;
}

/** Single learning/commitment returned by GET /couples/learnings. */
export interface LearningResponse {
  id: string;
  text: string;
  sessionDate: string;
  userAAgreed: boolean;
  userBAgreed: boolean;
  createdAt: string;
}

// ─── Love Bank ────────────────────────────────────────────────────────

export const getLoveBank = (): Promise<LoveBankEntryResponse[]> =>
  api.get('/couples/love-bank').then((r) => r.data);

export const addLoveBankEntry = (text: string): Promise<LoveBankEntryResponse> =>
  api.post('/couples/love-bank', { text }).then((r) => r.data);

export const deleteLoveBankEntry = (entryId: string): Promise<{ success: boolean }> =>
  api.delete(`/couples/love-bank/${entryId}`).then((r) => r.data);

// ─── Stats ────────────────────────────────────────────────────────────

export const getCoupleStats = (): Promise<CoupleStatsResponse> =>
  api.get('/couples/stats').then((r) => r.data);

// ─── Learnings ────────────────────────────────────────────────────────

export const getLearnings = (): Promise<LearningResponse[]> =>
  api.get('/couples/learnings').then((r) => r.data);
