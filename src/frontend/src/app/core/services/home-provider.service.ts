import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

import { Appointment, PagedResult } from '../models/appointment';

export interface ServiceProvider {
  id: string;
  name: string;
  specialty?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProviderHomeService {
  private readonly http = inject(HttpClient);

  providers(): Observable<ServiceProvider[]> {
    return this.http.get<ServiceProvider[]>('/api/providers');
  }

  bookings(providerId: string): Observable<Appointment[]> {
    return this.page(providerId, 1).pipe(
      expand((page) => {
        const hasMore = page.items.length > 0 &&
          page.page * page.pageSize < page.total;

        return hasMore ? this.page(providerId, page.page + 1) : EMPTY;
      }),
      map((page) => page.items),
      reduce((all, items) => all.concat(items), [] as Appointment[])
    );
  }

  private page(providerId: string, page: number): Observable<PagedResult<Appointment>> {
    const params = new HttpParams()
      .set('providerId', providerId)
      .set('page', page)
      .set('pageSize', 100);

    return this.http.get<PagedResult<Appointment>>('/api/appointments', { params });
  }
}
