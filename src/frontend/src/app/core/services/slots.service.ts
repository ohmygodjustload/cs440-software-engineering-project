import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { AppointmentCategory } from '../models/appointment';
import { CreateSlotDto, Slot, UpdateSlotDto } from '../models/slot';

const SLOTS_ENDPOINT = '/api/slots';

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

@Injectable({ providedIn: 'root' })
export class SlotsService {
  private readonly http = inject(HttpClient);

  providers(): Observable<BookingProvider[]> {
    return this.http.get<BookingProvider[]>('/api/providers');
  }

  create(dto: CreateSlotDto): Observable<Slot> {
    return this.http.post<Slot>(SLOTS_ENDPOINT, dto);
  }

  getMine(): Observable<Slot[]> {
    return this.http.get<Slot[]>(`${SLOTS_ENDPOINT}/mine`);
  }

  update(id: string, dto: UpdateSlotDto): Observable<Slot> {
    return this.http.put<Slot>(`${SLOTS_ENDPOINT}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${SLOTS_ENDPOINT}/${id}`);
  }

  // The create-slots form does not send appointmentTypeId, so it cannot call POST /api/slots yet.
  publish(draft: CreateSlotDraft): Observable<never> {
    void draft;
    return throwError(() => new Error('Slot publishing is not implemented by the API.'));
  }
}
