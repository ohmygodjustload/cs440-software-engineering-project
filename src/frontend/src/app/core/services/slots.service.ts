import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AppointmentCategory } from '../models/appointment';

export interface BookingProvider {
  id: string;
  name: string;
  specialty?: string | null;
}

export interface CreateSlotDraft {
  title: string;
  category: AppointmentCategory;
  providerId: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  notes: string;
}

@Injectable({ providedIn: 'root' })
export class SlotsService {
  private readonly http = inject(HttpClient);

  providers(): Observable<BookingProvider[]> {
    return this.http.get<BookingProvider[]>('/api/providers');
  }

  // Connect to a slot endpoint when its backend contract exists.
  // /api/appointments creates booked appointments, not available slots.
  publish(draft: CreateSlotDraft): Observable<never> {
    void draft;
    return throwError(() => new Error('Slot publishing is not implemented by the API.'));
  }
}
