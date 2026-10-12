import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, expand, map, reduce, EMPTY } from 'rxjs';

import { Appointment, PagedResult } from '../models/appointment';

@Injectable({ providedIn: 'root' })
export class AppointmentsOverviewService {
  private readonly http = inject(HttpClient);

  // Booking currently uses this demo owner. This is not authentication.
  readonly userId = 'demo-user';

  loadAppointments(): Observable<Appointment[]> {
    return this.loadPage(1).pipe(
      // Read every page so dashboard counts are not limited to the first 100.
      expand((page) => {
        const hasMore = page.items.length > 0 &&
          page.page * page.pageSize < page.total;

        return hasMore ? this.loadPage(page.page + 1) : EMPTY;
      }),
      map((page) => page.items),
      reduce((all, items) => all.concat(items), [] as Appointment[]),
      map((items) => items.filter((item) => item.userId === this.userId))
    );
  }

  private loadPage(page: number): Observable<PagedResult<Appointment>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', 100);

    return this.http.get<PagedResult<Appointment>>('/api/appointments', { params });
  }
}
