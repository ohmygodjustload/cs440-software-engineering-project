import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';

import {AuthService} from '../services/auth.service';
import {authInterceptor} from './auth.interceptor';

describe('authInterceptor', () => {
  let token: string | null;
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    token = null;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {provide: AuthService, useValue: {getToken: () => token}}
      ]
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends the stored JWT as a Bearer token to the API', () => {
    token = 'abc.def.ghi';
    http.get('/api/appointments/mine').subscribe();

    const request = httpTesting.expectOne('/api/appointments/mine');
    expect(request.request.headers.get('Authorization')).toBe('Bearer abc.def.ghi');
    request.flush([]);
  });

  it('sends no Authorization header when signed out', () => {
    http.get('/api/slots').subscribe();

    const request = httpTesting.expectOne('/api/slots');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush([]);
  });

  it('never sends the token to another origin', () => {
    token = 'abc.def.ghi';
    http.get('https://example.com/api/thing').subscribe();

    const request = httpTesting.expectOne('https://example.com/api/thing');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('keeps an Authorization header the caller already set', () => {
    token = 'stored';
    http.get('/api/providers/dashboard', {headers: {Authorization: 'Bearer explicit'}}).subscribe();

    const request = httpTesting.expectOne('/api/providers/dashboard');
    expect(request.request.headers.get('Authorization')).toBe('Bearer explicit');
    request.flush({});
  });
});
