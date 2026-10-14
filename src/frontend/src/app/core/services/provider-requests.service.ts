/**
 * provider-requests.service.ts — talks to the C# backend's provider approval API.
 *
 * Purpose: the single place in the front end that knows the provider-request URLs.
 * Admins use it to list the open/closed logs and approve or reject applications
 * with an optional note (BAAAM-138 / BAAAM-139).
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ProviderRequest,
  ProviderRequestDecision,
  ProviderRequestLog
} from '../models/provider-request';

const PROVIDER_REQUESTS_ENDPOINT = '/api/provider-requests';

/** Reads the provider approval API. */
@Injectable({
  providedIn: 'root'
})
export class ProviderRequestsService {
  private readonly http = inject(HttpClient);

  /** Returns one of the two admin logs: open (pending) or closed (reviewed). */
  list(log: ProviderRequestLog = 'pending'): Observable<ProviderRequest[]> {
    return this.http.get<ProviderRequest[]>(PROVIDER_REQUESTS_ENDPOINT, {
      params: { status: log }
    });
  }

  /** Returns a single request, or 404s when the id is unknown. */
  getById(id: string): Observable<ProviderRequest> {
    return this.http.get<ProviderRequest>(`${PROVIDER_REQUESTS_ENDPOINT}/${encodeURIComponent(id)}`);
  }

  /** Approves a request, optionally with a note. Activates the provider account. */
  approve(id: string, notes?: string): Observable<ProviderRequest> {
    return this.decide(id, 'approve', notes);
  }

  /** Rejects a request, optionally with a reason. The account stays inactive. */
  reject(id: string, notes?: string): Observable<ProviderRequest> {
    return this.decide(id, 'reject', notes);
  }

  private decide(id: string, action: 'approve' | 'reject', notes?: string): Observable<ProviderRequest> {
    const body: ProviderRequestDecision = { notes: notes?.trim() ? notes.trim() : null };
    return this.http.post<ProviderRequest>(
      `${PROVIDER_REQUESTS_ENDPOINT}/${encodeURIComponent(id)}/${action}`,
      body
    );
  }
}
