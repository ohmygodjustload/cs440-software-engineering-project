/**
 * health.service.ts — talks to the C# backend's liveness endpoint.
 *
 * Purpose: the single place in the front end that knows the health URL. It is the pattern to copy
 * when adding services for appointments, users, statistics, and so on.
 *
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { HealthStatus } from '../models/health-status';

/**
 * Path of the liveness endpoint. It is relative on purpose: `ng serve` proxies `/api` to the
 * backend (see proxy.conf.json) and in production the Angular build is served from the same
 * origin as the API, so no environment-specific URL is needed.
 */
const HEALTH_ENDPOINT = '/api/health';

/** Reads the backend's liveness endpoint. */
@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private readonly http = inject(HttpClient);

  /** Returns the current backend status, or errors when the API cannot be reached. */
  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(HEALTH_ENDPOINT);
  }
}
