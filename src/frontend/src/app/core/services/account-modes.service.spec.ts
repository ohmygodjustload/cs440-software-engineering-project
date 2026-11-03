import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AccountModesService } from './account-modes.service';

describe('AccountModesService', () => {
  let service: AccountModesService;
  let http: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['updateSession']);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: auth }] });
    http = TestBed.inject(HttpTestingController); service = TestBed.inject(AccountModesService);
  });
  afterEach(() => http.verify());
  it('loads only the authenticated account status without a caller-supplied ID', () => {
    service.status().subscribe();
    const request = http.expectOne('/api/account/modes');
    expect(request.request.method).toBe('GET'); request.flush({ user: {}, application: null });
  });
  it('updates the session only after the server enables client booking', () => {
    service.enableClient().subscribe();
    const request = http.expectOne('/api/account/modes/enable-client');
    expect(auth.updateSession).not.toHaveBeenCalled();
    const response = { token: 'new-token', expiresAt: '2099-01-01T00:00:00Z', user: {} };
    request.flush(response); expect(auth.updateSession).toHaveBeenCalledWith(response as never);
  });
  it('submits qualifications without granting a role in browser state', () => {
    service.apply({ serviceTypes: ['Medical'], medicalCredentials: { info: 'Qualification' }, beautyCredentials: null, fitnessCredentials: null }).subscribe();
    const request = http.expectOne('/api/account/modes/provider-application');
    expect(request.request.body.serviceTypes).toEqual(['Medical']);
    expect(request.request.body.userId).toBeUndefined();
    request.flush({ id: 'request-1' }); expect(auth.updateSession).not.toHaveBeenCalled();
  });
});
