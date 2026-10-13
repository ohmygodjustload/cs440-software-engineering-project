import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let http: HttpTestingController;
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should login and remember the token in local storage', () => {
    service.login({ username: 'JanePorter123', password: 'password123' }, true).subscribe();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    request.flush({
      token: 'jwt-token',
      expiresAt: '2099-01-01T00:00:00Z',
      user: userResponse('JanePorter123')
    });

    expect(localStorage.getItem('baaam.auth.token')).toBe('jwt-token');
    expect(service.getCurrentUser()?.username).toBe('JanePorter123');
  });

  it('should register users through the auth endpoint without storing a token', () => {
    service
      .registerUser({
        firstName: 'Jane',
        lastName: 'Porter',
        username: 'JanePorter123',
        email: null,
        phone: null,
        password: 'password123'
      })
      .subscribe();

    const request = http.expectOne('/api/auth/register');
    expect(request.request.method).toBe('POST');
    request.flush({
      token: 'jwt-token',
      expiresAt: '2099-01-01T00:00:00Z',
      user: userResponse('JanePorter123'),
      requiresApproval: false
    });

    expect(service.getToken()).toBeNull();
  });

  it('should register providers through the provider endpoint without storing a token', () => {
    service
      .registerProvider({
        firstName: 'Sam',
        lastName: 'Provider',
        username: 'SamProvider',
        email: 'sam@example.com',
        phone: '555-123-4567',
        password: 'password123',
        serviceTypes: ['Medical']
      })
      .subscribe();

    const request = http.expectOne('/api/auth/register/provider');
    expect(request.request.method).toBe('POST');
    request.flush({
      user: userResponse('SamProvider'),
      requiresApproval: true
    });

    expect(service.getToken()).toBeNull();
  });

  it('should clear the stored user on sign out', () => {
    service.login({ username: 'JanePorter123', password: 'password123' }, false).subscribe();
    http.expectOne('/api/auth/login').flush({
      token: 'jwt-token',
      expiresAt: '2099-01-01T00:00:00Z',
      user: userResponse('JanePorter123')
    });

    service.clearToken();

    expect(service.getCurrentUser()).toBeNull();
  });

  it('should clear expired tokens', () => {
    localStorage.setItem('baaam.auth.token', 'expired-token');
    localStorage.setItem('baaam.auth.expiresAt', '2000-01-01T00:00:00Z');

    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('baaam.auth.token')).toBeNull();
  });

  function userResponse(username: string) {
    return {
      id: 'user-id',
      firstName: 'Test',
      lastName: 'User',
      username,
      isClient: true,
      isServiceProvider: false,
      isAdmin: false,
      isActive: true
    };
  }
});
