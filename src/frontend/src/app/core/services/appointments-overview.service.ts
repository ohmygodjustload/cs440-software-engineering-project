import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Appointment, UpdateAppointmentDto } from '../models/appointment';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AppointmentsOverviewService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  /** The signed-in client's Booked appointments, soonest first. The API knows the client from the JWT. */
  loadAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>('/api/appointments/mine');
  }

  /** Updates one appointment (reschedule/modify) and pops a confirmation. */
  updateAppointment(id: string, dto: UpdateAppointmentDto): Observable<Appointment> {
    return this.http.put<Appointment>(`/api/appointments/${encodeURIComponent(id)}`, dto).pipe(
      tap((updated) => this.toast.showAppointmentModified(updated.title, updated.startDateTime))
    );
  }

  /** Cancels one appointment (status -> Canceled) and pops a confirmation. */
  cancelAppointment(id: string, title?: string | null): Observable<void> {
    return this.http.delete<void>(`/api/appointments/${encodeURIComponent(id)}`).pipe(
      tap(() => this.toast.showAppointmentCancelled(title ?? 'Appointment'))
    );
  }
}
