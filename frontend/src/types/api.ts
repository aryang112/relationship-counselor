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

export interface ValidateInviteResponse {
  valid: boolean;
  inviterName: string;
  coupleId: string;
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

// ── Partner B Context ──────────────────────────────────────────────

export interface PartnerBContext {
  topicTag: string;
  initiatorName: string;
  openingMessage: string;
  contextForAI: {
    issues: string[];
    needs: string[];
    emotions: string[];
  };
  hasDraft: boolean;
}

// ── Consent ────────────────────────────────────────────────────────

export interface RecordConsentRequest {
  tosVersion: string;
  privacyVersion: string;
  appVersion?: string;
  platform?: 'ios' | 'android';
}

export interface ConsentStatusResponse {
  hasConsented: boolean;
  tosVersionAgreed: string | null;
  privacyVersionAgreed: string | null;
  consentAgreedAt: string | null;
  needsReconsent: boolean;
}

export interface RecordConsentResponse {
  message: string;
  consentAgreedAt: string;
}
