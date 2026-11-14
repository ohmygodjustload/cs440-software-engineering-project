import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, expand, map, reduce, EMPTY, throwError } from 'rxjs';

import { ProviderHomeService } from './home-provider.service';
import { AuthService } from './auth.service';

import { Appointment, PagedResult } from '../models/appointment';

export type StatisticsRole = 'client' | 'provider';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly http = inject(HttpClient);

  private readonly auth = inject(AuthService);

  private readonly providerHome = inject(ProviderHomeService);

  availableRoles() : StatisticsRole[] {
    const user = this.auth.getCurrentUser();
    if (!user || user.isAdmin || user.isActive === false) return [];
    const roles: StatisticsRole[] = [];
    if (user.isServiceProvider) roles.push('provider');
    if (user.isClient) roles.push('client');
    return roles;
  }

  loadAppointments(role: StatisticsRole = this.availableRoles()[0] ?? 'client'): Observable<Appointment[]> {
    const user = this.auth.getCurrentUser();
    if (!user) return throwError(() => new Error('Please sign in to view statistics.'));
    if (!this.availableRoles().includes(role)) {
      return throwError(() => new Error('This statistics view is not available for your account.'));
    }
    if (role === 'provider'){
      // This existing endpoint resolves provider ownership from the JWT, inclding linked provider records.
      return this.providerHome.bookings().pipe(
        map(items => items.filter(item => !!item.userId && item.status !== 'Available'))
      );
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
