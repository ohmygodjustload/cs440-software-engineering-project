import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { Appointment } from '../models/appointment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProviderHomeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  bookings(): Observable<Appointment[]> {
    const token = this.auth.getToken();
    if (!token) return throwError(() => new Error('Please sign in to view your appointments.'));

    // Ownership is resolved and enforced by the server from the JWT.
    return this.http.get<Appointment[]>('/api/provider-dashboard/appointments', {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}
