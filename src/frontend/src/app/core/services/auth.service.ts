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

const AUTH_ENDPOINT = '/api/auth';
const TOKEN_KEY = 'baaam.auth.token';
const EXPIRES_AT_KEY = 'baaam.auth.expiresAt';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  login(request: LoginRequest, remember: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${AUTH_ENDPOINT}/login`, request).pipe(
      tap((response) => this.saveToken(response.token, response.expiresAt, remember))
    );
  }

  registerUser(request: RegisterUserRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${AUTH_ENDPOINT}/register`, request).pipe(
      tap((response) => {
        if (response.token && response.expiresAt) {
          this.saveToken(response.token, response.expiresAt, false);
        }
      })
    );
  }

  registerProvider(request: RegisterProviderRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${AUTH_ENDPOINT}/register/provider`, request);
  }

  getToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.getStoredToken();
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
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
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

  private saveToken(token: string, expiresAt: string, remember: boolean): void {
    this.clearToken();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(EXPIRES_AT_KEY, expiresAt);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  private getStoredExpiration(): string | null {
    return localStorage.getItem(EXPIRES_AT_KEY) ?? sessionStorage.getItem(EXPIRES_AT_KEY);
  }
}
