import { api } from './api';
import type {
  Interview,
  SubmitInterviewRequest,
  SaveDraftRequest,
} from '../types/session';
import type { TranscriptionResponse } from '../types/api';

export async function getInterview(sessionId: string): Promise<Interview> {
  const res = await api.get<Interview>(`/sessions/${sessionId}/interview`);
  return res.data;
}

export async function submitInterview(
  sessionId: string,
  data: SubmitInterviewRequest,
): Promise<Interview & { crisisDetected?: boolean }> {
  const res = await api.post<Interview & { crisisDetected?: boolean }>(`/sessions/${sessionId}/interview`, data);
  return res.data;
}

export async function saveDraft(
  sessionId: string,
  data: SaveDraftRequest,
): Promise<Interview> {
  const res = await api.patch<Interview>(
    `/sessions/${sessionId}/interview/draft`,
    data,
  );
  return res.data;
}

export async function getNextQuestion(
  sessionId: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const res = await api.post<{ question: string }>(
    `/sessions/${sessionId}/interview/next-question`,
    { conversationHistory },
    { timeout: 30000 },
  );
  return res.data.question;
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  const formData = new FormData();
  const filename = audioUri.split('/').pop() || 'recording.m4a';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `audio/${match[1]}` : 'audio/m4a';

  formData.append('audio', {
    uri: audioUri,
    name: filename,
    type,
  } as unknown as Blob);

  const res = await api.post<TranscriptionResponse>('/api/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return res.data.transcription;
}
