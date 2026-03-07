export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface InviteResponse {
  message: string;
  couple: import('./session').Couple;
  inviteToken: string;
}

export interface AcceptInviteRequest {
  inviteToken: string;
}

export interface SignAgreementRequest {
  confirm: boolean;
}

export interface SessionStatusResponse {
  status: import('./session').SessionStatus;
}

export interface TranscriptionResponse {
  transcription: string;
}

export interface RemindPartnerResponse {
  message: string;
}
