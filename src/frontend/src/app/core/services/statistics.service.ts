import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { Appointment } from '../models/appointment';

export type StatisticsRole = 'client' | 'provider';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  availableRoles(): StatisticsRole[] {
    const user = this.auth.getCurrentUser();

    if (!user || user.isAdmin || user.isActive === false) return [];

    const roles: StatisticsRole[] = [];

    if (user.isServiceProvider) roles.push('provider');
    if (user.isClient) roles.push('client');

    return roles;
  }

  loadAppointments(
    role: StatisticsRole = this.availableRoles()[0] ?? 'client'
  ): Observable<Appointment[]> {
    const token = this.auth.getToken();

    if (!this.auth.getCurrentUser() || !token) {
      return throwError(() =>
        new Error('Please sign in to view statistics.')
      );
    }

    if (!this.availableRoles().includes(role)) {
      return throwError(() =>
        new Error('This statistics view is not available for your account.')
      );
    }

    const params = new HttpParams().set('role', role);

    return this.http.get<Appointment[]>('/api/statistics/appointments', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}