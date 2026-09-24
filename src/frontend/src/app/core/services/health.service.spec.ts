/**
 * health.service.spec.ts — unit tests for HealthService.
 *
 * Purpose: proves the service issues `GET /api/health`, hands the parsed body to subscribers, and
 * reports a failure when the API cannot be reached. None of this needs a running backend.
 *
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HealthStatus } from '../models/health-status';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const healthyResponse: HealthStatus = {
    status: 'ok',
    service: 'AppointmentScheduler.Api',
    timestamp: '2025-01-01T12:00:00+00:00'
  };

  let service: HealthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(HealthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/health and emit the status the backend returned', () => {
    let actual: HealthStatus | undefined;

    service.getHealth().subscribe((status) => (actual = status));

    const request = httpTesting.expectOne('/api/health');
    expect(request.request.method).toBe('GET');
    request.flush(healthyResponse);

    expect(actual).toEqual(healthyResponse);
  });

  it('should surface an error when the backend cannot be reached', () => {
    let failed = false;

    service.getHealth().subscribe({ error: () => (failed = true) });
    httpTesting.expectOne('/api/health').error(new ProgressEvent('error'));

    expect(failed).toBeTrue();
  });
});
