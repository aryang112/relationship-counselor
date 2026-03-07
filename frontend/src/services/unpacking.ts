import { api } from './api';
import type {
  Unpacking,
  UnpackingChoice,
  SubmitFeedbackRequest,
} from '../types/session';

export async function getUnpacking(sessionId: string): Promise<Unpacking> {
  const res = await api.get<Unpacking>(`/sessions/${sessionId}/unpacking`);
  return res.data;
}

export async function setUnpackingChoice(
  sessionId: string,
  choice: UnpackingChoice,
): Promise<Unpacking> {
  const res = await api.patch<Unpacking>(
    `/sessions/${sessionId}/unpacking/choice`,
    { choice },
  );
  return res.data;
}

export async function unlockUnpacking(sessionId: string): Promise<Unpacking> {
  const res = await api.post<Unpacking>(`/sessions/${sessionId}/unpacking/unlock`);
  return res.data;
}

export async function submitFeedback(
  sessionId: string,
  data: SubmitFeedbackRequest,
): Promise<Unpacking> {
  const res = await api.post<Unpacking>(
    `/sessions/${sessionId}/unpacking/feedback`,
    data,
  );
  return res.data;
}
