import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Appointment, CreateAppointmentDto } from '../models/appointment';

export interface BookingProvider {
  id: string;
  name: string;
  specialty?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);

  providers(): Observable<BookingProvider[]> {
    return this.http.get<BookingProvider[]>('/api/providers');
  }

  create(body: CreateAppointmentDto): Observable<Appointment> {
    return this.http.post<Appointment>('/api/appointments', body);
  }
}
