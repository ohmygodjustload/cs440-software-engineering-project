import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AppointmentCategory } from '../models/appointment';
import { AuthResponse } from '../models/auth';
import { User } from '../models/user';
import { AuthService } from './auth.service';

export interface AccountModeStatus {
  user: User;
  application: { id: string; status: 'pending' | 'approved' | 'rejected'; notes: string; submittedAt: string } | null;
}
export interface ProviderApplication {
  serviceTypes: AppointmentCategory[];
  medicalCredentials: { info: string } | null;
  beautyCredentials: { info: string } | null;
  fitnessCredentials: { info: string } | null;
}

@Injectable({ providedIn: 'root' })
export class AccountModesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly endpoint = '/api/account/modes';

  status(): Observable<AccountModeStatus> { return this.http.get<AccountModeStatus>(this.endpoint); }
  apply(application: ProviderApplication): Observable<unknown> {
    return this.http.post(`${this.endpoint}/provider-application`, application);
  }
  enableClient(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.endpoint}/enable-client`, {})
      .pipe(tap(response => this.auth.updateSession(response)));
  }
  refreshSession(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.endpoint}/refresh-session`, {})
      .pipe(tap(response => this.auth.updateSession(response)));
  }
}
