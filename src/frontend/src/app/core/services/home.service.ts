import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Appointment } from '../models/appointment';

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);

  /** The signed-in client's Booked appointments, soonest first. The API knows the client from the JWT. */
  loadAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>('/api/appointments/mine');
  }
}
