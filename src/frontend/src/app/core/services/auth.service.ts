import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  AuthResponse,
  LoginRequest,
  RegisterProviderRequest,
  RegisterResponse,
  RegisterUserRequest
} from '../models/auth';
import { User } from '../models/user';

const AUTH_ENDPOINT = '/api/auth';
const TOKEN_KEY = 'baaam.auth.token';
const EXPIRES_AT_KEY = 'baaam.auth.expiresAt';
const USER_KEY = 'baaam.auth.user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  login(request: LoginRequest, remember: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${AUTH_ENDPOINT}/login`, request).pipe(
      tap((response) => this.saveAuth(response.token, response.expiresAt, response.user, remember))
    );
  }

  registerUser(request: RegisterUserRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${AUTH_ENDPOINT}/register`, request);
  }

  registerProvider(request: RegisterProviderRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${AUTH_ENDPOINT}/register/provider`, request);
  }

  /**
   * Re-submits a rejected provider application. The provider authenticates with their existing
   * (still inactive) username and password and may update their profile; the backend files a fresh
   * open request against the same account so no duplicate inactive user is created.
   */
  resubmitProvider(request: RegisterProviderRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${AUTH_ENDPOINT}/resubmit/provider`, request);
  }

  getToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.getStoredToken();
  }

  getCurrentUser(): User | null {
    if (!this.isAuthenticated()) {
      return null;
    }

    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      this.clearToken();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const expiresAt = this.getStoredExpiration();
    if (!token || !expiresAt) {
      this.clearToken();
      return false;
    }

    const expiresAtMs = Date.parse(expiresAt);
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      this.clearToken();
      return false;
    }

    return true;
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }
      if (error.error?.title) {
        return error.error.title;
      }
      if (error.status === 0) {
        return 'Could not reach the backend. Make sure the API is running.';
      }
    }

    return 'Something went wrong. Please try again.';
  }

  private saveAuth(token: string, expiresAt: string, user: User, remember: boolean): void {
    this.clearToken();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(EXPIRES_AT_KEY, expiresAt);
    storage.setItem(USER_KEY, JSON.stringify(user));
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  private getStoredExpiration(): string | null {
    return localStorage.getItem(EXPIRES_AT_KEY) ?? sessionStorage.getItem(EXPIRES_AT_KEY);
  }
}
