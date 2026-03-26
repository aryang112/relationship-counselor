export interface User {
  id: string;
  email: string;
  name: string;
  gender?: string;
  timezone?: string;
  tosVersionAgreed?: string | null;
  privacyVersionAgreed?: string | null;
  consentAgreedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  gender?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserSummary;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  timezone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
