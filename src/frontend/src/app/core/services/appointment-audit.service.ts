import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AppointmentAuditFilters, AppointmentAuditListItem } from '../models/appointment-audit';

@Injectable({ providedIn: 'root' })
export class AppointmentAuditService {
  private readonly http = inject(HttpClient);

  list(filters: AppointmentAuditFilters = {}): Observable<AppointmentAuditListItem[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<AppointmentAuditListItem[]>('/api/admin/appointment-audit', { params });
  }
}
