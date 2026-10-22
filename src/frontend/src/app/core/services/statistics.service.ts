import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, expand, map, reduce, EMPTY, throwError } from 'rxjs';

import { AuthService } from './auth.service';

import { Appointment, PagedResult } from '../models/appointment';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly http = inject(HttpClient);

  private readonly auth = inject(AuthService);

  loadAppointments(): Observable<Appointment[]> {
    const user = this.auth.getCurrentUser();
    if (!user) return throwError(() => new Error('Please sign in to view statistics.'));
    if (!user.isClient || user.isAdmin || user.isServiceProvider) {
      return throwError(() => new Error('Client statistics require a client account.'));
    }

    return this.loadPage(1).pipe(
      // Read every page so dashboard counts are not limited to the first 100.
      expand((page) => {
        const hasMore = page.items.length > 0 &&
          page.page * page.pageSize < page.total;

        return hasMore ? this.loadPage(page.page + 1) : EMPTY;
      }),
      map((page) => page.items),
      reduce((all, items) => all.concat(items), [] as Appointment[]),
      map((items) => items.filter((item) => item.userId === user.id))
    );
  }

  private loadPage(page: number): Observable<PagedResult<Appointment>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', 100);

    return this.http.get<PagedResult<Appointment>>('/api/appointments', { params });
  }
}
