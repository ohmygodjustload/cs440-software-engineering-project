import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { EnhancedHomeService } from './enhanced-home.service';

describe('EnhancedHomeService', () => {
  let http: HttpTestingController;
  let service: EnhancedHomeService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: () => 'test-jwt' } }] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(EnhancedHomeService);
  });
  afterEach(() => http.verify());
  it('uses the existing authenticated client endpoint without a caller-supplied identity', () => {
    service.clientAppointments().subscribe();
    const request = http.expectOne('/api/appointments/mine');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([]);
  });
  it('uses the existing provider dashboard and JWT', () => {
    service.providerAppointments().subscribe();
    const request = http.expectOne('/api/provider-dashboard/appointments');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-jwt');
    request.flush([]);
  });
});
