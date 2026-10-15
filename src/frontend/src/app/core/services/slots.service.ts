import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, throwError} from 'rxjs';

import {AuthService} from './auth.service';

import {AppointmentCategory} from '../models/appointment';
import {AvailableSlotFilters, BookedAppointment, BookSlotDto, CreateSlotDto, Slot, UpdateSlotDto} from '../models/slot';

const SLOTS_ENDPOINT = '/api/slots';
const APPOINTMENTS_ENDPOINT = '/api/appointments';

export interface BookingProvider {
  id: string;
  name: string;
  specialty?: string | null;
}

/** Body the create-slots page still sends. It is not the /api/slots contract. */
export interface CreateSlotDraft {
  title: string;
  category: AppointmentCategory;
  providerId: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  notes: string;
}

@Injectable({providedIn: 'root'})
export class SlotsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  providers(): Observable<BookingProvider[]> {
    return this.http.get<BookingProvider[]>('/api/providers');
  }

  create(dto: CreateSlotDto): Observable<Slot> {
    return this.http.post<Slot>(SLOTS_ENDPOINT, dto);
  }

  getMine(): Observable<Slot[]> {
    return this.http.get<Slot[]>(`${SLOTS_ENDPOINT}/mine`);
  }

  /** Open slots any visitor can book. The endpoint is anonymous, so it works signed in or out. */
  getAvailable(filters: AvailableSlotFilters = {}): Observable<Slot[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<Slot[]>(SLOTS_ENDPOINT, {params});
  }

  update(id: string, dto: UpdateSlotDto): Observable<Slot> {
    return this.http.put<Slot>(`${SLOTS_ENDPOINT}/${encodeURIComponent(id)}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${SLOTS_ENDPOINT}/${encodeURIComponent(id)}`);
  }

  /** Books an open slot for the signed-in client. The API takes the client from the JWT, never the body. */
  book(id: string, notes?: string): Observable<BookedAppointment> {
    const body: BookSlotDto = notes?.trim() ? {notes: notes.trim()} : {};
    return this.http.post<BookedAppointment>(`${SLOTS_ENDPOINT}/${encodeURIComponent(id)}/book`, body);
  }

  /** The signed-in client's Booked appointments, soonest first. */
  getMyBookings(): Observable<BookedAppointment[]> {
    return this.http.get<BookedAppointment[]>(`${APPOINTMENTS_ENDPOINT}/mine`);
  }

  // The server derives provider ownership and a 60-minute end time from the authenticated account.
  publish(draft: CreateSlotDraft): Observable<Slot> {
    if (!this.auth.getToken()) {
      return throwError(() => new Error('Please sign in before publishing a slot.'));
    }
    return this.http.post<Slot>(`${SLOTS_ENDPOINT}/publish`, {
      title: draft.title,
      category: draft.category,
      startDateTime: draft.startDateTime,
      location: draft.location,
      notes: draft.notes
    });
  }

  publishBatch(drafts: CreateSlotDraft[]): Observable<Slot[]> {
    if (!this.auth.getToken()) {
      return throwError(() => new Error('Please sign in before publishing slots.'));
    }
    return this.http.post<Slot[]>(`${SLOTS_ENDPOINT}/publish/batch`, {
      slots: drafts.map(draft => ({
        title: draft.title,
        category: draft.category,
        startDateTime: draft.startDateTime,
        location: draft.location,
        notes: draft.notes
      }))
    });
  }

}
