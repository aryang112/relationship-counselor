export interface User {
  id: string;
  email: string;
  name: string;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserSummary;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  timezone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
