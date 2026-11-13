import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Appointment } from '../models/appointment';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AppointmentsOverviewService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  /** The signed-in client's Booked appointments, soonest first. The API knows the client from the JWT. */
  loadAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>('/api/appointments/mine');
  }

  /** Client updates only the notes on their own booking. */
  updateNotes(id: string, notes: string): Observable<Appointment> {
    return this.http
      .patch<Appointment>(`/api/appointments/${encodeURIComponent(id)}/notes`, { notes })
      .pipe(tap((updated) => this.toast.showAppointmentModified(updated.title, updated.startDateTime)));
  }

  /** Client cancels their booking; the slot returns to Available. */
  cancelBooking(id: string, title?: string | null): Observable<Appointment> {
    return this.http
      .post<Appointment>(`/api/appointments/${encodeURIComponent(id)}/cancel`, {})
      .pipe(tap(() => this.toast.showAppointmentCancelled(title ?? 'Appointment')));
  }
}
