import { User } from './user';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterUserRequest {
  firstName: string;
  lastName: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  password: string;
}

export type ServiceType = 'Medical' | 'Beauty' | 'Fitness';

export interface ServiceCredentialRequest {
  info?: string | null;
}

export interface RegisterProviderRequest extends RegisterUserRequest {
  serviceTypes: ServiceType[];
  medicalCredentials?: ServiceCredentialRequest | null;
  beautyCredentials?: ServiceCredentialRequest | null;
  fitnessCredentials?: ServiceCredentialRequest | null;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface RegisterResponse {
  token?: string | null;
  expiresAt?: string | null;
  user: User;
  requiresApproval: boolean;
}
