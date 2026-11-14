import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AppointmentAuditService } from './appointment-audit.service';

describe('AppointmentAuditService', () => {
  let service: AppointmentAuditService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AppointmentAuditService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('GETs /api/admin/appointment-audit with filters', () => {
    let actual: unknown;
    service.list({ action: 'CANCELLED', from: '2026-01-01T00:00:00Z' }).subscribe((items) => (actual = items));

    const request = httpTesting.expectOne((r) => r.url === '/api/admin/appointment-audit');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('action')).toBe('CANCELLED');
    expect(request.request.params.get('from')).toBe('2026-01-01T00:00:00Z');
    request.flush([]);

    expect(actual).toEqual([]);
  });
});
